# Déployer Leni dans le cloud (Vercel + Turso)

Objectif : capturer une note depuis la rue. L'app tourne sur **Vercel**
(hébergement Next.js, gratuit pour un usage perso) et la base sur **Turso**
(SQLite hébergé, compatible avec le client libsql déjà utilisé, gratuit
aussi). Aucun changement de code : seules les variables d'environnement
diffèrent.

## 0. Prérequis (une fois)

L'outil `vercel` est installé. Il te faut un compte Vercel et un compte
Turso (gratuits). La connexion Vercel se fait dans ton terminal, elle ouvre
le navigateur :

```bash
vercel login
```

## 1. Base de données Turso

Le plus simple : sur <https://app.turso.tech>, crée une base nommée `leni`
dans la région la plus proche de toi (depuis Brisbane : **Tokyo,
aws-ap-northeast-1** ; Turso n'a pas de région australienne), puis récupère
dans sa page **l'URL** (`libsql://leni-<org>.turso.io`) et **un token**
(bouton « Create token »). La région des fonctions Vercel (`vercel.json`,
`regions`) doit être la même : `hnd1` pour Tokyo, `dub1` pour l'Irlande.
Une base loin des fonctions multiplie le temps de chaque page.

Ou avec la ligne de commande, à installer toi-même (le script vient de
Turso) :

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

```bash
turso auth login && turso db create leni && turso db show leni --url && turso db tokens create leni
```

Les tables sont créées automatiquement au premier démarrage (migrations
Drizzle + thèmes système).

Pour copier tes notes locales vers le cloud (optionnel) :

```bash
turso db shell leni < <(sqlite3 data/leni.db .dump)
```

## 2. Projet Vercel

Depuis le dossier du projet :

```bash
vercel link
```

Puis les variables (environnement *Production*), une commande par variable,
la valeur est demandée à la saisie :

```bash
vercel env add DATABASE_URL production
```

À répéter pour : `DATABASE_AUTH_TOKEN`, `OPENAI_API_KEY`, `OPENAI_MODEL`
(gpt-4.1-mini), `CAPTURE_TOKEN` (le même que dans `.env.local`, ou un
nouveau), `APP_PASSWORD` (obligatoire : l'interface sera publique),
`AUDIO_STORAGE` (none), `LENI_USER_NAME`.

## 3. Déployer

```bash
vercel --prod
```

L'URL de production s'affiche (`https://leni-xxx.vercel.app`). Ouvre-la,
entre le mot de passe, puis va dans **Moi → Raccourci iOS** : l'adresse de
l'API y est affichée avec la bonne URL. Dans le Raccourci sur l'iPhone,
remplace l'ancienne adresse `http://192.168.x.x:3000/api/capture` par
celle-ci. Le token ne change pas si tu as gardé le même.

Ensuite, chaque mise à jour = `vercel --prod` à nouveau.

## Ce qui change en cloud

- **Audio** : sur Vercel il n'y a pas de disque persistant. Avec
  `AUDIO_STORAGE=none`, l'audio est transcrit par Whisper puis oublié ; le
  texte dicté d'origine reste conservé sur la note. Le bouton de lecture
  audio n'apparaît que pour les notes qui ont un fichier.
- **Analyse** : les fonctions sont limitées à 60 s (`maxDuration`), largement
  suffisant pour Whisper + enrichissement.
- **Sécurité** : `APP_PASSWORD` protège toute l'interface web (cookie de
  session), `CAPTURE_TOKEN` protège l'API du Raccourci. Ne mets jamais l'URL
  de l'API sans token dans un raccourci partagé.

## Alternative : rester sur le Mac

Si tu préfères garder les données chez toi, un tunnel suffit :
Tailscale (privé, l'iPhone doit avoir l'app) ou Cloudflare Tunnel (public,
avec `APP_PASSWORD`). Le Mac doit rester allumé et `pnpm dev` (ou
`pnpm build && pnpm start`) lancé.
