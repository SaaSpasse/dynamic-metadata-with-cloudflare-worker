export const config = {
  domainSource: "https://60a33b77-84a0-4236-bb01-f71274631596.weweb-preview.io", // Your WeWeb app preview link
  patterns: [
    {
      pattern: "^/avantages/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/avantages/{slug}"
    },
    {
      pattern: "^/canaux-marketing/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/canaux-marketing/{slug}"
    },
    {
      pattern: "^/startups/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/startups/{slug}"
    },
    {
      pattern: "^/blog/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/blog/{slug}"
    },
    {
      pattern: "^/glossaire/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/glossaire/{slug}"
    },
    {
      pattern: "^/industrie/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/industrie/{slug}"
    },
    {
      pattern: "^/lieux/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/lieux/{slug}"
    },
    {
      pattern: "^/partenaires/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/partenaires/{slug}"
    },
    {
      pattern: "^/episode/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/episode/{slug}"
    },
    {
      pattern: "^/tech-stack/[^/]+",
      metaDataEndpoint: "https://qhmbbgerejsxibphinnu.supabase.co/functions/v1/get-meta/tech-stack/{slug}"
    }
  ]
};
