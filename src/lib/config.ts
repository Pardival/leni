/**
 * Configuration centralisée, lue depuis les variables d'environnement.
 * Tout ce qui est optionnel a un défaut raisonnable pour un usage local.
 */
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY?.trim() || null,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    transcribeModel: process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "whisper-1",
  },
  captureToken: process.env.CAPTURE_TOKEN?.trim() || null,
  userName: process.env.LENI_USER_NAME?.trim() || null,
  appPassword: process.env.APP_PASSWORD?.trim() || null,
  database: {
    url: process.env.DATABASE_URL?.trim() || "file:./data/leni.db",
    authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
  },
  audioDir: process.env.AUDIO_DIR?.trim() || "./data/audio",
} as const;

/**
 * Dossier audio en chemin absolu. Concaténation volontairement sans `path.resolve`
 * (Turbopack le prend pour un accès disque dynamique et trace tout le projet).
 */
export const audioDirPath = () => {
  const dir = config.audioDir.replace(/\/+$/, "");
  return dir.startsWith("/") ? dir : `${process.cwd()}/${dir.replace(/^\.\//, "")}`;
};

/** Vrai quand une clé OpenAI est présente : transcription et enrichissement réels. */
export const hasOpenAI = () => Boolean(config.openai.apiKey);

/** Vrai quand l'interface web est protégée par mot de passe. */
export const isWebProtected = () => Boolean(config.appPassword);
