import { config, canonicalDomain, redirects } from '../config.js';

interface Env {
  SUPABASE_KEY: string; // Set this in Cloudflare Worker settings
}

interface Metadata {
  title: string;
  description: string;
  image: string;
  keywords: string;
  structuredData?: Record<string, any> | null;
}

interface PatternConfig {
  pattern: string;
  metaDataEndpoint: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const domainSource = config.domainSource;
    const patterns: PatternConfig[] = config.patterns;

    const url = new URL(request.url);
    const referer = request.headers.get('Referer');

    // --- STRANGLER (migration v3) ---
    // Route les chemins déjà migrés vers le nouveau front Next.js sur Vercel.
    // VAGUE 1 (2026-07-21): job board + répertoire + annuaires — basculés
    // ensemble parce que le header v3 les lie (nav /startups). Le podcast est
    // prêt côté v3 mais reste v2 pour cette vague (mesure par étapes).
    // Rollback instantané = retirer le chemin de V3_ROUTES + wrangler deploy.
    // Le front génère ses URLs absolues depuis une env var (jamais le Host reçu),
    // donc envoyer Host = *.vercel.app au fetch ci-dessous est sans impact SEO.
    const V3_ORIGIN = config.v3Origin; // https://saaspasse-v3.vercel.app (config.js)
    const V3_ROUTES: RegExp[] = [
      /^\/v3-test(\/|$)/,
      /^\/_next\//,
      // Bascule totale du public (19 juil): la home et tout le contenu servent
      // du v3. Seuls auth/ajout-saas/dashboards/admin restent WeWeb (filet).
      /^\/$/,
      /^\/emplois(\/|$)/,
      /^\/emploi\//,
      /^\/startups(\/|$)/,
      /^\/tech-stack\//,
      /^\/industrie\//,
      /^\/lieux\//,
      /^\/avantages\//,
      /^\/canaux-marketing\//,
      /^\/podcast(\/|$)/,
      /^\/episode\//,
      /^\/glossaire-saas(\/|$)/,
      /^\/glossaire\//,
      /^\/blog(\/|$)/,
      /^\/partenaires(\/|$)/,
      /^\/a-propos(\/|$)/,
      /^\/contact(\/|$)/,
      /^\/lajobdumois(\/|$)/,
      // Assets statiques du front v3 (web/public/) — paths exacts, aucun
      // chevauchement avec WeWeb (qui sert son logo sous /images/).
      /^\/wordmark-saaspasse(-light)?\.png$/,
      /^\/paladin-editorial\.webp$/,
      /^\/frank-editorial\.webp$/,
    ];
    if (V3_ORIGIN && V3_ROUTES.some((r) => r.test(url.pathname))) {
      // Les URLs v2 indexées portent un trailing slash (/startups/poka/); les
      // canonicals v3 n'en ont pas → 301 permanent vers la forme canonique.
      if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
        return Response.redirect(
          `${canonicalDomain}${url.pathname.slice(0, -1)}${url.search}`,
          301
        );
      }
      const target = `${V3_ORIGIN}${url.pathname}${url.search}`;
      const proxied = new Request(target, request);
      proxied.headers.set('x-forwarded-host', url.host);
      proxied.headers.set('x-forwarded-proto', 'https');
      return fetch(proxied);
    }
    // --- END STRANGLER ---

    // --- REDIRECTS ---
    const normalizedPath = url.pathname.endsWith('/') && url.pathname !== '/'
      ? url.pathname.slice(0, -1)
      : url.pathname;
    const redirectTarget = (redirects as Record<string, string>)[normalizedPath];
    if (redirectTarget) {
      const target = redirectTarget.startsWith('http')
        ? redirectTarget
        : `${canonicalDomain}${redirectTarget}`;
      return Response.redirect(target, 301);
    }
    // --- END REDIRECTS ---

    // Build canonical URL (always saaspasse.com, with trailing slash)
    const canonicalPath = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
    const canonicalUrl = `${canonicalDomain}${canonicalPath}`;

    // Function to get the pattern configuration that matches the URL
    function getPatternConfig(pathname: string): PatternConfig | null {
      for (const patternConfig of patterns) {
        const regex = new RegExp(patternConfig.pattern);
        const normalizedPath = pathname + (pathname.endsWith('/') ? '' : '/');
        if (regex.test(normalizedPath)) {
          return patternConfig;
        }
      }
      return null;
    }

    // Function to check if the URL matches the page data pattern (For WeWeb app)
    function isPageData(pathname: string): boolean {
      const pattern = /\/public\/data\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.json/;
      return pattern.test(pathname);
    }

    // Function to request metadata from Supabase Edge Function
    async function requestMetadata(pathname: string, metaDataEndpoint: string): Promise<Metadata> {
      const trimmedUrl = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
      const parts = trimmedUrl.split('/');
      const slug = parts[parts.length - 1];

      const placeholderPattern = /{([^}]+)}/;
      const metaDataEndpointWithSlug = metaDataEndpoint.replace(placeholderPattern, slug);

      try {
        const metaDataResponse = await fetch(metaDataEndpointWithSlug, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_KEY}`,
            'apikey': env.SUPABASE_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (!metaDataResponse.ok) {
          console.error(`Error fetching metadata: ${metaDataResponse.status} ${metaDataResponse.statusText}`);
          const errorText = await metaDataResponse.text();
          console.error(`Response body: ${errorText}`);
          // Return default metadata on error
          return {
            title: 'SaaSPasse',
            description: 'Découvrez les meilleures startups SaaS du Québec',
            image: '',
            keywords: ''
          };
        }

        return await metaDataResponse.json();
      } catch (error) {
        console.error('Error in requestMetadata:', error);
        return {
          title: 'SaaSPasse',
          description: 'Découvrez les meilleures startups SaaS du Québec',
          image: '',
          keywords: ''
        };
      }
    }
		
// --- ROBOTS.TXT ---
  if (url.pathname === "/robots.txt") {
    const robotsResponse = await fetch(`${domainSource}/robots.txt`);
    let robotsText = await robotsResponse.text();
    robotsText = robotsText.replaceAll(domainSource, canonicalDomain);
    // WeWeb may still reference the old preview domain in content
    robotsText = robotsText.replaceAll('https://60a33b77-84a0-4236-bb01-f71274631596.weweb-preview.io', canonicalDomain);
    return new Response(robotsText, {
      headers: { "Content-Type": "text/plain" },
    });
  }
  // --- END ROBOTS.TXT ---

// --- SITEMAP ---
  if (url.pathname === "/sitemap.xml") {
    const domain = "https://saaspasse.com";

    // 1. Fetch WeWeb sitemap and replace preview URLs
    const wewebSitemap = await fetch(`${domainSource}/sitemap.xml`);
    let sitemapText = await wewebSitemap.text();
    sitemapText = sitemapText.replaceAll(domainSource, domain);
    // WeWeb may still reference the old preview domain in content
    sitemapText = sitemapText.replaceAll('https://60a33b77-84a0-4236-bb01-f71274631596.weweb-preview.io', domain);
    // Pages statiques migrées v3 (bascule totale 19 juil): canonical SANS
    // trailing slash. La job du mois est retirée (308 → /emplois).
    for (const p of ["podcast", "partenaires", "a-propos", "contact", "blog", "glossaire-saas"]) {
      sitemapText = sitemapText.replaceAll(`<loc>${domain}/${p}/</loc>`, `<loc>${domain}/${p}</loc>`);
    }
    sitemapText = sitemapText.replace(/<url>\s*<loc>[^<]*\/lajobdumois\/?<\/loc>[\s\S]*?<\/url>/g, "");

    // 2. Fetch dynamic paths from Supabase
    // v3: true = route migrée → URL SANS trailing slash (canonical v3).
    // filter = clauses PostgREST additionnelles (gating).
    const tables: { table: string; prefix: string; v3?: boolean; filter?: string }[] = [
      { table: "avantages", prefix: "/avantages", v3: true },
      { table: "canaux_marketing", prefix: "/canaux-marketing", v3: true },
      // published: la v2 listait TOUTES les fiches, dépubliées incluses.
      { table: "companies", prefix: "/startups", v3: true, filter: "published=eq.true" },
      { table: "etudes_de_cas", prefix: "/blog", v3: true },
      { table: "glossaire", prefix: "/glossaire", v3: true },
      { table: "industries", prefix: "/industrie", v3: true },
      { table: "lieux", prefix: "/lieux", v3: true },
      { table: "partenaires", prefix: "/partenaires", v3: true },
      { table: "podcast", prefix: "/episode", v3: true },
      { table: "tech_stack", prefix: "/tech-stack", v3: true },
      // Les offres n'ont JAMAIS été au sitemap (v2 incluse) — 177 pages avec
      // JSON-LD JobPosting invisibles pour Google Jobs sans ça.
      {
        table: "job_board_complete",
        prefix: "/emploi",
        v3: true,
        filter: `deleted_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&company_published=eq.true`,
      },
    ];

    const supabaseUrl = "https://qhmbbgerejsxibphinnu.supabase.co/rest/v1";
    const headers = {
      "apikey": env.SUPABASE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_KEY}`,
    };

    // Tables that use published_at for scheduled publishing
    const scheduledTables = new Set(["podcast", "partenaires"]);

    const allEntries = await Promise.all(
      tables.map(async ({ table, prefix, v3, filter }) => {
        try {
          let query = `${supabaseUrl}/${table}?select=path`;
          if (filter) {
            query += `&${filter}`;
          }
          if (scheduledTables.has(table)) {
            query += `&published_at=lte.${new Date().toISOString()}`;
          }
          const res = await fetch(query, { headers });
          const rows = await res.json();
          const slash = v3 ? "" : "/";
          return rows.map((row) =>
            `<url><loc>${domain}${prefix}/${row.path}${slash}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`
          ).join("\n");
        } catch (e) {
          console.error(`Sitemap error for ${table}:`, e);
          return "";
        }
      })
    );

    // 3. Insert dynamic entries before closing </urlset>
    const dynamicXml = allEntries.join("\n");
    sitemapText = sitemapText.replace("</urlset>", `${dynamicXml}\n</urlset>`);

    return new Response(sitemapText, {
      headers: { "Content-Type": "application/xml" },
    });
  }
  // --- END SITEMAP ---

