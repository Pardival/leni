import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Catégories reconnues par l'enrichissement. Les libellés traduits vivent
 * dans `src/i18n/messages/*`. Ajouter une catégorie = l'ajouter ici + traduire.
 */
export const CATEGORIES = [
  "idea",
  "task",
  "project",
  "reflection",
  "journal",
  "reference",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

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
    /** Version nettoyée par le LLM (orthographe, ponctuation), fidèle au sens. */
    content: text("content").notNull(),
    title: text("title").notNull().default(""),
    summary: text("summary").notNull().default(""),

    category: text("category", { enum: CATEGORIES }).notNull().default("other"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    actionItems: text("action_items", { mode: "json" })
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
