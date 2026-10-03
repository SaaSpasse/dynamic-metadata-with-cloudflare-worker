import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runCanary } from "./catalogue-legacy-canary.mjs";
const m = JSON.parse(readFileSync(".github/catalogue-legacy-release.json"));
const html = '<html><head><link href="https://saaspasse.com/certification" rel="canonical"><meta name="robots" content="index,follow"></head><body><section id="employeurs"></section></body></html>';
function fixture({ status = 200, markup = html, robots = "", target = "https://saaspasse.com/certification?utm_source=catalogue-canary&ref=a&ref=b#employeurs" } = {}) {
  const calls = [];
  const request = async (url, init) => {
    calls.push({ url, init });
    return url === "https://saaspasse.com/certification"
      ? new Response(markup, { status, headers: { "x-robots-tag": robots } })
      : new Response(null, { status: 301, headers: { location: target } });
  };
  return { calls, request };
}
test("le canari emploie la candidate avec UUID cité, GET/HEAD et redirect manual", async () => {
  const f = fixture();
  await runCanary(m, f.request);
  assert.equal(f.calls.length, 5);
  assert.deepEqual(f.calls.slice(0, 4).map(({ init }) => init.method), ["GET", "HEAD", "GET", "HEAD"]);
  for (const { init } of f.calls) {
    assert.equal(init.headers["Cloudflare-Workers-Version-Overrides"], `${m.worker}="${m.candidate_version_id}"`);
    assert.equal(init.redirect, "manual");
  }
});
for (const [name, options] of [
  ["ancienne destination", { target: "https://saaspasse.com/certification-employeur" }],
  ["destination 404", { status: 404 }],
  ["header noindex", { robots: "noindex" }],
  ["meta noindex attributs inversés", { markup: html.replace('name="robots" content="index,follow"', "content='noindex' name='robots'") }],
  ["anchor absent", { markup: html.replace('id="employeurs"', 'id="autre"') }],
  ["canonical incorrect", { markup: html.replace('href="https://saaspasse.com/certification"', 'href="https://saaspasse-v3.vercel.app/certification"') }],
  ["canonical absent malgré URL dans prose", { markup: '<p>https://saaspasse.com/certification</p><section id="employeurs"></section>' }],
]) test(`le canari refuse ${name}`, async () => { await assert.rejects(runCanary(m, fixture(options).request)); });
