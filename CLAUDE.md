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

## Commandes

```bash
npm install
npm test
npm run dev
npm run deploy
```

## Déploiement et accès

- Cloudflare: compte SaaSpasse (`bonjourhi@saaspasse.com`), account ID
  `94914547edc4560d3fcfe3401b0f8cfa`;
- un push sur `master` déploie automatiquement;
- le nom `weweb-dynamic-metadata` est gardé dans `wrangler.toml` seulement pour
  conserver l'identité et les routes du Worker existant.

Ne jamais committer de secrets.
