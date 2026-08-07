# SaaSpasse Edge Router

Cloudflare Worker placé devant `saaspasse.com`. Depuis le 7 août 2026,
**Next.js sur Vercel est l'unique origine**: aucune requête de production ne
dépend de WeWeb.

Le Worker fait seulement trois choses:

1. rediriger `www.saaspasse.com` et `app.saaspasse.com` vers le domaine canonique;
2. conserver les redirections historiques définies dans `config.js`;
3. proxifier toute autre requête vers `https://saaspasse-v3.vercel.app`.

`robots.txt`, le sitemap, les métadonnées, les pages dynamiques et les 404 sont
maintenant produits par Next.js.

## Développement

```bash
npm install
npm test
npm run dev
```

## Déploiement

```bash
npm run deploy
```

Un push sur `master` déclenche aussi le déploiement Cloudflare. Le nom déployé
`weweb-dynamic-metadata` est conservé dans `wrangler.toml` uniquement pour ne
pas recréer le Worker ni ses routes; ce nom n'indique plus une dépendance.
