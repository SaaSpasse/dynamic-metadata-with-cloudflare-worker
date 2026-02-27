export const canonicalDomain = "https://saaspasse.com";

export const redirects = {
  "/certification-employeur-certifie": "/certification-employeur",
  "/episode/episode-12-live---charles-ouellet--snipcart-au-passe-present-futur": "/episode/episode-12-live-charles-ouellet-snipcart-au-passe-present-futur",
  "/ajoute-ton-saas": "/ajout-saas",
  "/episode/episode-8-emilie-carignan--gerer-des-humains-projets-et-changements": "/episode/episode-8-emilie-carignan-gerer-des-humains-projets-et-changements",
  "/episode/episode-4-antoine-meunier--athlete-nomade-fondateur-batisseur": "/episode/episode-4-antoine-meunier-athlete-nomade-fondateur-batisseur",
  "/episode/episode-3-julie-simard--lean-uiux": "/episode/episode-3-julie-simard-lean-ui-ux",
  "/episode/episode-6-jean-christophe-dube--financement-produit-vs-service-saas-ai": "/episode/episode-6-jean-christophe-dube-financement-produit-vs-service-saas-ai",
  "/episode/episode-13-isaac-souweine--ai--saas-vertical": "/episode/episode-13-isaac-souweine-ai-saas-vertical",
  "/episode/episode-16-stephane-guerin--12-annees-de-saas": "/episode/episode-16-stephane-guerin-12-annees-de-saas",
  "/episode/episode-10-mathieu-dumont--acquisitions--leadership": "/episode/episode-10-mathieu-dumont-acquisitions-leadership",
  "/jameo": "/partenaires/jameo",
  "/modif-saas-new": "/modif-saas",
  "/episode/episode-29-reset-refact-reshapeup": "/episode/episode-29-vieux-codebase-renover-ou-rebatir",
  "/episode/episode-20-julien-gobeil-simard--croissance--innovation": "/episode/episode-20-julien-gobeil-simard-croissance-innovation",
  "/retraites": "https://gamma.app/public/SaaSpasse-au-chalet-Retraites-privees-2024-6pkexpsl9ysvxqj",
  "/startups/fa": "/startups/fanstories",
  "/saas-emplois": "/emplois",
  "/episode/episode-14-matthieu-chartier--science-as-a-service": "/episode/episode-14-matthieu-chartier-science-as-a-service",
  "/episode/episode-18-antoine-bisson--moderniser-lusine": "/episode/episode-18-antoine-bisson-moderniser-lusine",
  "/glossaire": "/glossaire-saas",
  "/partenaires/coveo": "/partenaires",
  "/episode/episode-50-francois-xavier-ratte-de-saas-a-mars": "/podcast",
  "/emploi/dev-front-end-full-stack": "/emploi/sofistic-ai-dev-front-end-full-stack",
};

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
