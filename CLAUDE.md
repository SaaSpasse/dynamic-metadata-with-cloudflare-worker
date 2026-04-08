# SaaSpasse — Cloudflare Worker (Dynamic Metadata)

## Vue d'ensemble

Cloudflare Worker servant de reverse proxy pour le site WeWeb de SaaSpasse (`saaspasse.com`). Intercepte les requêtes, injecte des métadonnées SEO dynamiques depuis Supabase, génère le sitemap, gère les redirections 301 et corrige les canonical/hreflang.

## Architecture

```
Requête → saaspasse.com
  ├── Redirections 301 (config.js)
  ├── /robots.txt → proxy + remplacement domaine
  ├── /sitemap.xml → composite (WeWeb statique + Supabase dynamique)
  ├── Page dynamique (/startups/*, /blog/*, etc.) → injection meta + JSON-LD + canonical + hreflang
  ├── Page data JSON (navigation SPA WeWeb) → patch des métadonnées dans le JSON
  └── Sinon → proxy transparent + canonical + hreflang sur HTML
```

## Structure du projet

```
src/index.ts          # Point d'entrée du Worker — toute la logique
config.js             # Configuration : domaine canonical, redirections 301, patterns dynamiques
wrangler.toml         # Config Wrangler (nom: weweb-dynamic-metadata)
vitest.config.ts      # Config tests (Cloudflare Workers pool)
test/                 # Tests (vide pour l'instant)
```

## Dépendances clés

- **Wrangler** : CLI Cloudflare Workers (deploy, dev)
- **Vitest** + `@cloudflare/vitest-pool-workers` : Tests dans l'environnement Workers
- **TypeScript** : Typage strict

## Configuration

### `config.js`

- `canonicalDomain` : `"https://saaspasse.com"`
- `redirects` : Map des redirections 301 (21 entrées migrées de Webflow)
- `config.domainSource` : URL production WeWeb (`60a33b77-84a0-4236-bb01-f71274631596-production.weweb.io`)
- `config.patterns` : 10 patterns dynamiques avec endpoints Supabase Edge Function `get-meta`

### Variables d'environnement (Secrets Cloudflare)

- `SUPABASE_KEY` : Clé API Supabase — ne jamais committer

## Pages dynamiques

| Route | Table Supabase | Endpoint meta |
|---|---|---|
| `/avantages/{slug}` | `avantages` | `get-meta/avantages/{slug}` |
| `/canaux-marketing/{slug}` | `canaux_marketing` | `get-meta/canaux-marketing/{slug}` |
| `/startups/{slug}` | `companies` | `get-meta/startups/{slug}` |
| `/blog/{slug}` | `etudes_de_cas` | `get-meta/blog/{slug}` |
| `/glossaire/{slug}` | `glossaire` | `get-meta/glossaire/{slug}` |
| `/industrie/{slug}` | `industries` | `get-meta/industrie/{slug}` |
| `/lieux/{slug}` | `lieux` | `get-meta/lieux/{slug}` |
| `/partenaires/{slug}` | `partenaires` | `get-meta/partenaires/{slug}` |
| `/episode/{slug}` | `podcast` | `get-meta/episode/{slug}` |
| `/tech-stack/{slug}` | `tech_stack` | `get-meta/tech-stack/{slug}` |

## Commandes

```bash
npm install          # Installer les dépendances
npm run dev          # Dev local (wrangler dev)
npm run deploy       # Déployer sur Cloudflare
npm test             # Lancer les tests (vitest)
```

## Conventions

- **Fichier unique** : Toute la logique est dans `src/index.ts` — 4 classes HTMLRewriter (`CustomHeaderHandler`, `StructuredDataHandler`, `CanonicalHandler`, `HreflangHandler`) + le handler `fetch`.
- **Config séparée** : Les patterns, redirections et domaines sont dans `config.js`, pas hardcodés dans le Worker.
- **Ne jamais committer** de clés API ou secrets Supabase/Cloudflare.
- Le CI/CD GitHub Actions déploie automatiquement sur chaque push vers main.

## Lien avec le monorepo principal

Ce repo est le fork séparé `SaaSpasse/dynamic-metadata-with-cloudflare-worker` référencé dans le monorepo `saaspasse-app`. Les Edge Functions Supabase `get-meta` appelées par ce Worker sont définies dans `saaspasse-app/supabase/functions/`.

## Résilience WeWeb

### Contexte (2026-04-08)

L'infra `weweb-preview.io` a été down 63 min (weweb-team/status-page#145), causant un downtime de saaspasse.com. WeWeb a ensuite annoncé la migration officielle de `weweb-preview.io` vers `production.weweb.io`. Le `domainSource` a été migré vers `production.weweb.io` pour éliminer la dépendance au preview domain déprécié et supprimer le redirect 301 intermédiaire.

WeWeb a 3 infras CloudFront séparées : preview (déprécié), production, et custom domains (100% uptime). Le HreflangHandler dans `src/index.ts` check encore `weweb-preview.io` car le HTML de `production.weweb.io` contient toujours ces références dans les hreflang — à surveiller si WeWeb met à jour.

### Option future : custom domain WeWeb

Pour une résilience maximale, on pourrait configurer `origin.saaspasse.com` comme custom domain WeWeb (infra 100% uptime). Nécessite : ajout du domaine dans WeWeb, 2 CNAME en DNS only dans Cloudflare, puis mise à jour du `domainSource` et du `HreflangHandler`.

### Comptes et accès
- **Cloudflare** : compte SaaSpasse (`bonjourhi@saaspasse.com`, account ID `94914547edc4560d3fcfe3401b0f8cfa`)
- **WeWeb** : projet ID `60a33b77-84a0-4236-bb01-f71274631596`
- **Deploy** : `npm run deploy` ou push vers main (CI/CD GitHub Actions)
