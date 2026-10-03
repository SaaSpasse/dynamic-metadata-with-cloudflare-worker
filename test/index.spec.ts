import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
const originFetch = vi.fn<typeof fetch>();
beforeEach(() => { originFetch.mockResolvedValue(new Response("origine fixture")); vi.stubGlobal("fetch", originFetch); });
afterEach(() => { vi.unstubAllGlobals(); originFetch.mockReset(); });

describe("Deux certifications historiques", () => {
  for (const source of ["certification-employeur", "certification-employeur-certifie"]) {
    for (const host of ["saaspasse.com", "www.saaspasse.com", "app.saaspasse.com"]) {
      for (const protocol of ["http", "https"]) {
        for (const suffix of ["", "/"]) {
          for (const path of [source, source.replace("-", "%2D")]) {
            for (const method of ["GET", "HEAD"]) {
              it(`${method} ${protocol}://${host}/${path}${suffix} rejoint directement /certification`, async () => {
                const response = await worker.fetch(new Request(`${protocol}://${host}/${path}${suffix}?utm_campaign=%C3%89t%C3%A9+2027&ref=a&ref=b`, { method }));
                expect(response.status).toBe(301);
                expect(response.headers.get("location")).toBe("https://saaspasse.com/certification?utm_campaign=%C3%89t%C3%A9+2027&ref=a&ref=b#employeurs");
                expect(originFetch).not.toHaveBeenCalled();
              });
            }
          }
        }
      }
    }
  }
});
describe("Contrat legacy conservé hors certification", () => {
  it("conserve les redirects historiques et leurs campagnes", async () => {
    for (const [source, destination] of [["/startups/billdr-pro/", "/startups/billdr"], ["/jameo", "/startups/jameo"], ["/saas-emplois", "/emplois"]]) {
      const response = await worker.fetch(new Request(`https://saaspasse.com${source}?ref=a&ref=b`));
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe(`https://saaspasse.com${destination}?ref=a&ref=b`);
    }
  });
  it("garde le saut www historique avant un mapping hors certification", async () => {
    const response = await worker.fetch(new Request("https://www.saaspasse.com/jameo?utm_source=test"));
    expect(response.headers.get("location")).toBe("https://saaspasse.com/jameo?utm_source=test");
  });
  it("ne décode pas les autres chemins et préserve la sous-requête originale", async () => {
    const request = new Request("https://saaspasse.com/startups/%62illdr-pro?ref=a", { redirect: "manual" });
    await worker.fetch(request);
    expect(originFetch).toHaveBeenCalledTimes(1);
    expect(originFetch.mock.calls[0]).toHaveLength(1);
    const proxied = originFetch.mock.calls[0][0] as Request;
    expect(proxied.url).toBe("https://saaspasse-v3.vercel.app/startups/%62illdr-pro?ref=a");
    expect(proxied.redirect).toBe(request.redirect);
  });
  it("relaie le POST, le corps et les headers comme la version active, sans nouveau secret", async () => {
    const request = new Request("https://saaspasse.com/infolettre", {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-saaspasse-origin-secret": "fixture-entrant", "x-saaspasse-public-host": "fixture.test" },
      body: "email=fixture%40example.invalid",
    });
    await worker.fetch(request);
    expect(originFetch.mock.calls[0]).toHaveLength(1);
    const proxied = originFetch.mock.calls[0][0] as Request;
    expect(proxied.headers.get("x-forwarded-host")).toBe("saaspasse.com");
    expect(proxied.headers.get("x-forwarded-proto")).toBe("https");
    expect(proxied.headers.get("x-saaspasse-origin-secret")).toBe("fixture-entrant");
    expect(proxied.headers.get("x-saaspasse-public-host")).toBe("fixture.test");
    expect(new TextDecoder().decode(await proxied.arrayBuffer())).toBe("email=fixture%40example.invalid");
  });
  it("préserve les réponses de l'origine, y compris 404 et redirect", async () => {
    for (const status of [404, 308]) {
      originFetch.mockResolvedValueOnce(new Response(null, { status, headers: { Location: "https://saaspasse.com/emplois" } }));
      const response = await worker.fetch(new Request("https://saaspasse.com/inconnu"));
      expect(response.status).toBe(status);
    }
  });
});
