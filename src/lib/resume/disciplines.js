// Design-discipline taxonomy for the Resume & Portfolio Builder.
//
// This is CONFIG, not UI — add/edit disciplines, skill banks, verbs and impact
// signals here and the whole builder (labels, skill picker, starter samples,
// readiness scoring) adapts. Keep skills correctly spelled and India-relevant.
//
// Each discipline:
//   id                  stable key (also stored on the Resume)
//   label               display name
//   icon                lucide-react icon name (string)
//   suggestedRoleTitles target roles shown as quick-pick chips
//   summaryPlaceholder  example summary for the textarea
//   skillCategories[]   { id, label, skills[] } — the discipline's skill bank
//   software[]          tools shown in the Software proficiency section
//   actionVerbs[]       strong past-tense verbs rewarded by the score engine
//   impactSignals[]     units/keywords that signal quantified impact
//   recommendedSections which content sections to surface by default
//   defaultTemplate     starting template id
//   courseKeywords[]    substrings matched against a student's enrolled course
//                       title to auto-pick the discipline

// Reorderable content sections (basics + summary are the fixed header).
export const SECTION_KEYS = [
  "projects", "experience", "education", "skills", "software",
  "certifications", "awards", "exhibitions", "workshops", "languages", "interests",
];

export const SECTION_LABELS = {
  projects: "Projects & Portfolio",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  software: "Software",
  certifications: "Certifications",
  awards: "Awards",
  exhibitions: "Exhibitions",
  workshops: "Workshops",
  languages: "Languages",
  interests: "Interests",
};

// Weak bullet openers the score engine flags.
export const WEAK_OPENERS = ["responsible for", "worked on", "helped", "assisted with", "involved in", "duties included", "tasked with"];

// Generic fallbacks for custom / cross-discipline use.
export const GENERIC_VERBS = ["Designed", "Created", "Developed", "Led", "Built", "Delivered", "Produced", "Managed", "Improved", "Launched", "Researched", "Presented"];
export const GENERIC_IMPACT = ["%", "₹", "no.", "number", "users", "clients", "projects", "weeks", "months", "hours"];

