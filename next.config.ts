import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les migrations SQL sont lues sur disque au démarrage : les inclure dans
  // le bundle des fonctions serverless (Vercel), sinon elles sont absentes.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**"],
  },
};

export default nextConfig;
