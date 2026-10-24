import { apiFetch } from "./api";

// Upload a Blob straight from the browser to Cloudinary using a signed request
// (the file never passes through our server, so large videos are fine). Returns
// the secure URL, or "" when cloud storage isn't configured / upload fails.
export async function uploadBlob(blob, { folder = "nuvosid/exams", resourceType = "video", filename = "file" } = {}) {
  try {
    const signRes = await apiFetch("/api/cloudinary/sign", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder }),
    });
    if (!signRes.ok) return "";
    const sign = await signRes.json();
    if (!sign?.configured || !sign?.signature) return "";
    const form = new FormData();
    form.append("file", blob, filename);
    form.append("api_key", sign.apiKey);
    form.append("timestamp", sign.timestamp);
    form.append("signature", sign.signature);
    form.append("folder", sign.folder);
    const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/${resourceType}/upload`, { method: "POST", body: form });
    const data = await up.json();
    return data.secure_url || "";
  } catch {
    return "";
  }
}