export const DISCIPLINES = [
  {
    id: "interior_design",
    label: "Interior & Spatial Design",
    icon: "Sofa",
    courseKeywords: ["interior", "spatial", "space"],
    suggestedRoleTitles: ["Junior Interior Designer", "Interior Design Intern", "Design Assistant", "3D Visualizer", "Site Coordinator"],
    summaryPlaceholder: "Interior designer skilled in residential & retail spaces, with hands-on experience in space planning, 3D visualization and site execution. Comfortable taking a brief from concept to BOQ.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["Space planning", "Furniture design", "Lighting design", "Material & finish selection", "Colour theory", "BOQ / estimation", "Site execution", "Working drawings", "Mood boards", "Vastu awareness", "Sustainable design", "Client presentation"] },
      { id: "technical", label: "Technical", skills: ["Measured site survey", "Joinery detailing", "MEP coordination", "False ceiling design", "Modular kitchen design", "Turnkey execution", "Vendor management"] },
    ],
    software: ["AutoCAD", "SketchUp", "3ds Max", "V-Ray", "Revit", "Enscape", "Lumion", "Photoshop", "InDesign"],
    actionVerbs: ["Designed", "Planned", "Rendered", "Detailed", "Executed", "Supervised", "Estimated", "Specified", "Coordinated", "Presented"],
    impactSignals: ["sq ft", "sqft", "square feet", "₹", "lakh", "crore", "budget", "weeks", "months", "rooms", "units", "% cost", "clients", "BHK"],
    recommendedSections: ["projects", "experience", "education", "skills", "software", "certifications", "workshops", "languages"],
    defaultTemplate: "grid_portfolio",
  },
  {
    id: "fashion_design",
    label: "Fashion & Apparel Design",
    icon: "Shirt",
    courseKeywords: ["fashion", "apparel", "textile", "garment"],
    suggestedRoleTitles: ["Junior Fashion Designer", "Design Intern", "Fashion Stylist", "Assistant Designer", "Textile Designer"],
    summaryPlaceholder: "Fashion designer with a strong grounding in pattern making, garment construction and fashion illustration. Keen eye for trends, textiles and detailing across womenswear and ethnic wear.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["Pattern making", "Draping", "Garment construction", "Fashion illustration", "Trend forecasting", "Textile knowledge", "Tech packs", "Styling", "Surface ornamentation", "Embroidery", "Sketching", "Colour & fabric story"] },
      { id: "craft", label: "Craft & Production", skills: ["Hand embroidery", "Block printing", "Dyeing & finishing", "Sampling", "Quality checking", "Fabric sourcing", "Grading"] },
    ],
    software: ["CLO 3D", "Adobe Illustrator", "Photoshop", "Optitex", "CorelDRAW", "Browzwear"],
    actionVerbs: ["Designed", "Draped", "Constructed", "Styled", "Curated", "Sourced", "Illustrated", "Produced", "Sampled"],
    impactSignals: ["looks", "collection", "pieces", "garments", "show", "exhibition", "units sold", "lead time", "weeks", "₹"],
    recommendedSections: ["projects", "experience", "education", "skills", "software", "exhibitions", "awards", "languages"],
    defaultTemplate: "editorial",
  },
  {
    id: "graphic_communication",
    label: "Graphic & Communication Design",
    icon: "PenTool",
    courseKeywords: ["graphic", "communication", "visual communication", "visual comm"],
    suggestedRoleTitles: ["Junior Graphic Designer", "Visual Designer", "Branding Intern", "Social Media Designer", "Packaging Designer"],
    summaryPlaceholder: "Graphic & communication designer focused on branding, typography and layout. Comfortable taking brands from logo to launch across print and social media.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["Branding & identity", "Typography", "Layout design", "Packaging design", "Print production", "Social media creatives", "Illustration", "Logo design", "Editorial design", "Infographics", "Colour theory", "Grid systems"] },
      { id: "production", label: "Production", skills: ["Pre-press", "CMYK / RGB workflow", "Mockups", "Die-cut / dieline", "Brand guidelines", "Vector art"] },
    ],
    software: ["Illustrator", "Photoshop", "InDesign", "Figma", "Canva", "CorelDRAW", "After Effects"],
    actionVerbs: ["Branded", "Designed", "Illustrated", "Typeset", "Art-directed", "Produced", "Conceptualised", "Launched"],
    impactSignals: ["impressions", "engagement", "%", "followers", "brands", "campaigns", "print run", "reach", "likes", "clients"],
    recommendedSections: ["projects", "experience", "education", "skills", "software", "awards", "certifications", "languages"],
    defaultTemplate: "grid_portfolio",
  },
  {
    id: "ui_ux_design",
    label: "UI/UX & Interaction Design",
    icon: "MonitorSmartphone",
    courseKeywords: ["ui", "ux", "interaction", "digital", "product design"],
    suggestedRoleTitles: ["UI/UX Designer", "Product Design Intern", "Interaction Designer", "UX Researcher", "Visual / UI Designer"],
    summaryPlaceholder: "UI/UX designer who pairs user research with clean, accessible interfaces. Experienced across wireframing, prototyping and usability testing for web and mobile.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["User research", "Wireframing", "Prototyping", "Usability testing", "Design systems", "Information architecture", "Accessibility (WCAG)", "Interaction design", "User flows", "Personas", "Journey mapping", "Visual design"] },
      { id: "process", label: "Process", skills: ["Design thinking", "Heuristic evaluation", "A/B testing", "Card sorting", "Design handoff", "Microinteractions", "Responsive design"] },
    ],
    software: ["Figma", "FigJam", "Adobe XD", "Framer", "Protopie", "Maze", "Notion", "Zeplin"],
    actionVerbs: ["Researched", "Prototyped", "Tested", "Redesigned", "Mapped", "Validated", "Shipped", "Designed", "Iterated"],
    impactSignals: ["conversion", "%", "task success", "SUS", "drop-off", "users", "screens", "retention", "NPS", "clicks"],
    recommendedSections: ["projects", "experience", "education", "skills", "software", "certifications", "awards", "languages"],
    defaultTemplate: "minimal",
  },
  {
    id: "product_design",
    label: "Product & Industrial Design",
    icon: "Box",
    courseKeywords: ["product design", "industrial", "furniture", "transportation"],
    suggestedRoleTitles: ["Product Design Intern", "Industrial Designer", "Junior Product Designer", "Design Engineer", "CMF Designer"],
    summaryPlaceholder: "Industrial designer who takes products from sketch to prototype, balancing form, ergonomics and manufacturability. Hands-on with CAD, 3D printing and user testing.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["Sketching", "Ergonomics", "CMF (Colour-Material-Finish)", "Prototyping", "3D printing", "Design for manufacturing (DFM)", "Materials & processes", "Form development", "User testing", "Concept development", "Mockups", "Rendering"] },
      { id: "technical", label: "Technical", skills: ["Surface modelling", "Parametric modelling", "Mould design basics", "Tolerancing", "Reverse engineering", "Bill of materials"] },
    ],
    software: ["SolidWorks", "Fusion 360", "Rhino", "KeyShot", "Blender", "Illustrator", "Photoshop"],
    actionVerbs: ["Conceptualised", "Modelled", "Prototyped", "Engineered", "Iterated", "Tested", "Sketched", "Rendered"],
    impactSignals: ["prototypes", "cost", "₹", "weight", "%", "user trials", "iterations", "units", "grams", "parts"],
    recommendedSections: ["projects", "experience", "education", "skills", "software", "awards", "certifications", "languages"],
    defaultTemplate: "grid_portfolio",
  },
  {
    id: "animation_motion",
    label: "Animation, Motion & VFX",
    icon: "Clapperboard",
    courseKeywords: ["animation", "motion", "vfx", "multimedia", "game"],
    suggestedRoleTitles: ["Motion Graphics Designer", "2D/3D Animator", "VFX Artist", "Video Editor", "Storyboard Artist"],
    summaryPlaceholder: "Animator & motion designer comfortable across 2D and 3D, from storyboard to final render. Strong sense of timing, staging and visual storytelling.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["2D animation", "3D animation", "Storyboarding", "Rigging", "Compositing", "Motion graphics", "Video editing", "Character animation", "Visual effects", "Colour grading", "Sound sync", "Lighting & rendering"] },
      { id: "pipeline", label: "Pipeline", skills: ["Asset modelling", "Texturing", "Keyframing", "Rotoscoping", "Green screen keying", "Render management"] },
    ],
    software: ["After Effects", "Blender", "Maya", "Cinema 4D", "Premiere Pro", "Nuke", "Toon Boom", "Photoshop"],
    actionVerbs: ["Animated", "Storyboarded", "Rigged", "Composited", "Edited", "Directed", "Rendered", "Designed"],
    impactSignals: ["sec", "seconds", "min", "runtime", "views", "projects", "frames", "festival", "episodes", "clients"],
    recommendedSections: ["projects", "experience", "education", "skills", "software", "awards", "exhibitions", "languages"],
    defaultTemplate: "grid_portfolio",
  },
  {
    id: "photography_media",
    label: "Photography & Visual Media",
    icon: "Camera",
    courseKeywords: ["photography", "media", "film", "visual media", "cinematography"],
    suggestedRoleTitles: ["Photographer", "Assistant Photographer", "Retoucher", "Photo & Video Intern", "Visual Content Creator"],
    summaryPlaceholder: "Photographer across product and fashion with a strong grasp of lighting and retouching. Experienced directing shoots end-to-end, from mood board to final delivery.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["Product photography", "Fashion photography", "Portrait photography", "Studio lighting", "Retouching", "Art direction", "Composition", "Photo editing", "Colour grading", "Shoot production", "Set styling", "Video editing"] },
      { id: "technical", label: "Technical & Gear", skills: ["DSLR / Mirrorless", "Strobe & continuous lighting", "Tethered shooting", "Exposure & metering", "Lens selection", "On-location setup"] },
    ],
    software: ["Lightroom", "Photoshop", "Capture One", "Premiere Pro", "DaVinci Resolve"],
    actionVerbs: ["Shot", "Retouched", "Lit", "Art-directed", "Produced", "Exhibited", "Directed", "Edited"],
    impactSignals: ["shoots", "clients", "published", "features", "exhibitions", "followers", "reach", "images", "campaigns", "%"],
    recommendedSections: ["projects", "experience", "education", "skills", "software", "exhibitions", "awards", "languages"],
    defaultTemplate: "grid_portfolio",
  },
  {
    id: "custom",
    label: "Other / Custom",
    icon: "Shapes",
    courseKeywords: [],
    suggestedRoleTitles: ["Designer", "Design Intern", "Creative Assistant"],
    summaryPlaceholder: "A short, specific intro: who you are, your strongest skills, and the kind of role you're after.",
    skillCategories: [
      { id: "core", label: "Core Skills", skills: ["Design thinking", "Research", "Sketching", "Prototyping", "Presentation", "Teamwork", "Problem solving", "Creativity"] },
    ],
    software: ["Photoshop", "Illustrator", "Figma", "Canva"],
    actionVerbs: GENERIC_VERBS,
    impactSignals: GENERIC_IMPACT,
    recommendedSections: ["projects", "experience", "education", "skills", "software", "certifications", "awards", "languages", "interests"],
    defaultTemplate: "minimal",
  },
];

export const DISCIPLINE_IDS = DISCIPLINES.map((d) => d.id);
export const DEFAULT_DISCIPLINE = "interior_design";

const BY_ID = Object.fromEntries(DISCIPLINES.map((d) => [d.id, d]));

// Look up a discipline config, falling back to "custom".
export function getDiscipline(id) {
  return BY_ID[id] || BY_ID.custom;
}

// Best-guess discipline from a student's enrolled course title (or "" if none).
export function disciplineFromCourse(courseTitle = "") {
  const t = (courseTitle || "").toLowerCase();
  if (!t) return "";
  for (const d of DISCIPLINES) {
    if (d.id === "custom") continue;
    if ((d.courseKeywords || []).some((k) => t.includes(k))) return d.id;
  }
  return "";
}

// Flat skill bank for a discipline (deduped) — used by the skill picker search.
export function allSkills(disciplineId) {
  const d = getDiscipline(disciplineId);
  return [...new Set(d.skillCategories.flatMap((c) => c.skills))];
}
