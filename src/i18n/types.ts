import type fr from "./messages/fr";

/**
 * Le français est la langue de référence : son fichier définit la forme
 * des messages. Chaque autre langue doit fournir exactement les mêmes clés
 * (TypeScript le vérifie à la compilation).
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof fr>;
