import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Catégories : table dynamique. Les catégories "système" ci-dessous sont
 * créées au démarrage ; le LLM peut en proposer de nouvelles, qui passent par
 * un dédoublonnage avant création (voir `lib/categories.ts`).
 */
export const categories = sqliteTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull(),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export type CategoryRow = typeof categories.$inferSelect;

export const SYSTEM_CATEGORIES: Omit<CategoryRow, "createdAt">[] = [
  { slug: "health", name: "Santé", description: "Corps, sommeil, sport, alimentation, médecins.", color: "#16a34a", isSystem: true },
  { slug: "work", name: "Travail", description: "Emploi, carrière, missions, collègues.", color: "#2563eb", isSystem: true },
  { slug: "projects", name: "Projets", description: "Projets personnels en cours : roman, app, création…", color: "#7c3aed", isSystem: true },
  { slug: "relationships", name: "Relations", description: "Famille, amis, amour, vie sociale.", color: "#db2777", isSystem: true },
  { slug: "home", name: "Quotidien", description: "Maison, courses, administratif, organisation pratique.", color: "#ea580c", isSystem: true },
  { slug: "money", name: "Finances", description: "Argent, budget, achats importants.", color: "#ca8a04", isSystem: true },
  { slug: "self", name: "Développement perso", description: "Réflexions sur soi, habitudes, discipline, humeur.", color: "#0f766e", isSystem: true },
  { slug: "culture", name: "Culture & loisirs", description: "Livres, films, musique, sorties, voyages.", color: "#4f46e5", isSystem: true },
  { slug: "other", name: "Autre", description: "Ne correspond à aucun autre thème.", color: "#8a8578", isSystem: true },
];

/**
 * Type de note : l'autre axe, fixe. Une note a un thème (catégorie) ET un type.
 */
export const KINDS = ["idea", "task", "reflection", "journal", "reference", "note"] as const;
export type Kind = (typeof KINDS)[number];

/** Palette attribuée aux catégories créées par le LLM. */
export const CATEGORY_PALETTE = [
  "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#4f46e5", "#9333ea",
  "#be185d", "#0d9488", "#65a30d", "#c2410c", "#1d4ed8", "#7e22ce", "#a16207",
];

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const SOURCES = ["shortcut", "web", "api"] as const;
export type Source = (typeof SOURCES)[number];

export const STATUSES = ["processing", "ready", "error"] as const;
export type Status = (typeof STATUSES)[number];

export type Entities = {
  people: string[];
  places: string[];
  projects: string[];
};

export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),

    /** Texte brut tel que dicté / transcrit / saisi. Jamais modifié. */
    rawText: text("raw_text").notNull(),
    /** Version réécrite par le LLM : synthétique, structurée, fidèle au sens. */
    content: text("content").notNull(),
    title: text("title").notNull().default(""),
    summary: text("summary").notNull().default(""),
    /** Lecture du LLM : de quoi parle la note, ce que la personne veut. */
    analysis: text("analysis"),

    /** Thème : slug d'une ligne de `categories`. */
    category: text("category").notNull().default("other"),
    /** Type de note (idée, tâche, réflexion…). */
    kind: text("kind", { enum: KINDS }).notNull().default("note"),
    /**
     * Thème idéal proposé par le LLM quand aucun thème existant ne le nomme.
     * Quand assez de notes partagent la même proposition, le thème est créé
     * et ces notes y sont rattachées ("thème émergent").
     */
    suggestedTheme: text("suggested_theme"),
    suggestedThemeDescription: text("suggested_theme_description"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    actionItems: text("action_items", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    /** Sous-ensemble de `actionItems` cochées comme faites. */
    doneActionItems: text("done_action_items", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    entities: text("entities", { mode: "json" })
      .$type<Entities>()
      .notNull()
      .default(sql`'{"people":[],"places":[],"projects":[]}'`),
    sentiment: text("sentiment", { enum: SENTIMENTS }).notNull().default("neutral"),
    /** Code ISO 639-1 de la langue détectée (fr, en, …). */
    language: text("language").notNull().default("und"),
    /** Échéance mentionnée dans la note, ISO 8601 (date seule ou date-heure). */
    dueDate: text("due_date"),

    /** Lieu : coordonnées envoyées par le téléphone + nom déduit du texte. */
    latitude: real("latitude"),
    longitude: real("longitude"),
    placeName: text("place_name"),

    source: text("source", { enum: SOURCES }).notNull().default("web"),
    audioPath: text("audio_path"),
    /** Modèle utilisé pour l'enrichissement ("mock" si aucune clé). */
    enrichedBy: text("enriched_by"),
    status: text("status", { enum: STATUSES }).notNull().default("processing"),
    error: text("error"),

    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),

    /** Moment de la capture (peut être fourni par le client), ISO 8601. */
    capturedAt: text("captured_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("notes_captured_at_idx").on(t.capturedAt),
    index("notes_category_idx").on(t.category),
    index("notes_status_idx").on(t.status),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

/** Empreinte de sens d'une note (vecteur JSON ; la similarité est calculée en JS). */
export const embeddings = sqliteTable("embeddings", {
  noteId: text("note_id").primaryKey(),
  model: text("model").notNull(),
  vector: text("vector", { mode: "json" }).$type<number[]>().notNull(),
  /** Hash du texte vectorisé, pour ne recalculer que si la note a changé. */
  contentHash: text("content_hash").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export type EmbeddingRow = typeof embeddings.$inferSelect;

/** Lentilles d'approfondissement d'une réflexion. */
export const LENSES = ["meaning", "perspective", "traps", "next", "question"] as const;
export type Lens = (typeof LENSES)[number];

/** Lecture ajoutée par Leni sous une note, à la demande. */
export const insights = sqliteTable(
  "insights",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id").notNull(),
    lens: text("lens", { enum: LENSES }).notNull(),
    /** Question libre de l'utilisateur quand lens = "question". */
    question: text("question"),
    content: text("content").notNull(),
    model: text("model").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("insights_note_idx").on(t.noteId)],
);
export type Insight = typeof insights.$inferSelect;
