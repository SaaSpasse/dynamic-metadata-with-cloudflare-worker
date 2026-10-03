import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const baseline = "4c736998bc0f1e1c52640919ee0c48d4a4899ef1";
function legacyFile(file) {
  const result = spawnSync("git", ["show", `${baseline}:${file}`], { encoding: "utf8" });
  assert.equal(result.status, 0, `Baseline indisponible : ${file}`);
  return result.stdout;
}
const index = readFileSync("src/index.ts", "utf8");
const scopedBlock = /    \/\/ BEGIN catalogue-certification-only\n[\s\S]*?    \/\/ END catalogue-certification-only\n\n/g;
assert.equal([...index.matchAll(scopedBlock)].length, 1, "Un seul bloc catalogue isolé doit être présent");
assert.equal(index.replace(scopedBlock, ""), legacyFile("src/index.ts"), "Le proxy et les redirects hors catalogue doivent rester identiques au legacy");
const expectedConfig = legacyFile("config.js").replace(
  '  "/certification-employeur-certifie": "/certification-employeur",',
  '  "/certification-employeur": "/certification#employeurs",\n  "/certification-employeur-certifie": "/certification#employeurs",'
);
assert.equal(readFileSync("config.js", "utf8"), expectedConfig, "Deux mappings certification seulement");
assert.equal(readFileSync("wrangler.toml", "utf8"), legacyFile("wrangler.toml"), "La configuration runtime legacy reste identique");
assert.equal(index.includes("createOriginRequest"), false, "Aucun durcissement origin-auth dans ce lot");
console.log(`Périmètre legacy validé contre ${baseline}`);
