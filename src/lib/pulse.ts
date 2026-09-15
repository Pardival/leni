import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * « Pouls » de la base : une empreinte courte qui change dès qu'une note, une
 * source ou un thème est créé, modifié ou supprimé. Le client la compare à
 * intervalle régulier et rafraîchit la page quand elle bouge (voir
 * `components/LiveRefresh`). Une seule requête, sans lire les lignes.
 */
export async function getPulse(): Promise<string> {
  const db = await getDb();
  const [row] = await db.all<{ nc: number; nu: string | null; sc: number; su: string | null; cc: number }>(sql`
    select
      (select count(*) from notes) as nc,
      (select max(updated_at) from notes) as nu,
      (select count(*) from sources) as sc,
      (select max(updated_at) from sources) as su,
      (select count(*) from categories) as cc
  `);
  return [row?.nc ?? 0, row?.nu ?? "", row?.sc ?? 0, row?.su ?? "", row?.cc ?? 0].join("|");
}
