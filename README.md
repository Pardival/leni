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

## Socle sémantique (V2.1)

- **Empreintes** : chaque note reçoit un vecteur (`text-embedding-3-small`,
  512 dimensions) stocké en JSON dans `embeddings` ; la similarité cosinus est
  calculée en JS (`src/lib/embeddings.ts`), suffisant à l'échelle personnelle.
  Recalcul automatique après analyse ou édition ; rattrapage via
  `POST /api/embeddings/rebuild`.
- **Notes liées** : sur chaque note, les cinq plus proches par le sens.
- **Demande à Leni** (`/ask`) : recherche par sens puis réponse du modèle
  ancrée dans les notes trouvées, avec sources numérotées et refus honnête.
- **Approfondir** (`insights`) : lectures ajoutées sous une note à la demande,
  par lentille (ce que ça dit, autre perspective, pièges de pensée, et
  maintenant ?, question libre). Jamais imposé, jamais modifié dans le texte.

Vision complète de la V2 (réfléchir / apprendre / ranger) :
<https://claude.ai/code/artifact/da55b84a-831a-4df1-b373-e6721041b5f6>

## Apprendre (V2.2)

- **Sources** (`/learn`) : PDF (extraction `unpdf`), lien (`html-to-text`) ou
  texte collé. `POST /api/sources` répond immédiatement ; la suite tourne en
  arrière-plan (`after`) : synthèse par morceaux puis document structuré
  (résumé, sections, points clés, glossaire, questions ouvertes, concepts),
  puis cartes par lot de concepts, **vérifiées par un second passage** ; les
  cartes refusées ne sont jamais servies. Bouton « mauvaise question » en
  session.
- **Formats** : quiz, question ouverte, exercice, « explique-moi ». Les
  réponses libres sont dictées ou tapées et corrigées par le modèle (score
  0–1 → note FSRS).
- **Planification** : `ts-fsrs` (rétention cible 90 %), état par carte dans
  `cards`, journal dans `reviews`, maîtrise d'un concept = rappel moyen de
  ses cartes. Session = cartes dues, formats alternés, 10 par défaut.
- Limites connues : un gros PDF (plus de 60 pages) peut dépasser les 300 s
  d'une fonction Vercel ; découper le pipeline en étapes reprises est la
  suite naturelle.

## Design

Direction « Blocs vifs, version produit » (maquettes dans `design/directions/`,
canevas publié sur claude.ai). Tokens dans `src/app/globals.css` :

- fond `#f7f5f0`, surface blanche, encre `#17150f`, un seul accent `#f4532d`
  réservé à la capture ; mode sombre dérivé automatiquement ;
- thèmes en teinte douce : `.tint` et `.cat` dérivent fond et texte de la
  couleur du thème via `color-mix`, aucune couleur par thème à maintenir ;
- titres Bricolage Grotesque, texte Plus Jakarta Sans ; rayons 22/18/16/999 ;
- motion : `.up` (cascade à l'ouverture, `--i` pour le délai), `.breathe`,
  `.wave-bar`, `.ring` ; tout est coupé par `prefers-reduced-motion`.

Écrans : accueil (capture, « À reprendre », tuiles de thèmes, notes du jour),
note (bandeau teinté, cases à cocher persistées dans `doneActionItems`),
capture plein cadre (dictée navigateur, audio Whisper, ou clavier), Explorer,
Moi (Raccourci iOS, thèmes, langue).

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

- [x] Déploiement cloud (Vercel + Turso) : voir `DEPLOY.md`
- [x] V2.2 Apprendre : sources, synthèse, concepts, révision FSRS
- [ ] V2.3 Voir : carte des concepts, tableau d'apprentissage, fil des réflexions
- [ ] Rappels sur les actions à faire / échéances
- [ ] Export (Markdown, JSON)
