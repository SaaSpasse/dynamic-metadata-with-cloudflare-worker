# SaaSpasse — Cloudflare Worker (Dynamic Metadata + Sitemap)

Cloudflare Worker qui sert de reverse proxy pour le site WeWeb de SaaSpasse. Il intercepte les requêtes, injecte les métadonnées dynamiques depuis Supabase, et génère un sitemap complet.

## Fonctionnalités

- **Reverse proxy** : Sert le contenu de WeWeb via `saaspasse.com`, `www.saaspasse.com` et `app.saaspasse.com`
- **Métadonnées dynamiques** : Remplace les balises `<title>`, `<meta>` et Open Graph pour les pages dynamiques (SEO + partage social)
- **Sitemap dynamique** : Génère `/sitemap.xml` avec les pages statiques WeWeb + toutes les pages dynamiques depuis Supabase

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

## Architecture

1. Requête entrante sur `saaspasse.com/*`
2. Le Worker vérifie si c'est `/sitemap.xml` → génère le sitemap
3. Sinon, vérifie si l'URL match un pattern dynamique → injecte les métadonnées
4. Sinon, proxy transparent vers WeWeb
