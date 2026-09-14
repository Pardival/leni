"use client";

import { CategoryBadge } from "./CategoryBadge";

/** Alias sémantique : même rendu que le badge, utilisable depuis un composant serveur. */
export function CategoryLabel({ slug }: { slug: string }) {
  return <CategoryBadge slug={slug} />;
}
