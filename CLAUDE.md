@AGENTS.md

# Leni — repères pour Claude

- Lire `README.md` pour la vue d'ensemble (stack, API, structure).
- Config = `.env.local` (jamais versionné). Kevin y ajoute lui‑même les clés ;
  ne jamais écrire une clé en dur. Sans `OPENAI_API_KEY`, l'app tourne en mode
  mock (`src/lib/ai/mock.ts`).
- i18n : `src/i18n/messages/fr.ts` est la source de vérité des clés (type
  `Messages`). Toute nouvelle chaîne UI va dans fr **et** en.
- Classement : thème (dynamique, `categories`) + type (`kind`, fixe). Les thèmes
  naissent des propositions du LLM (`suggested_theme`) une fois le seuil
  atteint, voir `emergeThemes` dans `src/lib/notes.ts`. Le modèle par défaut
  est dans `.env.local` (`OPENAI_MODEL`), gpt-4.1-mini au 14 sept. 2026.
- Schéma DB : `src/db/schema.ts`. Après modification :
  `pnpm drizzle-kit generate` (les migrations s'appliquent au démarrage).
- CSS : les classes maison (`.btn`, `.card`, `.chip`, `.input`…) vivent dans
  `@layer components` pour que les utilitaires Tailwind gardent la priorité.
- Lancer : `pnpm dev --hostname 0.0.0.0` (config `.claude/launch.json`,
  nom `leni-dev`). Vérifier avec `pnpm lint` et `npx tsc --noEmit`.
- En dev, chaque modification de fichier recharge l'onglet de preview : ne pas
  enchaîner « find » puis « click » avec une écriture de fichier entre les deux.
