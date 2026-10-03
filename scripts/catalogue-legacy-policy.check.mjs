import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateInputs, validateSource, validateVersions, validateState, validateAfter } from "./catalogue-legacy-gate.mjs";
const m = JSON.parse(readFileSync(".github/catalogue-legacy-release.json"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const runtime = { compatibility_date: m.compatibility_date, compatibility_flags: m.compatibility_flags };
const candidate = { id: m.candidate_version_id, annotations: { "workers/message": `git:${m.release_sha}` }, resources: { script: { etag: m.candidate_etag }, script_runtime: runtime, bindings: m.expected_candidate_bindings } };
const baseline = { id: m.baseline_version_id, resources: { script: { etag: m.baseline_etag }, script_runtime: runtime, bindings: [] } };
const state = { versions: [{ version_id: m.baseline_version_id, percentage: 100 }, { version_id: m.candidate_version_id, percentage: 0 }] };
test("la source publiée est bornée aux fichiers approuvés et au proxy legacy", () => validateSource(m));
test("SHA, UUID et opération arbitraires sont refusés", () => {
  validateInputs(m, "stage", m.release_sha, m.candidate_version_id);
  assert.throws(() => validateInputs(m, "promote", "0".repeat(40), m.candidate_version_id));
  assert.throws(() => validateInputs(m, "promote", m.release_sha, "0".repeat(36)));
  assert.throws(() => validateInputs(m, "upload", m.release_sha, m.candidate_version_id));
});
test("les versions exactes et le binding dormant observé sont acceptés", () => validateVersions(m, candidate, baseline));
for (const field of ["sha", "candidate_etag", "baseline_etag", "binding", "runtime"]) {
  test(`l'attestation refuse une mutation ${field}`, () => {
    const c = clone(candidate), b = clone(baseline);
    if (field === "sha") c.annotations["workers/message"] = "git:autre";
    if (field === "candidate_etag") c.resources.script.etag = "autre";
    if (field === "baseline_etag") b.resources.script.etag = "autre";
    if (field === "binding") c.resources.bindings.push({ name: "AUTRE_SECRET", type: "secret_text" });
    if (field === "runtime") c.resources.script_runtime.compatibility_date = "2026-10-02";
    assert.throws(() => validateVersions(m, c, b));
  });
}
test("stage exige la baseline 100 et accepte seulement un candidat absent ou 0", () => {
  validateState(m, state, "stage");
  validateState(m, { versions: [state.versions[0]] }, "stage");
  assert.throws(() => validateState(m, { versions: [{ version_id: m.baseline_version_id, percentage: 50 }, { version_id: m.candidate_version_id, percentage: 50 }] }, "stage"));
});
test("promotion refuse un candidat non stagé ou une version étrangère en trafic", () => {
  validateState(m, state, "promote");
  assert.throws(() => validateState(m, { versions: [state.versions[0]] }, "promote"));
  assert.throws(() => validateState(m, { versions: [{ version_id: "étrangère", percentage: 100 }] }, "promote"));
});
test("rollback n'accepte que les états connus de la baseline ou candidate", () => {
  validateState(m, { versions: [{ version_id: m.candidate_version_id, percentage: 100 }] }, "rollback");
  assert.throws(() => validateState(m, { versions: [{ version_id: "étrangère", percentage: 100 }] }, "rollback"));
});
test("l'état final est exactement celui de l'opération approuvée", () => {
  validateAfter(m, state, "stage");
  validateAfter(m, { versions: [{ version_id: m.candidate_version_id, percentage: 100 }] }, "promote");
  validateAfter(m, { versions: [{ version_id: m.baseline_version_id, percentage: 100 }] }, "rollback");
  assert.throws(() => validateAfter(m, state, "promote"));
});
