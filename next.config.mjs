/** @type {import('next').NextConfig} */

// Static security headers applied to every response. CSP is set per-request in
// middleware.js (it needs a fresh nonce each load), so it is intentionally not
// listed here.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains. Only takes effect over TLS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Stop browsers from MIME-sniffing a response away from its declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (paths, query) to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site needs no camera, microphone or location (the packing scanner moved
  // to the ERP with the admin panel).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// Where product, category and banner images come from: the brand ERP's public
// `/media/` path (or a CDN in front of it). Read when the app is built, so a
// Docker build passes it as a build argument (see Dockerfile).
const mediaPatterns = (process.env.ERP_MEDIA_ORIGINS || "https://erp.orvo.bd")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    const url = new URL(origin);
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/media/**",
    };
  });

const nextConfig = {
  // A self-contained server (`node server.js`) for the Docker image.
  output: "standalone",

  // Don't advertise the framework/version to attackers.
  poweredByHeader: false,

    // sharp loads its native library (@img/sharp-libvips-*) at run time, so the
    // standalone output's file tracing leaves it out and sharp cannot start in
    // the image: bring the platform's @img packages along. Used by the share
    // pictures (lib/og.js) and the image optimiser.
  outputFileTracingIncludes: { "**": ["./node_modules/@img/**/*"] },

  images: {
    // ERP image URLs are content-addressed (a new upload is a new file id), so
    // the optimized output is effectively immutable. (1 year.) The same holds
    // for this site's own public/ pictures: the server's optimiser cache (a
    // volume that outlives deploys) and browsers keep a resized copy for a year,
    // so a changed picture needs a new file name, never the old one overwritten.
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    // WebP only: the fast sweet spot (the ERP already serves WebP sizes).
    formats: ["image/webp"],
    remotePatterns: [
      ...mediaPatterns,
      // The hero's placeholder slides, shown until staff upload their own.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      // Google profile pictures of shoppers who sign in with Google.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
