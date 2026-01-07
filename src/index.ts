import { config } from './config.js';

interface Env {
  SUPABASE_KEY: string; // Set this in Cloudflare Worker settings
}

interface Metadata {
  title: string;
  description: string;
  image: string;
  keywords: string;
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

    // Handle dynamic page requests
    const patternConfig = getPatternConfig(url.pathname);
    if (patternConfig) {
      console.log("Dynamic page detected:", url.pathname);

      const source = await fetch(`${domainSource}${url.pathname}`);
      const metadata = await requestMetadata(url.pathname, patternConfig.metaDataEndpoint);
      console.log("Metadata fetched:", metadata);

      const customHeaderHandler = new CustomHeaderHandler(metadata);

      return new HTMLRewriter()
        .on('*', customHeaderHandler)
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
    const sourceUrl = new URL(`${domainSource}${url.pathname}`);
    const sourceRequest = new Request(sourceUrl.toString(), request);
    return await fetch(sourceRequest);
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
