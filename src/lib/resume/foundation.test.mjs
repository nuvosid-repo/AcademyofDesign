// Foundation tests for the Resume Builder — zero-dep, run with:
//   node --test src/lib/resume/foundation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { DISCIPLINES, DISCIPLINE_IDS, getDiscipline, disciplineFromCourse, allSkills, SECTION_KEYS } from "./disciplines.js";
import { cleanResumeData, blankResumeData, deriveFlatMirror, dedupe, isValidPhoneIN, isValidEmail, TEMPLATE_IDS } from "./schema.js";
import { getStarterSample, SAMPLE_IDS } from "./samples.js";

const norm = (o) => JSON.parse(JSON.stringify(o)); // drop undefined for deepEqual

test("8 disciplines, unique ids, required keys", () => {
  assert.equal(DISCIPLINES.length, 8);
  assert.equal(new Set(DISCIPLINE_IDS).size, 8);
  for (const d of DISCIPLINES) {
    for (const k of ["id", "label", "icon", "suggestedRoleTitles", "summaryPlaceholder", "skillCategories", "software", "actionVerbs", "impactSignals", "recommendedSections", "defaultTemplate"]) {
      assert.ok(d[k] != null, `${d.id} missing ${k}`);
    }
    assert.ok(TEMPLATE_IDS.includes(d.defaultTemplate), `${d.id} bad template`);
    assert.ok(d.skillCategories.length >= 1 && d.skillCategories.every((c) => c.skills.length >= 1), `${d.id} empty skills`);
    assert.ok(d.recommendedSections.every((s) => SECTION_KEYS.includes(s)), `${d.id} bad section`);
  }
});

test("getDiscipline falls back to custom; course mapping works", () => {
  assert.equal(getDiscipline("nope").id, "custom");
  assert.equal(disciplineFromCourse("Diploma in Interior Design"), "interior_design");
  assert.equal(disciplineFromCourse("UI/UX & Interaction"), "ui_ux_design");
  assert.equal(disciplineFromCourse(""), "");
  assert.ok(allSkills("interior_design").length >= 10);
});

test("cleanResumeData bounds, dedupes, rejects bad enums, fills section order", () => {
  const dirty = {
    discipline: "hacker", template: "zzz", accentColor: "red",
    basics: { name: "  Aanya  ", email: "x@y.com", phone: "+91 98765-43210", profiles: [{ network: "LinkedIn", url: "https://x" }] },
    skills: [{ category: "Core", items: ["AutoCAD", "autocad", "SketchUp"] }],
    projects: Array.from({ length: 50 }, (_, i) => ({ title: "P" + i })),
    sectionOrder: ["projects", "ghost"],
  };
  const c = cleanResumeData(dirty);
  assert.equal(c.discipline, "interior_design"); // bad id → default
  assert.equal(c.template, "minimal");           // bad template → default
  assert.equal(c.accentColor, "#db254f");        // bad color → default
  assert.equal(c.basics.name, "Aanya");          // trimmed
  assert.equal(c.basics.phone, "+919876543210"); // normalized
  assert.deepEqual(c.skills[0].items, ["AutoCAD", "SketchUp"]); // deduped (case-insensitive)
  assert.ok(c.projects.length <= 20);            // capped
  assert.ok(c.sectionOrder.includes("experience")); // missing sections appended
  assert.ok(!c.sectionOrder.includes("ghost"));  // unknown section dropped
  for (const p of c.projects) assert.ok(p.id);   // ids assigned
});

test("cleanResumeData is idempotent", () => {
  const once = cleanResumeData(getStarterSample("fashion_design"));
  const twice = cleanResumeData(once);
  assert.deepEqual(norm(twice), norm(once));
});

test("blankResumeData is valid and empty of content", () => {
  const b = blankResumeData("ui_ux_design", { name: "Kabir" });
  assert.equal(b.discipline, "ui_ux_design");
  assert.equal(b.basics.name, "Kabir");
  assert.equal(b.projects.length, 0);
  assert.ok(b.sectionOrder.length === SECTION_KEYS.length);
});

test("every starter sample is well-formed", () => {
  assert.equal(SAMPLE_IDS.length, 8);
  for (const id of SAMPLE_IDS) {
    const s = getStarterSample(id);
    assert.equal(s.discipline, id);
    assert.ok(s.basics.name && isValidEmail(s.basics.email) && isValidPhoneIN(s.basics.phone), `${id} bad basics`);
    assert.ok(s.education.length >= 1 && s.projects.length >= 1, `${id} missing content`);
    assert.ok(s.education[0].institution.includes("NUVOSID"), `${id} not NUVOSID`);
  }
});

test("deriveFlatMirror maps data → legacy fields", () => {
  const s = getStarterSample("interior_design");
  const m = deriveFlatMirror(s);
  assert.equal(m.name, "Aanya Mehta");
  assert.ok(m.skills.includes("AutoCAD"));
  assert.ok(m.education[0].school.includes("NUVOSID"));
  assert.ok(m.experience[0].role);
});

test("dedupe + validators", () => {
  assert.deepEqual(dedupe(["Figma", "figma", " Figma ", "Maze"]), ["Figma", "Maze"]);
  assert.ok(isValidPhoneIN("9876543210") && isValidPhoneIN("+919876543210"));
  assert.ok(!isValidPhoneIN("12345") && !isValidPhoneIN("0123456789"));
  assert.ok(isValidEmail("a.b@c.in") && !isValidEmail("nope"));
});
