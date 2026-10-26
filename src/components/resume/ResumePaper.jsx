// A4 resume renderer — the SAME component drives the live preview and the PDF/
// print export, so "what you see = what you get". The paper is always light
// (never themed), with four ATS-friendly templates. Pure render, no hooks.
import { SECTION_KEYS, SECTION_LABELS } from "@/lib/resume/disciplines";
import { cldUrl } from "@/lib/cldImage";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMonth(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || "");
  if (!m) return ym || "";
  return `${MONTHS[+m[2]] || ""} ${m[1]}`.trim();
}
const range = (a, b) => [fmtMonth(a), b ? fmtMonth(b) : (a ? "Present" : "")].filter(Boolean).join(" – ");
const hasText = (s) => !!(s && String(s).trim());

export default function ResumePaper({ data, scale = 1 }) {
  if (!data) return null;
  const b = data.basics || {};
  const loc = b.location || {};
  const accent = data.accentColor || "#db254f";
  const template = data.template || "minimal";
  const serif = template === "classic";
  const grid = template === "grid_portfolio";

  const locStr = [loc.city, loc.state].filter(Boolean).join(", ");
  const contacts = [
    hasText(b.email) && b.email,
    hasText(b.phone) && b.phone,
    hasText(locStr) && locStr,
    hasText(b.portfolioUrl) && b.portfolioUrl.replace(/^https?:\/\//, ""),
  ].filter(Boolean);

  const visible = (data.sectionOrder || SECTION_KEYS).filter((s) => !(data.hiddenSections || []).includes(s));

  // ── section renderers ──
  const S = {
    projects: () => {
      const items = (data.projects || []).filter((p) => hasText(p.title));
      if (!items.length) return null;
      return (
        <Section key="projects" title={SECTION_LABELS.projects} accent={accent} serif={serif}>
          <div style={grid ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } : undefined}>
            {items.map((p) => (
              <div key={p.id} style={{ marginBottom: 10, breakInside: "avoid" }}>
                {grid && hasText(p.coverImageUrl) && (
                  <img src={cldUrl(p.coverImageUrl, { width: 500 })} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 6, marginBottom: 6, border: "1px solid #eee" }} />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{p.title}</span>
                  <span style={{ color: "#888", fontSize: 11, whiteSpace: "nowrap" }}>{[p.type, p.date].filter(Boolean).join(" · ")}</span>
                </div>
                {(hasText(p.role) || p.tools?.length) && <div style={{ fontSize: 11.5, color: accent, marginTop: 1 }}>{[p.role, (p.tools || []).join(", ")].filter(Boolean).join(" — ")}</div>}
                {hasText(p.brief) && <div style={{ fontSize: 12, color: "#444", marginTop: 3 }}>{p.brief}</div>}
                <Bullets items={p.highlights} />
                {hasText(p.link) && <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>↗ {p.link.replace(/^https?:\/\//, "")}</div>}
              </div>
            ))}
          </div>
        </Section>
      );
    },
    experience: () => {
      const items = (data.experience || []).filter((x) => hasText(x.organization) || hasText(x.position));
      if (!items.length) return null;
      return (
        <Section key="experience" title={SECTION_LABELS.experience} accent={accent} serif={serif}>
          {items.map((x) => (
            <div key={x.id} style={{ marginBottom: 9, breakInside: "avoid" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{x.position}{hasText(x.organization) ? ` · ${x.organization}` : ""}</span>
                <span style={{ color: "#888", fontSize: 11, whiteSpace: "nowrap" }}>{range(x.startDate, x.endDate)}</span>
              </div>
              {(hasText(x.employmentType) || hasText(x.location)) && <div style={{ fontSize: 11.5, color: "#666" }}>{[x.employmentType, x.location].filter(Boolean).join(" · ")}</div>}
              <Bullets items={x.highlights} />
            </div>
          ))}
        </Section>
      );
    },
    education: () => {
      const items = (data.education || []).filter((e) => hasText(e.institution) || hasText(e.program));
      if (!items.length) return null;
      return (
        <Section key="education" title={SECTION_LABELS.education} accent={accent} serif={serif}>
          {items.map((e) => (
            <div key={e.id} style={{ marginBottom: 8, breakInside: "avoid" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{e.program || e.studyType}</span>
                <span style={{ color: "#888", fontSize: 11, whiteSpace: "nowrap" }}>{range(e.startDate, e.endDate)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>{[e.institution, e.score?.value].filter(Boolean).join(" · ")}</div>
              <Bullets items={e.highlights} />
            </div>
          ))}
        </Section>
      );
    },
    skills: () => {
      const items = (data.skills || []).filter((s) => s.items?.length);
      if (!items.length) return null;
      return (
        <Section key="skills" title={SECTION_LABELS.skills} accent={accent} serif={serif}>
          {items.map((s) => (
            <div key={s.id} style={{ marginBottom: 5 }}>
              {hasText(s.category) && <span style={{ fontWeight: 600, fontSize: 12 }}>{s.category}: </span>}
              <span style={{ fontSize: 12, color: "#444" }}>{s.items.join(" · ")}</span>
            </div>
          ))}
        </Section>
      );
    },
    software: () => {
      const items = (data.software || []).filter((s) => hasText(s.name));
      if (!items.length) return null;
      return (
        <Section key="software" title={SECTION_LABELS.software} accent={accent} serif={serif}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {items.map((s, i) => (
              <span key={i} style={{ fontSize: 11.5, background: "#f4f4f5", borderRadius: 5, padding: "2px 8px" }}>{s.name}{s.level ? ` · ${s.level}` : ""}</span>
            ))}
          </div>
        </Section>
      );
    },
    certifications: () => listSection("certifications", data.certifications, (c) => ({ left: c.name, sub: c.issuer, right: c.date }), accent, serif),
    awards: () => listSection("awards", data.awards, (a) => ({ left: a.title, sub: a.awarder, right: a.date, note: a.summary }), accent, serif),
    exhibitions: () => listSection("exhibitions", data.exhibitions, (e) => ({ left: e.title, sub: e.venue, right: e.date, note: e.summary }), accent, serif),
    workshops: () => listSection("workshops", data.workshops, (w) => ({ left: w.title, sub: w.organizer, right: w.date }), accent, serif),
    languages: () => {
      const items = (data.languages || []).filter((l) => hasText(l.language));
      if (!items.length) return null;
      return <Section key="languages" title={SECTION_LABELS.languages} accent={accent} serif={serif}><div style={{ fontSize: 12, color: "#444" }}>{items.map((l) => `${l.language} (${l.fluency})`).join(" · ")}</div></Section>;
    },
    interests: () => {
      const items = (data.interests || []).filter(Boolean);
      if (!items.length) return null;
      return <Section key="interests" title={SECTION_LABELS.interests} accent={accent} serif={serif}><div style={{ fontSize: 12, color: "#444" }}>{items.join(" · ")}</div></Section>;
    },
  };

  // For grid_portfolio, projects span the full width on top; the rest splits.
  const body = visible.map((k) => S[k] && S[k]()).filter(Boolean);

  return (
    <div style={{ transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}>
      <div style={{
        width: 794, minHeight: 1123, background: "#fff", color: "#1a1a1a", padding: "44px 48px",
        fontFamily: serif ? "Georgia, 'Times New Roman', serif" : "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        lineHeight: 1.5, boxSizing: "border-box",
      }}>
        {/* ── Header ── */}
        <div style={template === "editorial" ? { borderLeft: `5px solid ${accent}`, paddingLeft: 14 } : undefined}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{b.name || "Your Name"}</h1>
              {hasText(b.headline) && <div style={{ color: accent, fontWeight: 600, fontSize: 14, marginTop: 2 }}>{b.headline}</div>}
            </div>
            {hasText(b.photoUrl) && <img src={cldUrl(b.photoUrl, { width: 200 })} alt="" loading="lazy" decoding="async" style={{ width: 74, height: 74, borderRadius: template === "classic" ? 6 : "50%", objectFit: "cover", border: "2px solid #eee" }} />}
          </div>
          {contacts.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: "#555", marginTop: 7 }}>{contacts.map((c, i) => <span key={i}>{c}</span>)}</div>}
          {(b.profiles || []).filter((p) => hasText(p.url)).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11.5, color: accent, marginTop: 3 }}>
              {b.profiles.filter((p) => hasText(p.url)).map((p, i) => <span key={i}>{p.network}: {p.url.replace(/^https?:\/\//, "")}</span>)}
            </div>
          )}
        </div>

        {hasText(b.summary) && <Section title="Summary" accent={accent} serif={serif}><div style={{ fontSize: 12.5, color: "#444", margin: 0 }}>{b.summary}</div></Section>}

        {body}
      </div>
    </div>
  );
}

function Section({ title, accent, serif, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h2 style={{
        fontSize: 12, textTransform: "uppercase", letterSpacing: "0.09em", color: accent, fontWeight: 700,
        borderBottom: `2px solid ${accent}22`, paddingBottom: 3, margin: "0 0 7px", fontFamily: serif ? "Georgia, serif" : "inherit",
      }}>{title}</h2>
      {children}
    </div>
  );
}

function Bullets({ items }) {
  const list = (items || []).filter((x) => x && x.trim());
  if (!list.length) return null;
  return (
    <ul style={{ margin: "3px 0 0", paddingLeft: 16 }}>
      {list.map((t, i) => <li key={i} style={{ fontSize: 12, color: "#444", marginBottom: 1 }}>{t}</li>)}
    </ul>
  );
}

function listSection(key, arr, map, accent, serif) {
  const items = (arr || []).filter((x) => hasText(x.title || x.name));
  if (!items.length) return null;
  return (
    <Section key={key} title={SECTION_LABELS[key]} accent={accent} serif={serif}>
      {items.map((raw, i) => {
        const m = map(raw);
        return (
          <div key={i} style={{ marginBottom: 5, breakInside: "avoid" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 12.5 }}><b>{m.left}</b>{hasText(m.sub) ? ` · ${m.sub}` : ""}</span>
              {hasText(m.right) && <span style={{ color: "#888", fontSize: 11, whiteSpace: "nowrap" }}>{m.right}</span>}
            </div>
            {hasText(m.note) && <div style={{ fontSize: 11.5, color: "#666" }}>{m.note}</div>}
          </div>
        );
      })}
    </Section>
  );
}
