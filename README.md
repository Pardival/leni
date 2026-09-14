# Leni — capture vocale de notes, rangement par IA

Leni est un outil personnel pour capturer une idée en quelques secondes (dictée
depuis l'iPhone via un Raccourci, ou depuis le web) et la retrouver ensuite :
un LLM nettoie le texte, lui donne un titre, une catégorie, des tags, des
actions à faire, un lieu, une échéance.

## Stack

- **Next.js 16** (App Router, Route Handlers, `proxy.ts`) + TypeScript + Tailwind 4
- **SQLite** via Drizzle ORM + libsql (`DATABASE_URL=file:./data/leni.db`).
  Migration vers Turso (cloud) = changer l'URL.
- **OpenAI** : Whisper pour l'audio, modèle de chat (sortie structurée) pour
  l'enrichissement. Sans clé : mode *mock* avec heuristiques locales.
- **i18n** maison : `src/i18n/messages/<code>.ts`. Le français est la
  référence de type ; ajouter une langue = copier `en.ts`, traduire,
  l'enregistrer dans `src/i18n/index.ts`.

## Démarrer

```bash
cp .env.example .env.local   # puis remplir OPENAI_API_KEY et CAPTURE_TOKEN
pnpm install
pnpm dev --hostname 0.0.0.0  # accessible depuis l'iPhone sur le même Wi‑Fi
```

Ouvre <http://localhost:3000>. La page **Raccourci iOS** (`/setup`) affiche
l'adresse LAN, le token et les étapes pour créer le Raccourci.

## API de capture

`POST /api/capture` avec `Authorization: Bearer <CAPTURE_TOKEN>`.

- JSON : `{ "text": "...", "lat": 48.8, "lng": 2.3, "source": "shortcut", "language": "fr", "wait": true }`
- multipart : champ `audio` (fichier) → transcription Whisper, mêmes champs optionnels
- `wait: true` attend la fin de l'analyse (sinon réponse `202` immédiate,
  analyse en arrière‑plan)

Autres routes : `GET/POST /api/notes`, `GET/PATCH/DELETE /api/notes/:id`,
`POST /api/notes/:id/reprocess`, `GET /api/audio/:name`.

## Analyse d'une note

Chaque note passe par le LLM (sortie structurée, `src/lib/ai/enrich.ts`) :

- **Réécriture** : `content` est une version synthétique et lisible du texte
  dicté (hésitations et répétitions retirées, liste à puces si plusieurs points).
  Le texte brut reste dans `rawText`.
- **Deux axes de classement** : un **thème** (domaine de vie, table
  `categories`, dynamique) et un **type** fixe (`kind` : idée, tâche,
  réflexion, journal, référence, note).
- **Thèmes émergents** : le modèle nomme toujours le thème idéal de la note.
  S'il n'existe pas, la proposition est mémorisée sur la note ; dès que
  `THEME_EMERGENCE_THRESHOLD` notes (2 par défaut) partagent la même
  proposition, un second appel LLM vérifie qu'aucun thème existant ne la
  couvre, puis le thème est créé et les notes rattachées. La page `/categories`
  permet de créer, écarter, renommer ou fusionner.

## Structure

```
src/
  app/            pages (liste, note, capture, explore, setup, login) + api/
  components/     UI client (Nav, NoteCard, FiltersBar, NoteEditor, CaptureBox, Constellation…)
  db/             schéma Drizzle + connexion (migrations auto au démarrage)
  i18n/           registre des langues, messages, helpers serveur/client
  lib/            config, auth, notes (repo), ai/ (enrich, transcribe, mock)
drizzle/          migrations SQL générées (pnpm drizzle-kit generate)
data/             base SQLite + audio (non versionné)
```

## Sécurité

- L'API exige le token de capture, ou une requête du navigateur même origine.
- `APP_PASSWORD` (optionnel) protège l'interface web par cookie de session,
  à activer avant toute exposition sur Internet.

## Feuille de route

- [ ] Déploiement cloud (Vercel + Turso) pour capturer depuis la rue
- [ ] Vue « constellation » plus riche (3D, filtres temporels)
- [ ] Rappels sur les actions à faire / échéances
- [ ] Export (Markdown, JSON)
