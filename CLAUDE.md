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
- `config.domainSource` : URL preview WeWeb (`60a33b77-84a0-4236-bb01-f71274631596.weweb-preview.io`)
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
