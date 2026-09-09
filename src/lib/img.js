import sharp from "sharp";
import { NextResponse } from "next/server";

const CACHE = "public, max-age=86400, immutable";

// Serve an image (stored as a base64 data URL) resized + converted to WebP for
// fast, light delivery. Falls back to the original bytes if processing fails,
// and redirects if the stored value is a remote URL instead of a data URL.
export async function serveImage(src, { width, quality = 78 } = {}) {
  if (!src) return NextResponse.json({ error: "No image" }, { status: 404 });
  const m = /^data:([^;]+);base64,(.*)$/s.exec(src);
  if (!m) return NextResponse.redirect(src); // remote URL

  const input = Buffer.from(m[2], "base64");
  try {
    let s = sharp(input).rotate();
    if (width) s = s.resize({ width, withoutEnlargement: true });
    const out = await s.webp({ quality }).toBuffer();
    return new Response(out, { headers: { "Content-Type": "image/webp", "Cache-Control": CACHE } });
  } catch {
    return new Response(input, { headers: { "Content-Type": m[1], "Cache-Control": CACHE } });
  }
}
