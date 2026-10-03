# Publication bornée du catalogue sur le routeur legacy

La production sert encore la baseline legacy à 100 %. Le code origin-auth de
master reste une candidate distincte non promue. Publier le catalogue doit donc
porter seulement ses deux redirects sur la source legacy attestée, sans
introduire origin-auth ni réécrire le proxy.

## Identités à revoir

| Élément | Identité immuable |
| --- | --- |
| Source legacy historique | `4c736998bc0f1e1c52640919ee0c48d4a4899ef1` (PR #1) |
| Version active | `087e8d4e-6e77-40b9-967e-84bf39987165` |
| Etag active | `d62c660d1a55c006d95e634dd71baeb8461d0cfb2a2ca5bb63d1f03bec79be78` |
| Branche source publiée | `codex/catalogue-legacy-redirects-20261002` |
| SHA catalogue legacy | `77e30775c9fe9df09fef3469c0404b797f4b0022` |
| Version catalogue inactive | `c11c9f26-4484-4bdf-8c69-500792db77c8` |
| Etag catalogue | `256866ad79537abd4e72edaa68e00fa27d6a87916da1659a045c95718aa01100` |

La correspondance source `4c` → Version `087` est une attestation historique du
runbook, pas une annotation Git native de la Version. Le UUID+etag de cette
baseline est déjà épinglé dans `.github/worker-release-baselines.json`.
La candidate catalogue porte l'annotation native `git:77e30775...` complète.
Le reçu avant/après est dans `catalogue-legacy-candidate-receipt.json` : les
versions et leur trafic n'ont pas changé lors du chargement inactif.

La candidate a **un binding secret dormant** hérité. Le paramètre upload qui
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
- L'environnement `production`, sa restriction `master` et **son approbateur
  humain** sont conservés. Aucun agent ne doit approuver à la place de Frank.
  Le jeton n'est accessible qu'aux étapes Cloudflare. Aucune route, DNS ni
  valeur de secret n'est modifiée.

## Procédure concrète après revue et mise en ligne R1

Cette PR n'est pas elle-même une autorisation de publier. Ne pas fusionner le
legacy source dans master : cela effacerait le travail origin-auth pending.
La PR distincte de backport conserve ces aliases dans le futur routeur advanced.

1. Revoir et fusionner le workflow approuvé sur master avec ses checks verts.
   Le workflow historique pourra demander séparément une approbation pour
   charger une nouvelle candidate master inactive; cela ne doit pas être
   confondu avec la publication legacy.
2. Après R1 publique, ouvrir Actions → **Catalogue legacy release** → Run
   workflow, sélectionner `master`, `stage`, SHA77 complet et UUIDc11 complet
   du tableau. Frank approuve le job dans l'environnement `production`.
   Baseline `087` reste à 100 %, candidat `c11` devient 0 % pour le canari.
3. Revoir le résultat du stage. Dispatcher `promote` avec les mêmes valeurs.
   Frank approuve de nouveau. Le workflow lance le canari et ne passe à 100 %
   qu'après sa réussite, puis contrôle l'état réel final.
4. Si retour requis, dispatcher `rollback` avec les mêmes SHA/UUID (ce sont
   les identités de cette release, la cible rollback est toujours `087`).
   L'approbation humaine demeure nécessaire. L'ancien workflow conserve aussi
   son rollback `087` UUID+etag avec release_sha et previous_version_id vides.

Dispatch préparé, à exécuter seulement lors de cette étape approuvée :

```bash
gh workflow run catalogue-legacy-release.yml --ref master \
  -f operation=stage \
  -f release_sha=77e30775c9fe9df09fef3469c0404b797f4b0022 \
  -f version_id=c11c9f26-4484-4bdf-8c69-500792db77c8
```

Remplacer `stage` par `promote` ou `rollback` pour les étapes correspondantes.
Ne pas utiliser la CLI locale pour contourner la revue GitHub `production`.
La candidate advanced `009384da` ne doit jamais être promue pour ce lot catalogue.
