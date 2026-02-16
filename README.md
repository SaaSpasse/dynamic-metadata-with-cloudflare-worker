# SaaSpasse — Cloudflare Worker (Dynamic Metadata + Sitemap)

Cloudflare Worker qui sert de reverse proxy pour le site WeWeb de SaaSpasse. Il intercepte les requêtes, injecte les métadonnées dynamiques depuis Supabase, et génère un sitemap complet.

## Fonctionnalités

- **Reverse proxy** : Sert le contenu de WeWeb via `saaspasse.com`, `www.saaspasse.com` et `app.saaspasse.com`
- **Métadonnées dynamiques** : Remplace les balises `<title>`, `<meta>` et Open Graph pour les pages dynamiques (SEO + partage social)
- **Données structurées** : Injecte du JSON-LD (`<script type="application/ld+json">`) quand disponible depuis Supabase
- **Canonical tags** : Injecte `<link rel="canonical" href="https://saaspasse.com/...">` sur toutes les pages HTML
- **Hreflang tags** : Corrige les balises `<link rel="alternate" hreflang="...">` pour pointer vers `saaspasse.com` au lieu du domaine preview WeWeb
- **Sitemap dynamique** : Génère `/sitemap.xml` avec les pages statiques WeWeb + toutes les pages dynamiques depuis Supabase
- **robots.txt** : Remplace le domaine preview WeWeb par `saaspasse.com` dans l'URL du sitemap
- **Redirections** : 21 redirections 301 migrées de Webflow (définies dans `config.js`)

## Pages dynamiques supportées

| Route | Table Supabase |
|---|---|
| `/avantages/{path}` | `avantages` |
| `/canaux-marketing/{path}` | `canaux_marketing` |
| `/startups/{path}` | `companies` |
| `/blog/{path}` | `etudes_de_cas` |
| `/glossaire/{path}` | `glossaire` |
| `/industrie/{path}` | `industries` |
| `/lieux/{path}` | `lieux` |
| `/partenaires/{path}` | `partenaires` |
| `/episode/{path}` | `podcast` |
| `/tech-stack/{path}` | `tech_stack` |

## Configuration

### `config.js`

```javascript
export const canonicalDomain = "https://saaspasse.com";

export const redirects = {
  "/ancien-chemin": "/nouveau-chemin",
  "/externe": "https://example.com/page",
  // ...
};

export const config = {
  domainSource: "https://xxxxx.weweb-preview.io", // Lien preview WeWeb
  patterns: [
    {
      pattern: "^/startups/[^/]+",
      metaDataEndpoint: "https://xxxxx.supabase.co/functions/v1/get-meta/startups/{slug}"
    }
    // ...
  ]
};
```

### Variables d'environnement (Cloudflare Worker Settings > Secrets)

- `SUPABASE_KEY` : Clé API Supabase pour les requêtes de métadonnées et sitemap

## Déploiement

```sh
npm install
npm run deploy
```

Le CI/CD GitHub Actions déploie automatiquement sur chaque push.

## Architecture

1. Requête entrante sur `saaspasse.com/*`
2. Vérifie les **redirections** (`config.js`) → 301 si match
3. `/robots.txt` → remplace le domaine preview par `saaspasse.com`
4. `/sitemap.xml` → génère le sitemap composite (WeWeb statique + Supabase dynamique)
5. URL matche un pattern dynamique → injecte métadonnées, JSON-LD, canonical, hreflang
6. Page data JSON (navigation SPA) → patche les métadonnées dans le JSON WeWeb
7. Sinon → proxy transparent avec injection de canonical + correction hreflang pour les réponses HTML
