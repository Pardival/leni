import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { CATEGORY_PALETTE, categories, notes, SYSTEM_CATEGORIES, type CategoryRow } from "@/db/schema";

const MAX_CATEGORIES = 40;

/** Crée les catégories système si elles manquent (idempotent, 1 à 2 requêtes). */
export async function seedCategories(db: Awaited<ReturnType<typeof getDb>>) {
  const existing = new Set((await db.select({ slug: categories.slug }).from(categories)).map((r) => r.slug));
  const missing = SYSTEM_CATEGORIES.filter((c) => !existing.has(c.slug));
  if (missing.length === 0) return;
  const now = new Date().toISOString();
  await db.insert(categories).values(missing.map((c) => ({ ...c, createdAt: now }))).onConflictDoNothing();
  invalidateCategoryCache();
}

/* Cache par instance : les thèmes changent rarement et sont lus à chaque rendu. */
let cache: { rows: CategoryRow[]; at: number } | null = null;
const CACHE_TTL_MS = 60_000;
export function invalidateCategoryCache() {
  cache = null;
}

export async function listCategories(): Promise<CategoryRow[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  const db = await getDb();
  const rows = await db.select().from(categories).orderBy(asc(categories.createdAt));
  cache = { rows, at: Date.now() };
  return rows;
}

export async function getCategory(slug: string): Promise<CategoryRow | null> {
  const db = await getDb();
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/** Nombre de notes (non archivées ou non) par catégorie. */
export async function countNotesByCategory(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ category: notes.category, n: sql<number>`count(*)` })
    .from(notes)
    .groupBy(notes.category);
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.n)]));
}

/** "Amour & romantisme" → "amour-romantisme" ; sans accents, ASCII. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Forme canonique pour comparer deux noms ("Romantisme" ≈ "romantisme "). */
export function normalizeName(name: string): string {
  return slugify(name).replace(/-/g, " ");
}

/**
 * Cherche une catégorie existante équivalente à un nom proposé :
 * même slug, même nom normalisé, ou nom contenu l'un dans l'autre
 * ("amour" vs "amour et relations").
 */
export function findSimilarCategory(name: string, existing: CategoryRow[]): CategoryRow | null {
  const target = normalizeName(name);
  if (!target) return null;
  const slug = slugify(name);
  for (const c of existing) {
    const cn = normalizeName(c.name);
    if (c.slug === slug || cn === target) return c;
  }
  for (const c of existing) {
    const cn = normalizeName(c.name);
    if (cn.length >= 4 && target.length >= 4 && (cn.includes(target) || target.includes(cn))) return c;
  }
  return null;
}

export async function createCategory(input: { name: string; description: string }): Promise<CategoryRow> {
  const db = await getDb();
  const existing = await listCategories();
  const similar = findSimilarCategory(input.name, existing);
  if (similar) return similar;
  if (existing.length >= MAX_CATEGORIES) return existing.find((c) => c.slug === "other")!;

  let slug = slugify(input.name) || `cat-${Date.now().toString(36)}`;
  if (existing.some((c) => c.slug === slug)) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  // Couleur la moins utilisée de la palette.
  const used = new Map<string, number>();
  for (const c of existing) used.set(c.color, (used.get(c.color) ?? 0) + 1);
  const color = [...CATEGORY_PALETTE].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0))[0]!;

  const row: CategoryRow = {
    slug,
    name: input.name.trim().slice(0, 40),
    description: input.description.trim().slice(0, 200),
    color,
    isSystem: false,
    createdAt: new Date().toISOString(),
  };
  await db.insert(categories).values(row);
  invalidateCategoryCache();
  return row;
}

export async function updateCategory(
  slug: string,
  patch: Partial<Pick<CategoryRow, "name" | "description" | "color">>,
): Promise<CategoryRow | null> {
  const db = await getDb();
  const clean: typeof patch = {};
  if (patch.name?.trim()) clean.name = patch.name.trim().slice(0, 40);
  if (patch.description != null) clean.description = patch.description.trim().slice(0, 200);
  if (patch.color && /^#[0-9a-f]{6}$/i.test(patch.color)) clean.color = patch.color;
  if (Object.keys(clean).length) await db.update(categories).set(clean).where(eq(categories.slug, slug));
  invalidateCategoryCache();
  return getCategory(slug);
}

/** Déplace toutes les notes de `from` vers `into`, puis supprime `from` (sauf système). */
export async function mergeCategory(from: string, into: string): Promise<boolean> {
  if (from === into) return false;
  const db = await getDb();
  const [src, dst] = await Promise.all([getCategory(from), getCategory(into)]);
  if (!src || !dst) return false;
  await db.update(notes).set({ category: into }).where(eq(notes.category, from));
  if (!src.isSystem) await db.delete(categories).where(eq(categories.slug, from));
  invalidateCategoryCache();
  return true;
}

/** Supprime une catégorie non système ; ses notes passent dans "other". */
export async function deleteCategory(slug: string): Promise<boolean> {
  const cat = await getCategory(slug);
  if (!cat || cat.isSystem) return false;
  return mergeCategory(slug, "other");
}

/** Nombre de notes partageant une même proposition avant création automatique. */
export const THEME_EMERGENCE_THRESHOLD = Number(process.env.THEME_EMERGENCE_THRESHOLD) || 2;

export type SuggestedTheme = { name: string; description: string; count: number };

/** Propositions de thèmes en attente, les plus fréquentes d'abord. */
export async function listSuggestedThemes(): Promise<SuggestedTheme[]> {
  const db = await getDb();
  const rows = await db
    .select({
      name: notes.suggestedTheme,
      description: sql<string>`max(${notes.suggestedThemeDescription})`,
      n: sql<number>`count(*)`,
    })
    .from(notes)
    .where(and(isNotNull(notes.suggestedTheme), eq(notes.archived, false)))
    .groupBy(notes.suggestedTheme)
    .orderBy(sql`count(*) desc`);
  return rows.filter((r) => r.name).map((r) => ({ name: r.name!, description: r.description ?? "", count: Number(r.n) }));
}

/**
 * Transforme une proposition en vrai thème (ou la rattache à un thème existant
 * équivalent) et y déplace toutes les notes qui la portaient.
 */
export async function promoteSuggestedTheme(name: string, description: string, into?: string): Promise<CategoryRow> {
  const db = await getDb();
  const target = into ? await getCategory(into) : null;
  const cat = target ?? (await createCategory({ name, description }));
  await db
    .update(notes)
    .set({ category: cat.slug, suggestedTheme: null, suggestedThemeDescription: null })
    .where(eq(notes.suggestedTheme, name));
  return cat;
}

/** Écarte une proposition : les notes gardent leur thème actuel. */
export async function dismissSuggestedTheme(name: string): Promise<void> {
  const db = await getDb();
  await db
    .update(notes)
    .set({ suggestedTheme: null, suggestedThemeDescription: null })
    .where(eq(notes.suggestedTheme, name));
}
