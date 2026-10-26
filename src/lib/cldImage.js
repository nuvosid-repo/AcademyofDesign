// Client-safe Cloudinary image optimizer (pure string helper — no secrets, no
// server-only deps, so it is safe to import from client components).
//
// Rewrites a Cloudinary delivery URL so Cloudinary serves an auto-selected
// modern format (WebP / AVIF, per the browser) at automatic quality, and —
// when a display width is given — caps the pixels so a small thumbnail never
// downloads a full-size original. Non-Cloudinary values (base64 data URLs,
// external URLs, local /public paths, empty) are returned unchanged, so it is
// always safe to wrap any <img src>.
//
//   cldUrl(url)                 → f_auto,q_auto
//   cldUrl(url, { width: 400 }) → f_auto,q_auto,w_400,c_limit
export function cldUrl(url, opts = {}) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url; // not an image delivery URL (e.g. raw/video)
  const insertAt = i + marker.length;
  const rest = url.slice(insertAt);
  if (rest.startsWith("f_auto") || rest.includes("f_auto,")) return url; // already optimized
  const t = ["f_auto", "q_auto"];
  if (opts.width) t.push(`w_${opts.width}`, "c_limit");
  if (opts.height) t.push(`h_${opts.height}`, "c_limit");
  return url.slice(0, insertAt) + t.join(",") + "/" + rest;
}
