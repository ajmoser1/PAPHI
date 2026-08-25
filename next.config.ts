import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";
const supabaseHttpOrigin = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseWsOrigin = supabaseHost ? `wss://${supabaseHost}` : "";

// Next.js hydration/RSC payload scripts and this app's inline style={{}}
// usage (e.g. TenantTheme.tsx's per-chapter branding <style>) require
// 'unsafe-inline'; nonce-based CSP would require forcing dynamic rendering
// on every page, which is a bigger architectural change than this warrants.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: ${supabaseHttpOrigin};
  font-src 'self';
  connect-src 'self' ${supabaseHttpOrigin} ${supabaseWsOrigin};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Avatars are capped at 5MB in uploadAvatar; default Server Action limit is 1MB
  // and oversized bodies throw an uncaught 413 that crashes the page.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
