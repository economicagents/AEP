import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      { source: "/llm.txt", destination: "/llms.txt", permanent: true },
      { source: "/docs/quickstart", destination: "/docs/getting-started/quickstart", permanent: true },
      { source: "/docs/cookbook", destination: "/docs/guides/cookbook", permanent: true },
      { source: "/docs/deployment", destination: "/docs/guides/deployment", permanent: true },
      { source: "/docs/architecture", destination: "/docs/reference/architecture", permanent: true },
      { source: "/docs/threat-model", destination: "/docs/reference/threat-model", permanent: true },
      { source: "/docs/api", destination: "/docs/reference/rest-api", permanent: true },
    ];
  },
};

export default nextConfig;

// Initialize Cloudflare adapter for local development only
if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare"); // eslint-disable-line @typescript-eslint/no-require-imports -- sync init required by Next.js config
  initOpenNextCloudflareForDev();
}
