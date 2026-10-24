import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function extractJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const s = body.indexOf("{");
  const e = body.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(body.slice(s, e + 1)); } catch { return null; }
}

// ── POST /api/student/resume/parse ───────────────────────────────────────────
// Accepts: multipart/form-data with field "file" (PDF or image)
// Returns: { parsed: ResumeData-compatible object }

export async function POST(request) {
  // Auth guard
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Anthropic must be configured
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI parsing is not configured on this server. Please fill in your resume manually." },
      { status: 503 }
    );
  }

  // Parse the multipart body
  let fileBuffer, mimeType;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];
    mimeType = file.type || "application/pdf";
    if (!allowed.includes(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or image (PNG / JPG / WEBP)." },
        { status: 415 }
      );
    }
    const arrayBuf = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuf);

    // 5 MB hard limit (Claude vision supports up to ~20MB but keep it lean)
    if (fileBuffer.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 413 });
    }
  } catch (err) {
    console.error("[resume/parse] form parse error:", err);
    return NextResponse.json({ error: "Could not read the uploaded file." }, { status: 400 });
  }

  // Build the Claude prompt
  const system = `You are a resume parser. Extract every piece of information from the provided resume document and return it as a single JSON object that exactly matches the following schema. Return ONLY valid JSON, no prose, no markdown fences.

Schema:
{
  "basics": {
    "name": string,
    "headline": string,          // job title / desired role
    "email": string,
    "phone": string,
    "summary": string,
    "portfolioUrl": string,
    "location": { "city": string, "state": string, "country": string },
    "profiles": [{ "network": string, "url": string }]
  },
  "education": [{
    "institution": string,
    "program": string,
    "studyType": string,         // Certificate | Diploma | B.Des | M.Des | B.Voc | Other
    "startDate": string,         // YYYY-MM or ""
    "endDate": string,
    "score": { "system": "PERCENTAGE", "value": string } | null,
    "highlights": [string]
  }],
  "experience": [{
    "organization": string,
    "position": string,
    "employmentType": string,    // Internship | Full-time | Part-time | Freelance | Apprenticeship
    "location": string,
    "startDate": string,
    "endDate": string,
    "highlights": [string]       // bullet points / responsibilities
  }],
  "projects": [{
    "title": string,
    "type": string,              // Academic | Client | Personal | Competition | Internship
    "role": string,
    "date": string,
    "tools": [string],
    "brief": string,
    "highlights": [string],
    "link": string
  }],
  "skills": [{
    "category": string,
    "items": [string]
  }],
  "software": [{ "name": string, "level": string }],  // level: Beginner | Intermediate | Advanced
  "certifications": [{ "name": string, "issuer": string, "date": string, "url": string }],
  "awards": [{ "title": string, "awarder": string, "date": string, "summary": string }],
  "exhibitions": [{ "title": string, "venue": string, "date": string, "summary": string }],
  "workshops": [{ "title": string, "organizer": string, "date": string }],
  "languages": [{ "language": string, "fluency": string }]
}

Rules:
- Use empty string "" for missing text fields.
- Use empty array [] for missing list fields.
- Dates must be YYYY-MM format if possible; otherwise use the text as-is or "".
- For skills, group them into meaningful categories (e.g., "Design Skills", "Technical Skills", "Soft Skills").
- For software, infer proficiency level from context if possible; default to "Intermediate".
- Separate clearly between experience (paid work) and projects (academic / personal / freelance portfolio).
- Do not invent information not present in the resume.`;

  const userText = "Parse the attached resume and return the structured JSON.";

  // Build the content array based on MIME type
  let messageContent;
  if (mimeType === "application/pdf") {
    messageContent = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: fileBuffer.toString("base64"),
        },
      },
      { type: "text", text: userText },
    ];
  } else {
    // image
    const imageMediaType = mimeType; // image/png | image/jpeg | image/webp | image/gif
    messageContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: imageMediaType,
          data: fileBuffer.toString("base64"),
        },
      },
      { type: "text", text: userText },
    ];
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-5";

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: messageContent }],
    });

    const rawText = (response.content || []).map((c) => c.text || "").join("");
    const parsed = extractJSON(rawText);

    if (!parsed) {
      console.error("[resume/parse] Claude returned non-JSON:\n", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "AI could not extract structured data from your resume. Try a clearer image or PDF." },
        { status: 422 }
      );
    }

    return NextResponse.json({ parsed });
  } catch (err) {
    console.error("[resume/parse] Claude error:", err);
    return NextResponse.json(
      { error: "AI parsing failed. Please try again or fill in your resume manually." },
      { status: 500 }
    );
  }
}
