import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function validateInputs(manifest, operation, sha, version) {
  assert.ok(["stage", "promote", "rollback"].includes(operation), "invalid_operation");
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.match(version, /^[0-9a-f-]{36}$/);
  assert.equal(sha, manifest.release_sha, "unapproved_release_sha");
  assert.equal(version, manifest.candidate_version_id, "unapproved_version_id");
}
function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  assert.equal(r.status, 0, `git_guard_failed:${args[0]}`);
  return r.stdout;
}
export function validateSource(m) {
  git(["merge-base", "--is-ancestor", m.baseline_source_sha, m.release_sha]);
  for (const [file, expected] of Object.entries(m.source_hashes)) {
    const content = git(["show", `${m.release_sha}:${file}`]);
    assert.equal(createHash("sha256").update(content).digest("hex"), expected, `source_hash_mismatch:${file}`);
  }
  const index = git(["show", `${m.release_sha}:src/index.ts`]);
  const block = /    \/\/ BEGIN catalogue-certification-only\n[\s\S]*?    \/\/ END catalogue-certification-only\n\n/g;
  assert.equal([...index.matchAll(block)].length, 1);
  assert.equal(index.replace(block, ""), git(["show", `${m.baseline_source_sha}:src/index.ts`]), "non_catalogue_runtime_change");
  assert.equal(index.includes("SAASPASSE_WORKER_ORIGIN_SECRET"), false, "dormant_binding_used");
  assert.equal(git(["show", `${m.release_sha}:wrangler.toml`]), git(["show", `${m.baseline_source_sha}:wrangler.toml`]), "runtime_config_change");
}
function bindings(version) {
  return (version.resources?.bindings ?? []).map(({ name, type }) => ({ name, type })).sort((a, b) => a.name.localeCompare(b.name));
}
export function validateVersions(m, candidate, baseline) {
  assert.equal(baseline.id, m.baseline_version_id, "baseline_version_mismatch");
  assert.equal(baseline.resources?.script?.etag, m.baseline_etag, "baseline_etag_mismatch");
  assert.deepEqual(bindings(baseline), [], "baseline_binding_mismatch");
  assert.equal(candidate.id, m.candidate_version_id, "candidate_version_mismatch");
  assert.equal(candidate.annotations?.["workers/message"], `git:${m.release_sha}`, "candidate_sha_mismatch");
  assert.equal(candidate.resources?.script?.etag, m.candidate_etag, "candidate_etag_mismatch");
  assert.deepEqual(bindings(candidate), m.expected_candidate_bindings, "candidate_binding_mismatch");
  for (const version of [candidate, baseline]) {
    assert.equal(version.resources?.script_runtime?.compatibility_date, m.compatibility_date, "runtime_date_mismatch");
    assert.deepEqual(version.resources?.script_runtime?.compatibility_flags, m.compatibility_flags, "runtime_flags_mismatch");
  }
}
export function validateState(m, state, operation) {
  assert.ok(Array.isArray(state.versions), "missing_deployment_versions");
  assert.ok(state.versions.length > 0 && state.versions.length <= 2, "invalid_version_count");
  assert.equal(new Set(state.versions.map((v) => v.version_id)).size, state.versions.length, "duplicate_version_id");
  assert.equal(state.versions.reduce((total, v) => total + v.percentage, 0), 100, "invalid_traffic_total");
  const stable = state.versions.find((v) => v.version_id === m.baseline_version_id);
  const candidate = state.versions.find((v) => v.version_id === m.candidate_version_id);
  assert.ok(state.versions.every((v) => v.percentage === 0 || [m.baseline_version_id, m.candidate_version_id].includes(v.version_id)), "unrelated_live_version");
  if (operation === "rollback") {
    assert.ok(stable?.percentage === 100 || candidate?.percentage === 100, "unrecognized_rollback_state");
    return;
  }
  assert.equal(stable?.percentage, 100, "baseline_not_at_100_percent");
  if (operation === "promote") assert.equal(candidate?.percentage, 0, "candidate_not_staged");
  else assert.ok(candidate === undefined || candidate.percentage === 0, "candidate_receives_traffic");
}
export function validateAfter(m, state, operation) {
  const expected = operation === "stage"
    ? [{ version_id: m.baseline_version_id, percentage: 100 }, { version_id: m.candidate_version_id, percentage: 0 }]
    : [{ version_id: operation === "promote" ? m.candidate_version_id : m.baseline_version_id, percentage: 100 }];
  const sort = (a, b) => a.version_id.localeCompare(b.version_id);
  assert.deepEqual([...state.versions].sort(sort), expected.sort(sort), "deployment_result_mismatch");
}
if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  const [mode, manifestPath, operation, sha, version, candidatePath, baselinePath, statePath] = process.argv.slice(2);
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  validateInputs(m, operation, sha, version);
  if (mode === "source") validateSource(m);
  else if (mode === "attest") {
    validateVersions(m, JSON.parse(readFileSync(candidatePath)), JSON.parse(readFileSync(baselinePath)));
    validateState(m, JSON.parse(readFileSync(statePath)), operation);
  } else if (mode === "after") validateAfter(m, JSON.parse(readFileSync(candidatePath)), operation);
  else throw new Error("invalid_gate_mode");
  console.log(`Catalogue legacy gate ${mode}: OK`);
}
