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

Le secret `SAASPASSE_WORKER_ORIGIN_SECRET` doit être configuré comme binding
secret Cloudflare et avec la même valeur côté Vercel. Sur les `POST`, le Worker
retire toujours les valeurs entrantes puis ajoute ensemble
`x-saaspasse-origin-secret` et `x-saaspasse-public-host`. Le frontend ne fait
confiance à `CF-Connecting-IP` que si cette paire est valide. Aucun de ces
headers n'est ajouté aux `GET`/assets. Ne jamais mettre le secret dans
`wrangler.toml` ou `[vars]`.

## Développement

```bash
npm install
npm run check
npm run dev
```

## Déploiement

Un push sur `master` ne modifie plus le trafic: après les tests, il charge une
**Version candidate non active** avec le marqueur `git:<SHA>`. Le workflow
manuel `Worker release` impose ensuite deux opérations séparées:

1. `stage` garde la Version stable à 100 % et ajoute la candidate à 0 %;
2. après le canari `Version Override` sur `saaspasse.com`, `promote` place la
   candidate à 100 %.

Les deux opérations exigent les UUID stable/candidat, le SHA exact, le binding
secret attendu et l'approbation de l'environnement GitHub `production`. Avant
le premier usage, créer cet environnement, le limiter à `master`, ajouter un
approbateur humain et fournir un jeton Cloudflare limité à l'édition de ce
Worker (aucun droit DNS).

Pour le premier provisionnement ou une rotation, utiliser
`wrangler versions secret put SAASPASSE_WORKER_ORIGIN_SECRET`, jamais
`wrangler secret put` (qui crée et déploie immédiatement une version). Ajouter
la même valeur à Vercel, produire un nouveau déploiement Vercel, puis tester la
Version Worker sur `saaspasse.com` avec un Version Override avant promotion.
Une URL `workers.dev` ne prouve pas le domaine public, et l'origine Worker reste
fixée à `saaspasse-v3.vercel.app`: le canari complet est donc confirmé juste
après la promotion frontend, avec rollback immédiat prêt.

`rollback` accepte soit une Version moderne portant son marqueur Git et son
binding, soit uniquement la Version historique épinglée par UUID **et** etag
dans `.github/worker-release-baselines.json`. Pour cette baseline legacy,
laisser `release_sha` vide; aucune autre Version sans attestation n'est admise.
Ne jamais supprimer cette baseline avant qu'au moins une Version moderne
stable et testée puisse la remplacer comme retour arrière.

Le nom déployé `weweb-dynamic-metadata` est conservé dans `wrangler.toml`
uniquement pour ne pas recréer le Worker ni ses routes; ce nom n'indique plus
une dépendance.
