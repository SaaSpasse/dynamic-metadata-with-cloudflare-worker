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

Depuis le 4 octobre 2026, Frank autorise les déploiements de production sans
approbation humaine. Les tests, canaris et attestations restent obligatoires.
Un push sur `master` ne modifie pas le trafic: après les tests, il charge une
**Version candidate non active** dans l'environnement GitHub `production`,
avec le marqueur `git:<SHA>`. Le jeton Cloudflare reste limité à
cet environnement et n'est jamais exposé aux tests de pull request. Le workflow
manuel `Worker release` impose ensuite deux opérations séparées:

1. `stage` garde la Version stable à 100 % et ajoute la candidate à 0 %;
2. après le canari `Version Override` sur `saaspasse.com`, `promote` place la
   candidate à 100 %.

Les deux opérations exigent les UUID stable/candidat, le SHA exact, les tests
verts et le binding secret attendu. Le canari canonique doit réussir avant
promotion. L'environnement GitHub `production` reste limité à `master`, sans
approbateur requis, avec un jeton Cloudflare limité à l'édition de ce Worker
(aucun droit DNS). Le verrou de concurrence et les contrôles de versions et
de trafic restent actifs. Le workflow `Catalogue legacy release` conserve
ses attestations spécifiques et son canari automatique; son état publié est
décrit dans [le runbook catalogue](docs/catalogue-legacy-release-workflow.md).

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