// --- PHOSPHOR ICON FALLBACK ---
// WeWeb tree-shakes icons at build, only bundling those referenced literally in
// the editor. Icons whose name comes from a Supabase formula/binding are missing
// from /icons/phosphor-*/ on production. Fallback to the official Phosphor CDN.
  const phosphorMatch = url.pathname.match(/^\/icons\/phosphor-(regular|light|bold|fill|thin|duotone)\/(.+)\.svg$/);
  if (phosphorMatch) {
    const [, weight, name] = phosphorMatch;
    const wewebResponse = await fetch(`${domainSource}${url.pathname}`);
    if (wewebResponse.ok) {
      return wewebResponse;
    }
    const fallbackUrl = `https://unpkg.com/@phosphor-icons/core@2.1.1/assets/${weight}/${name}.svg`;
    const fallback = await fetch(fallbackUrl, { cf: { cacheEverything: true, cacheTtl: 31536000 } });
    if (fallback.ok) {
      return new Response(fallback.body, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    return new Response('Icon not found', { status: 404 });
  }
  // --- END PHOSPHOR ICON FALLBACK ---

    // Handle dynamic page requests
    const patternConfig = getPatternConfig(url.pathname);
    if (patternConfig) {
      console.log("Dynamic page detected:", url.pathname);

      const source = await fetch(`${domainSource}${url.pathname}`);
      const metadata = await requestMetadata(url.pathname, patternConfig.metaDataEndpoint);
      console.log("Metadata fetched:", metadata);

      const customHeaderHandler = new CustomHeaderHandler(metadata);
      const structuredDataHandler = new StructuredDataHandler(metadata);
      const canonicalHandler = new CanonicalHandler(canonicalUrl);
      const hreflangHandler = new HreflangHandler(domainSource, canonicalUrl);

      return new HTMLRewriter()
        .on('*', customHeaderHandler)
        .on('head', structuredDataHandler)
        .on('head', canonicalHandler)
        .on('link[rel="alternate"]', hreflangHandler)
        .transform(source);

    // Handle page data requests for the WeWeb app
    } else if (isPageData(url.pathname)) {
      console.log("Page data detected:", url.pathname);
      console.log("Referer:", referer);

      const sourceResponse = await fetch(`${domainSource}${url.pathname}`);
      let sourceData = await sourceResponse.json() as any;

      let pathname = referer;
      pathname = pathname ? pathname + (pathname.endsWith('/') ? '' : '/') : null;
      
      if (pathname !== null) {
        const patternConfigForPageData = getPatternConfig(new URL(pathname).pathname);
        if (patternConfigForPageData) {
          const metadata = await requestMetadata(new URL(pathname).pathname, patternConfigForPageData.metaDataEndpoint);
          console.log("Metadata fetched for page data:", metadata);

          // Ensure nested objects exist
          sourceData.page = sourceData.page || {};
          sourceData.page.title = sourceData.page.title || {};
          sourceData.page.meta = sourceData.page.meta || {};
          sourceData.page.meta.desc = sourceData.page.meta.desc || {};
          sourceData.page.meta.keywords = sourceData.page.meta.keywords || {};
          sourceData.page.socialTitle = sourceData.page.socialTitle || {};
          sourceData.page.socialDesc = sourceData.page.socialDesc || {};

          // Update source data with fetched metadata
          if (metadata.title) {
            sourceData.page.title.en = metadata.title;
            sourceData.page.title.fr = metadata.title;
            sourceData.page.socialTitle.en = metadata.title;
            sourceData.page.socialTitle.fr = metadata.title;
          }
          if (metadata.description) {
            sourceData.page.meta.desc.en = metadata.description;
            sourceData.page.meta.desc.fr = metadata.description;
            sourceData.page.socialDesc.en = metadata.description;
            sourceData.page.socialDesc.fr = metadata.description;
          }
          if (metadata.image) {
            sourceData.page.metaImage = metadata.image;
          }
          if (metadata.keywords) {
            sourceData.page.meta.keywords.en = metadata.keywords;
            sourceData.page.meta.keywords.fr = metadata.keywords;
          }

          return new Response(JSON.stringify(sourceData), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // If no patterns match, fetch and return original content
    console.log("Fetching original content for:", url.pathname);
    const sourceUrl = `${domainSource}${url.pathname}${url.search}`;
    const response = await fetch(sourceUrl);

    // Inject canonical + fix hreflang in HTML responses (static pages)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new HTMLRewriter()
        .on('head', new CanonicalHandler(canonicalUrl))
        .on('link[rel="alternate"]', new HreflangHandler(domainSource, canonicalUrl))
        .transform(response);
    }

    return response;
  }
};

// CustomHeaderHandler class to modify HTML content
class CustomHeaderHandler {
  private metadata: Metadata;

  constructor(metadata: Metadata) {
    this.metadata = metadata;
  }

  element(element: Element) {
    // Replace <title> tag content
    if (element.tagName === "title") {
      element.setInnerContent(this.metadata.title);
    }

    // Replace meta tags content
    if (element.tagName === "meta") {
      const name = element.getAttribute("name");
      const property = element.getAttribute("property");
      const itemprop = element.getAttribute("itemprop");

      // Handle name attribute
      if (name) {
        switch (name) {
          case "title":
            element.setAttribute("content", this.metadata.title);
            break;
          case "description":
            element.setAttribute("content", this.metadata.description);
            break;
          case "image":
            element.setAttribute("content", this.metadata.image);
            break;
          case "keywords":
            element.setAttribute("content", this.metadata.keywords);
            break;
          case "twitter:title":
            element.setAttribute("content", this.metadata.title);
            break;
          case "twitter:description":
            element.setAttribute("content", this.metadata.description);
            break;
          case "twitter:image":
            element.setAttribute("content", this.metadata.image);
            break;
        }
      }

      // Handle itemprop attribute
      if (itemprop) {
        switch (itemprop) {
          case "name":
            element.setAttribute("content", this.metadata.title);
            break;
          case "description":
            element.setAttribute("content", this.metadata.description);
            break;
          case "image":
            element.setAttribute("content", this.metadata.image);
            break;
        }
      }

      // Handle property attribute (OpenGraph)
      if (property) {
        switch (property) {
          case "og:title":
            element.setAttribute("content", this.metadata.title);
            break;
          case "og:description":
            element.setAttribute("content", this.metadata.description);
            break;
          case "og:image":
            element.setAttribute("content", this.metadata.image);
            break;
        }
      }
    }
  }
}

// HreflangHandler class to fix hreflang URLs (replace preview domain and :param placeholder)
class HreflangHandler {
  private domainSource: string;
  private canonicalUrl: string;

  constructor(domainSource: string, canonicalUrl: string) {
    this.domainSource = domainSource;
    this.canonicalUrl = canonicalUrl;
  }

  element(element: Element) {
    const href = element.getAttribute('href');
    if (href && (href.includes('weweb-preview.io') || href.includes('production.weweb.io'))) {
      if (href.includes(':param')) {
        // Dynamic page: replace entire href with the canonical URL
        element.setAttribute('href', this.canonicalUrl);
      } else {
        // Static page: just swap the domain
        element.setAttribute('href', href.replace(/https:\/\/[^/]*(?:weweb-preview\.io|production\.weweb\.io)/, canonicalDomain));
      }
    }
  }
}

// CanonicalHandler class to inject <link rel="canonical"> into <head>
class CanonicalHandler {
  private canonicalUrl: string;

  constructor(canonicalUrl: string) {
    this.canonicalUrl = canonicalUrl;
  }

  element(element: Element) {
    element.append(`<link rel="canonical" href="${this.canonicalUrl}" />`, { html: true });
  }
}

// StructuredDataHandler class to inject JSON-LD into <head>
class StructuredDataHandler {
  private metadata: Metadata;

  constructor(metadata: Metadata) {
    this.metadata = metadata;
  }

  element(element: Element) {
    if (this.metadata.structuredData) {
      const jsonLd = JSON.stringify(this.metadata.structuredData);
      element.append(`<script type="application/ld+json">${jsonLd}</script>`, { html: true });
    }
  }
}
