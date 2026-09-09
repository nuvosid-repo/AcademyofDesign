/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-rendered (SSR) build so the app can use Route Handlers (app/api),
  // middleware, and dynamic auth for the student & admin portals.
  // (Static export was removed to enable these server features.)

  // Image Optimizer stays disabled to avoid a native `sharp` dependency;
  // remove this if you want optimized images and add `sharp`.
  images: {
    unoptimized: true,
  },

  // Emit clean folder URLs with a trailing slash (kept from the old config
  // so existing links/behaviour stay identical).
  trailingSlash: true,
};

export default nextConfig;
