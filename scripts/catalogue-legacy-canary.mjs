import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map((match) => [match[1].toLowerCase(), match[3]]));
}
export async function runCanary(m, request = fetch) {
  const headers = { "Cloudflare-Workers-Version-Overrides": `${m.worker}="${m.candidate_version_id}"` };
  for (const path of ["/certification-employeur", "/certification-employeur-certifie"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await request(`https://saaspasse.com${path}?utm_source=catalogue-canary&ref=a&ref=b`, { method, headers, redirect: "manual", signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 301, `${method} ${path}`);
      assert.equal(response.headers.get("location"), "https://saaspasse.com/certification?utm_source=catalogue-canary&ref=a&ref=b#employeurs");
      await response.body?.cancel();
    }
  }
  const destination = await request("https://saaspasse.com/certification", { headers, redirect: "manual", signal: AbortSignal.timeout(15000) });
  assert.equal(destination.status, 200, "certification_destination_not_public");
  assert.doesNotMatch(destination.headers.get("x-robots-tag") ?? "", /noindex|none/i);
  const html = await destination.text();
  assert.match(html, /\bid\s*=\s*(["'])employeurs\1/);
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag)).filter((attrs) => attrs.rel?.toLowerCase() === "canonical");
  assert.equal(canonical.length, 1, "missing_or_duplicate_canonical");
  assert.equal(canonical[0].href, "https://saaspasse.com/certification", "wrong_certification_canonical");
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    if (["robots", "googlebot"].includes(attrs.name?.toLowerCase())) assert.doesNotMatch(attrs.content ?? "", /noindex|none/i);
  }
}
if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  await runCanary(JSON.parse(readFileSync(process.argv[2], "utf8")));
  console.log("Canari canonique legacy : 4 redirects et destination certification conformes");
}
