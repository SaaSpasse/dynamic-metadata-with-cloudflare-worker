import { appOrigin, canonicalDomain, redirects } from "../config.js";

const ORIGIN_SECRET_HEADER = "x-saaspasse-origin-secret";
const PUBLIC_HOST_HEADER = "x-saaspasse-public-host";
const PUBLIC_HOSTS = new Set([
  "saaspasse.com",
  "www.saaspasse.com",
  "app.saaspasse.com",
]);
const ORIGIN_SECRET_PATTERN = /^[\x21-\x7e]{32,256}$/;

export function createOriginRequest(
  request: Request,
  target: string,
  publicHost: string,
  originSecret?: string
) {
  const proxied = new Request(target, request);
  proxied.headers.set("x-forwarded-host", publicHost);
  proxied.headers.set("x-forwarded-proto", "https");

  // Un visiteur peut fournir ces headers à l'entrée. Toujours les retirer,
  // puis les recréer ensemble uniquement depuis request.url et le binding
  // secret du Worker. Vercel écrasera x-forwarded-host, mais conservera ces
  // deux headers réservés pour la preuve d'origine côté application.
  proxied.headers.delete(ORIGIN_SECRET_HEADER);
  proxied.headers.delete(PUBLIC_HOST_HEADER);
  const secret = originSecret?.trim() ?? "";
  const normalizedPublicHost = publicHost.trim().toLowerCase();
  if (
    request.method === "POST" &&
    ORIGIN_SECRET_PATTERN.test(secret) &&
    PUBLIC_HOSTS.has(normalizedPublicHost)
  ) {
    proxied.headers.set(ORIGIN_SECRET_HEADER, secret);
    proxied.headers.set(PUBLIC_HOST_HEADER, normalizedPublicHost);
  }
  return proxied;
}

// Routeur edge SaaSpasse. Depuis la sortie complète de WeWeb (7 août 2026),
// Next.js est l'origine unique: le Worker conserve seulement le domaine
// public, les redirects historiques et la normalisation des trailing slashes.

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
      const targetBase = redirectTarget.startsWith("http")
        ? redirectTarget
        : `${canonicalDomain}${redirectTarget}`;
      const targetUrl = new URL(targetBase);
      // Les liens historiques circulent encore dans les campagnes et les
      // infolettres. Conserver leurs UTM évite de perdre l'attribution lors du
      // 301 vers la route actuelle.
      for (const [key, value] of url.searchParams) {
        targetUrl.searchParams.append(key, value);
      }
      return Response.redirect(targetUrl.toString(), 301);
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
    const proxied = createOriginRequest(
      request,
      target,
      url.hostname,
      env.SAASPASSE_WORKER_ORIGIN_SECRET
    );
    return fetch(proxied, { redirect: "manual" });
  },
};
