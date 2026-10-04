# Publication bornée du catalogue sur le routeur legacy

Depuis le 4 octobre 2026, la Version catalogue legacy `c11` est active à 100 %.
La [promotion 37212266475](https://github.com/SaaSpasse/dynamic-metadata-with-cloudflare-worker/actions/runs/37212266475)
est terminée avec succès. La baseline historique `087` reste le retour arrière
connu. Le code origin-auth de master demeure une candidate distincte non
promue : cette publication porte seulement les deux redirects catalogue sur
la source legacy attestée, sans introduire origin-auth ni réécrire le proxy.

Frank a autorisé les déploiements de production sans approbation humaine le
4 octobre. Le réglage `required_reviewers` de l'environnement GitHub
`production` a été retiré; sa restriction à `master` est conservée. Les tests,
canaris, attestations et contrôles de trafic restent obligatoires.

## Identités publiées et retour arrière

| Élément | Identité immuable |
| --- | --- |
| Source legacy historique | `4c736998bc0f1e1c52640919ee0c48d4a4899ef1` (PR #1) |
| Version de retour arrière connue | `087e8d4e-6e77-40b9-967e-84bf39987165` |
| Etag baseline | `d62c660d1a55c006d95e634dd71baeb8461d0cfb2a2ca5bb63d1f03bec79be78` |
| Branche source publiée | `codex/catalogue-legacy-redirects-20261002` |
| SHA catalogue legacy | `77e30775c9fe9df09fef3469c0404b797f4b0022` |
| Version catalogue active à 100 % | `c11c9f26-4484-4bdf-8c69-500792db77c8` |
| Etag catalogue | `256866ad79537abd4e72edaa68e00fa27d6a87916da1659a045c95718aa01100` |

La correspondance source `4c` → Version `087` est une attestation historique du
runbook, pas une annotation Git native de la Version. Le UUID+etag de cette
baseline est déjà épinglé dans `.github/worker-release-baselines.json`.
La Version catalogue porte l'annotation native `git:77e30775...` complète.
Le reçu de chargement `catalogue-legacy-candidate-receipt.json` atteste que les
versions et leur trafic n'avaient pas changé lors du chargement inactif.
La promotion du 4 octobre a ensuite placé `c11` à 100 %.

La Version catalogue a **un binding secret dormant** hérité. Le paramètre upload qui
annonçait des bindings vides dans la documentation du SHA77 n'a pas empêché
Cloudflare de l'hériter. Le constat réel et la politique approuvée ici font
foi : aucun secret n'a été lu, effacé ou changé pour fabriquer une parité.
Le proxy legacy ne lit ni `env` ni ce binding, prouvé par comparaison exacte
hors bloc catalogue et les hashes fixes de tous les fichiers concernés.

## Politique et validations

- Le workflow est exécuté depuis `master` uniquement. Son manifeste, son
  garde-fou et son canari sont copiés avant le checkout du SHA legacy.
- Le SHA/UUID/etags/bindings/date/flags sont exactement ceux revus dans le
  manifeste. Un SHA arbitraire n'est jamais accepté. Le SHA legacy doit être
  descendant de `4c` et présent sur sa branche publiée. Aucun ancestry master
  artificiel n'est créé.
- La source `src/index.ts` hors bloc certification et `wrangler.toml` sont
  byte-identiques à `4c`. Les fichiers source/outils/tests sont épinglés par hash.
- Les 101 tests Worker, types, génération de types et audithigh sont rejoués sur
  SHA77 avant stage/promote, sans jeton Cloudflare. Les tests de la politique
  et du canari tournent sur la PR du workflow, y compris dans le check
  `validate-and-upload` déjà obligatoire sur master.
- Les deux versions sont attestées et le trafic vérifié avant et immédiatement
  avant mutation. Seuls baseline100+candidat0, candidat100 ou baseline100
  sont des résultats autorisés selon l'opération. Une version inconnue qui
  reçoit du trafic bloque l'opération.
- Promotion exige candidat0 déjà stagé et un canari GET/HEAD des deux anciens
  chemins via Version Override avec UUID cité. Le canari exige la destination
  200, son canonical exact, l'ancre employeurs et absence de noindex.
- Le verrou `worker-production-release` est commun aux jobs de mutation des
  deux workflows pour empêcher des opérations GitHub concurrentes.
- L'environnement `production` et sa restriction `master` sont conservés,
  sans approbateur requis. Les jobs s'exécutent sans validation humaine; le
  jeton n'est accessible qu'aux étapes Cloudflare. Aucune route, DNS ni valeur
  de secret n'est modifiée.

## Procédure de référence et retour arrière

Les étapes `stage` puis `promote` ont été exécutées pour la Version `c11`.
La procédure ci-dessous décrit cette transition depuis `087` à 100 %; ne pas
rejouer `stage` ou `promote` alors que `c11` est déjà active à 100 %.
Ne pas fusionner la source legacy dans master : cela effacerait le travail
origin-auth distinct. La PR de backport conserve ces aliases dans le futur
routeur advanced.

1. Utiliser le workflow de master avec ses checks verts. Le workflow historique
   peut charger séparément une nouvelle candidate master inactive, sans
   approbation humaine; ce chargement ne publie pas la Version legacy.
2. Après R1 publique, ouvrir Actions → **Catalogue legacy release** → Run
   workflow, sélectionner `master`, `stage`, SHA77 complet et UUIDc11 complet
   du tableau. Le job s'exécute sans approbation humaine dans `production`.
   Baseline `087` reste à 100 %, candidat `c11` devient 0 % pour le canari.
3. Revoir le résultat du stage. Dispatcher `promote` avec les mêmes valeurs.
   Le workflow lance le canari et ne passe à 100 % qu'après sa réussite, puis
   contrôle l'état réel final, sans approbation humaine.
4. Si retour requis, dispatcher `rollback` avec les mêmes SHA/UUID (ce sont
   les identités de cette release, la cible rollback est toujours `087`).
   Le job s'exécute sans approbation humaine en conservant les attestations.
   L'ancien workflow conserve aussi son rollback `087` UUID+etag avec
   release_sha et previous_version_id vides.

Exemple de référence pour `stage`, applicable depuis la baseline `087` à 100 %,
après un retour arrière éventuel :

```bash
gh workflow run catalogue-legacy-release.yml --ref master \
  -f operation=stage \
  -f release_sha=77e30775c9fe9df09fef3469c0404b797f4b0022 \
  -f version_id=c11c9f26-4484-4bdf-8c69-500792db77c8
```

Remplacer `stage` par `promote` ou `rollback` pour les étapes correspondantes.
Utiliser les workflows de `master` pour conserver les tests, attestations,
canaris et contrôles de trafic; ne pas les contourner par un déploiement local.
La candidate advanced `009384da` ne doit jamais être promue pour ce lot catalogue.
