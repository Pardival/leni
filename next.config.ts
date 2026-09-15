import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache client de navigation : une page visitée ou préchargée est réutilisée
  // instantanément pendant 60 s (les mutations appellent router.refresh()).
  experimental: {
    staleTimes: { dynamic: 60, static: 300 },
  },
  // Les migrations SQL sont lues sur disque au démarrage : les inclure dans
  // le bundle des fonctions serverless (Vercel), sinon elles sont absentes.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**"],
  },
};

export default nextConfig;
