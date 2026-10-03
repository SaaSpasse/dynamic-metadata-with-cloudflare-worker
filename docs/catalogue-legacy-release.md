# Candidate catalogue limitée à la Version active legacy

Base historique documentée : `4c736998bc0f1e1c52640919ee0c48d4a4899ef1`,
associée à la Version active `087e8d4e-6e77-40b9-967e-84bf39987165`, etag
`d62c660d1a55c006d95e634dd71baeb8461d0cfb2a2ca5bb63d1f03bec79be78`.

Seules les deux anciennes certifications rejoignent `/certification#employeurs`.
La composition hôte/slash et le décodage sont limités à ces deux routes.
Le proxy Vercel, les headers et tous les autres redirects restent identiques
au fichier source de la baseline, contrôlé par `check-legacy-scope.mjs`.
Ce lot n'active pas le durcissement origin-auth de la branche `master`.

Les outils de validation sont actualisés pour exécuter Vitest, TypeScript,
typegen et audit. Les tests couvrent les variantes des deux redirects et les
contrats legacy du proxy, corps POST, headers, www et paths encodés non concernés.

`wrangler.toml` reste byte pour byte celui de la baseline. L'upload de la
Version utilise un fichier distinct `wrangler.catalogue-legacy.toml` :
`bindings=[]` et `keep_bindings=[]` explicites empêchent Wrangler de copier
les bindings secrets du dernier candidat origin-auth inactif. Ce paramètre
est transmis comme métadonnée de la nouvelle Version; aucun appel secret put,
secret delete, deploy ou triggers deploy n'est effectué. Vérifier après
upload que la nouvelle Version a zéro binding et que la Version origin-auth
antérieure conserve son binding, en lisant uniquement noms et types.

Cette branche constitue une source de release publiée pour revue. Ne pas
fusionner son code runtime legacy sur `master`, qui conserve le chantier
origin-auth avancé. Une extension explicite, bornée et revue du workflow
de release doit attester son SHA, les hashes de source et l'etag de candidate;
garder l'environnement `production`, son reviewer et la branche master.
L'ancienne règle ancestor-master et exigence origin-secret ne sont pas
silencieusement contournées. Aucun stage/promote CLI n'est autorisé ici.
