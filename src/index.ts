import { appOrigin, canonicalDomain, redirects } from "../config.js";

// Routeur edge SaaSpasse. Depuis la sortie complète de WeWeb (7 août 2026),
// Next.js est l'origine unique: le Worker conserve seulement le domaine
// public, les redirects historiques et la normalisation des trailing slashes.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Les alias historiques ont une seule forme canonique.
    if (url.hostname === "www.saaspasse.com" || url.hostname === "app.saaspasse.com") {
      return Response.redirect(`${canonicalDomain}${url.pathname}${url.search}`, 301);
    }

    const normalizedPath =
      url.pathname.endsWith("/") && url.pathname !== "/"
        ? url.pathname.slice(0, -1)
        : url.pathname;
    const redirectTarget = (redirects as Record<string, string>)[normalizedPath];
    if (redirectTarget) {
      const target = redirectTarget.startsWith("http")
        ? redirectTarget
        : `${canonicalDomain}${redirectTarget}`;
      return Response.redirect(target, 301);
    }

    // Next.js est configuré sans trailing slash. Un 301 au bord évite un
    // aller-retour vers Vercel et garde une seule URL indexable.
    if (
      url.pathname.length > 1 &&
      url.pathname.endsWith("/") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return Response.redirect(
        `${canonicalDomain}${url.pathname.slice(0, -1)}${url.search}`,
        301
      );
    }

    const target = `${appOrigin}${url.pathname}${url.search}`;
    const proxied = new Request(target, request);
    proxied.headers.set("x-forwarded-host", url.host);
    proxied.headers.set("x-forwarded-proto", "https");
    return fetch(proxied);
  },
};
