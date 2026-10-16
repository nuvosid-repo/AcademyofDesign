// Cloud media storage (Cloudinary).
//
// Images / PDFs / office docs are uploaded to Cloudinary and only the resulting
// URL is kept in MongoDB. That keeps documents tiny (a URL instead of a few MB
// of base64), so list queries stay fast and the database stays small + cheap.
//
// Server-only: the API secret must never reach the browser. If the keys are not
// configured the helpers are no-ops (they return the value unchanged), so the
// app keeps working with inline base64 exactly as before.
import { v2 as cloudinary } from "cloudinary";

const DATA_URL_RE = /^data:([^;]+);base64,/;

export function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

let configured = false;
function ensureConfig() {
  if (!isCloudinaryConfigured()) return false;
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return true;
}

// Pick the Cloudinary resource type from the data URL's MIME type.
// Documents (PDF / office) go to "raw" — "image"-type PDFs are blocked from
// delivery by Cloudinary's default security ACL, while raw files are not.
function resourceTypeFor(mime) {
  if (/^image\//.test(mime)) return "image";
  if (/^video\//.test(mime) || /^audio\//.test(mime)) return "video";
  return "raw"; // application/pdf, spreadsheets, docs, etc.
}

// Upload a single base64 data URL and return its Cloudinary https URL.
// Non-data-URL strings (already-remote URLs, empty strings) are returned as-is.
// On any failure the original value is returned so a save never breaks.
export async function uploadDataUrl(value, { folder = "nuvosid" } = {}) {
  const m = typeof value === "string" ? DATA_URL_RE.exec(value) : null;
  if (!m) return value;
  if (!ensureConfig()) return value;
  const resourceType = resourceTypeFor((m[1] || "").toLowerCase());
  try {
    const res = await cloudinary.uploader.upload(value, {
      folder,
      resource_type: resourceType,
      // Keep the original extension on raw files so browsers get the right type.
      use_filename: resourceType === "raw",
    });
    return res.secure_url || value;
  } catch (e) {
    console.error("Cloudinary upload failed:", e?.message || e);
    return value;
  }
}

// Recursively walk any value (string / array / plain object) and replace every
// base64 data URL it contains with an uploaded Cloudinary URL. Used to offload
// media from a request body or built document right before it is saved — it
// handles nested shapes (course.classes[].materials[].data, question.media, …)
// without the caller having to list each field.
export async function offloadMedia(value, opts = {}) {
  if (!isCloudinaryConfigured()) return value;

  if (typeof value === "string") return uploadDataUrl(value, opts);

  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => offloadMedia(v, opts)));
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [k, await offloadMedia(v, opts)])
    );
    const out = {};
    for (const [k, v] of entries) out[k] = v;
    return out;
  }

  return value; // numbers, booleans, null, Date, Buffer, etc.
}

// Produce a signature so the browser can upload a file (e.g. a large interview
// recording) DIRECTLY to Cloudinary — the file never passes through our server,
// which avoids serverless request-body size limits. The secret only signs the
// params; it never leaves the server. Returns null when keys are not configured.
export function signUpload(paramsToSign = {}) {
  if (!ensureConfig()) return null;
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, ...paramsToSign };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    ...paramsToSign, // e.g. folder — the client must send the SAME values back
  };
}

export { cloudinary };
