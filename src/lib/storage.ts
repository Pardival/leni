import fs from "node:fs/promises";
import path from "node:path";
import { audioDirPath } from "./config";

/**
 * Stockage des enregistrements audio.
 *  - local : dossier AUDIO_DIR (Mac, serveur classique)
 *  - none  : aucun stockage (hébergement serverless sans disque persistant :
 *            l'audio est transcrit puis oublié, le texte reste)
 * Choisi par AUDIO_STORAGE, sinon "local" si le disque est inscriptible.
 */
export type AudioStorageKind = "local" | "none";

let detected: AudioStorageKind | null = null;

export async function audioStorageKind(): Promise<AudioStorageKind> {
  const forced = process.env.AUDIO_STORAGE?.trim();
  if (forced === "local" || forced === "none") return forced;
  if (detected) return detected;
  try {
    await fs.mkdir(audioDirPath(), { recursive: true });
    await fs.access(audioDirPath(), fs.constants.W_OK);
    detected = "local";
  } catch {
    detected = "none";
  }
  return detected;
}

/** Enregistre le fichier ; retourne son nom, ou null si le stockage est désactivé. */
export async function saveAudio(file: File): Promise<string | null> {
  if ((await audioStorageKind()) === "none") return null;
  const ext = guessExtension(file);
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  await fs.writeFile(path.join(audioDirPath(), name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function readAudio(name: string): Promise<Buffer | null> {
  const safe = path.basename(name);
  if (safe !== name) return null;
  try {
    return await fs.readFile(path.join(audioDirPath(), safe));
  } catch {
    return null;
  }
}

export async function deleteAudio(name: string): Promise<void> {
  const safe = path.basename(name);
  if (safe !== name) return;
  await fs.unlink(path.join(audioDirPath(), safe)).catch(() => undefined);
}

export async function deleteAllAudio(): Promise<number> {
  let n = 0;
  try {
    for (const f of await fs.readdir(audioDirPath())) {
      await fs.unlink(path.join(audioDirPath(), f));
      n++;
    }
  } catch {
    /* dossier absent */
  }
  return n;
}

export function audioMime(name: string): string {
  const MIME: Record<string, string> = {
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
  };
  return MIME[path.extname(name).toLowerCase()] ?? "application/octet-stream";
}

function guessExtension(file: File): string {
  const fromName = path.extname(file.name || "");
  if (fromName) return fromName.toLowerCase();
  const type = file.type.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return ".m4a";
  if (type.includes("webm")) return ".webm";
  if (type.includes("wav")) return ".wav";
  if (type.includes("ogg")) return ".ogg";
  if (type.includes("mpeg") || type.includes("mp3")) return ".mp3";
  return ".bin";
}
