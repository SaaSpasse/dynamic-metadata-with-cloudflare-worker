# SaaSpasse — Cloudflare Worker

## Architecture actuelle

Ce repo contient le routeur edge de `saaspasse.com`. Depuis le 7 août 2026,
Next.js/Vercel est l'unique origine de production. WeWeb est complètement sorti
du chemin de requête.

```text
Requête → Cloudflare Worker
  ├── alias www/app → saaspasse.com (301)
  ├── redirects historiques → destination canonique (301)
  ├── trailing slash → URL sans slash (301)
  └── tout le reste → saaspasse-v3.vercel.app
```

## Fichiers

- `src/index.ts`: proxy unique et redirects edge;
- `config.js`: origine Vercel et redirects historiques;
- `wrangler.toml`: configuration du Worker;
- `test/index.spec.ts`: intégration légère contre l'origine Vercel.

Le sitemap, `robots.txt`, les métadonnées SEO et les 404 vivent dans le repo
`saaspasse-app/web`.

Le binding secret `SAASPASSE_WORKER_ORIGIN_SECRET` authentifie le saut
Worker → Vercel pour les contrôles de débit qui utilisent
`CF-Connecting-IP`. Sur chaque POST, le Worker supprime toujours les deux
headers réservés fournis par le visiteur, puis ajoute ensemble le secret et
l'hôte public lu depuis `request.url`. Sur GET, il n'ajoute rien. Ne jamais
placer le secret dans `[vars]`.

## Commandes

```bash
npm install
npm run check
npm run dev
npm run upload:candidate
```

## Déploiement et accès

- Cloudflare: compte SaaSpasse (`bonjourhi@saaspasse.com`), account ID
  `94914547edc4560d3fcfe3401b0f8cfa`;
- un push sur `master` valide, attend l'approbation de l'environnement
  `production`, puis charge une Version non active;
- le dispatch `stage` garde l'ancienne Version à 100 % et ajoute la candidate à
  0 % pour le canari Version Override sur le domaine canonique;
- le dispatch `promote` exige ensuite le UUID candidat, le SHA exact et
  l'approbation de l'environnement GitHub `production` avant le passage à
  100 %;
- `rollback` n'accepte qu'une Version moderne attestée ou la baseline legacy
  UUID+etag enregistrée dans `.github/worker-release-baselines.json`;
- avant premier usage, l'environnement `production` doit être limité à
  `master`, avoir un approbateur humain et un jeton Cloudflare sans droit DNS;
- configurer/faire tourner le secret avec `wrangler versions secret put`,
  jamais `wrangler secret put`; Vercel doit être redéployé après toute nouvelle
  valeur;
- le nom `weweb-dynamic-metadata` est gardé dans `wrangler.toml` seulement pour
  conserver l'identité et les routes du Worker existant.

Ne jamais committer de secrets.
