// Starter samples — one realistic, Indian-context FICTIONAL student per
// discipline. Loaded only into an empty resume ("Load starter sample"). No real
// people. Each is run through cleanResumeData so it is always well-formed.
import { cleanResumeData } from "./schema.js";

const NUVOSID = "NUVOSID Academy of Design";

const RAW = {
  interior_design: {
    discipline: "interior_design", template: "grid_portfolio", targetRole: "Junior Interior Designer",
    basics: {
      name: "Aanya Mehta", headline: "Interior Designer | Residential & Retail", email: "aanya.mehta@example.com", phone: "9876543210",
      summary: "Interior designer passionate about functional, warm residential spaces. Hands-on with space planning, 3D visualization and site execution — comfortable taking a brief from concept to BOQ.",
      location: { city: "Pune", state: "Maharashtra", country: "India" },
      profiles: [{ network: "Behance", url: "https://behance.net/aanyamehta" }, { network: "LinkedIn", url: "https://linkedin.com/in/aanyamehta" }],
      portfolioUrl: "https://behance.net/aanyamehta", availability: "INTERNSHIP",
    },
    education: [{ institution: NUVOSID, program: "Diploma in Interior Design", studyType: "Diploma", startDate: "2023-07", endDate: "2025-05", score: { system: "PERCENTAGE", value: "82%" }, highlights: ["Best Thesis — Retail Concept Store jury award"] }],
    projects: [
      { title: "2 BHK Residence, Koregaon Park", type: "Academic", role: "Lead Designer", tools: ["AutoCAD", "SketchUp", "V-Ray"], brief: "Full interior for a 980 sq ft apartment for a young family.", highlights: ["Designed a modular layout that added 15% usable floor area", "Rendered 8 photoreal views; prepared BOQ within a ₹6 lakh budget"], link: "https://behance.net/gallery/aanya-2bhk" },
      { title: "Boutique Café Concept", type: "Competition", role: "Designer", tools: ["SketchUp", "Enscape", "Photoshop"], brief: "60-seat café concept for a national student competition.", highlights: ["Planned seating for 60 covers in 900 sq ft", "Shortlisted in the top 10 of 120 entries"] },
    ],
    experience: [{ organization: "Studio Saaj Interiors", position: "Design Intern", employmentType: "Internship", location: "Pune", startDate: "2024-12", endDate: "2025-02", highlights: ["Prepared working drawings for 3 residential sites", "Coordinated with vendors to finalize material & finish selections"] }],
    skills: [{ category: "Core Skills", items: ["Space planning", "Lighting design", "Material & finish selection", "BOQ / estimation"] }, { category: "Technical", items: ["Working drawings", "Site execution", "Modular kitchen design"] }],
    software: [{ name: "AutoCAD", level: "Advanced" }, { name: "SketchUp", level: "Advanced" }, { name: "V-Ray", level: "Intermediate" }, { name: "Enscape", level: "Intermediate" }],
    awards: [{ title: "Best Thesis Project", awarder: NUVOSID, date: "2025", summary: "Retail concept store" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Native" }, { language: "Marathi", fluency: "Fluent" }],
  },

  fashion_design: {
    discipline: "fashion_design", template: "editorial", targetRole: "Junior Fashion Designer",
    basics: {
      name: "Riya Sharma", headline: "Fashion Designer | Womenswear & Ethnic", email: "riya.sharma@example.com", phone: "9811122233",
      summary: "Fashion designer with a strong hand in pattern making, garment construction and illustration. Keen eye for textiles, trends and detailing across womenswear and ethnic wear.",
      location: { city: "Jaipur", state: "Rajasthan", country: "India" },
      profiles: [{ network: "Instagram", url: "https://instagram.com/riya.designs" }, { network: "Behance", url: "https://behance.net/riyasharma" }],
      portfolioUrl: "https://behance.net/riyasharma", availability: "INTERNSHIP",
    },
    education: [{ institution: NUVOSID, program: "Diploma in Fashion Design", studyType: "Diploma", startDate: "2023-07", endDate: "2025-05", score: { system: "PERCENTAGE", value: "79%" }, highlights: ["Graduation show — Indo-western collection"] }],
    projects: [
      { title: "'Marusthali' — Graduation Collection", type: "Academic", role: "Designer", tools: ["Adobe Illustrator", "CLO 3D"], brief: "A 6-look Indo-western collection inspired by Rajasthani textiles.", highlights: ["Designed and constructed 6 looks from concept to ramp", "Showcased at the annual fashion show to an audience of 300+"], link: "https://behance.net/gallery/riya-marusthali" },
      { title: "Block-Print Resort Wear", type: "Personal", role: "Designer", tools: ["Illustrator", "Photoshop"], brief: "Capsule of 4 breezy resort pieces using hand block prints.", highlights: ["Sourced fabric from Bagru artisans", "Developed 4 tech packs for sampling"] },
    ],
    experience: [{ organization: "Anokhi (retail)", position: "Design Intern", employmentType: "Internship", location: "Jaipur", startDate: "2024-11", endDate: "2025-01", highlights: ["Assisted in trend research and fabric selection for SS25", "Illustrated 20+ flats for the merchandising team"] }],
    skills: [{ category: "Core Skills", items: ["Pattern making", "Draping", "Garment construction", "Fashion illustration"] }, { category: "Craft & Production", items: ["Hand embroidery", "Block printing", "Sampling"] }],
    software: [{ name: "Adobe Illustrator", level: "Advanced" }, { name: "CLO 3D", level: "Intermediate" }, { name: "Photoshop", level: "Intermediate" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Native" }],
  },

  graphic_communication: {
    discipline: "graphic_communication", template: "grid_portfolio", targetRole: "Junior Graphic Designer",
    basics: {
      name: "Neha Agarwal", headline: "Graphic Designer | Branding & Social", email: "neha.agarwal@example.com", phone: "9898989898",
      summary: "Communication designer focused on branding, typography and layout. Comfortable taking a brand from logo to launch across print and social media.",
      location: { city: "Bengaluru", state: "Karnataka", country: "India" },
      profiles: [{ network: "Behance", url: "https://behance.net/nehaagarwal" }, { network: "Dribbble", url: "https://dribbble.com/neha" }],
      portfolioUrl: "https://behance.net/nehaagarwal", availability: "FULL_TIME",
    },
    education: [{ institution: NUVOSID, program: "Diploma in Graphic & Communication Design", studyType: "Diploma", startDate: "2023-06", endDate: "2025-04", score: { system: "CGPA_10", value: "8.4" }, highlights: [] }],
    projects: [
      { title: "'Chai Patti' — Café Brand Identity", type: "Academic", role: "Brand Designer", tools: ["Illustrator", "Photoshop", "InDesign"], brief: "Complete identity for a fictional artisanal chai café.", highlights: ["Branded a full identity: logo, packaging and menu system", "Designed 12 packaging SKUs with a cohesive grid"], link: "https://behance.net/gallery/chai-patti" },
      { title: "Monsoon Sale Social Campaign", type: "Client", role: "Designer", tools: ["Illustrator", "After Effects"], brief: "Instagram campaign for a local apparel brand.", highlights: ["Produced 18 creatives that grew engagement by 40%", "Added 1,200+ followers over the 3-week campaign"] },
    ],
    experience: [{ organization: "Pixel & Co.", position: "Graphic Design Intern", employmentType: "Internship", location: "Bengaluru", startDate: "2024-10", endDate: "2025-01", highlights: ["Designed social creatives for 4 brands", "Prepared print-ready files for offset production"] }],
    skills: [{ category: "Core Skills", items: ["Branding & identity", "Typography", "Layout design", "Packaging design"] }, { category: "Production", items: ["Pre-press", "Brand guidelines", "Mockups"] }],
    software: [{ name: "Illustrator", level: "Advanced" }, { name: "Photoshop", level: "Advanced" }, { name: "InDesign", level: "Intermediate" }, { name: "Figma", level: "Intermediate" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Fluent" }, { language: "Kannada", fluency: "Conversational" }],
  },

  ui_ux_design: {
    discipline: "ui_ux_design", template: "minimal", targetRole: "UI/UX Designer",
    basics: {
      name: "Kabir Joshi", headline: "UI/UX Designer | Web & Mobile", email: "kabir.joshi@example.com", phone: "9765432109",
      summary: "UI/UX designer who pairs user research with clean, accessible interfaces. Experienced across wireframing, prototyping and usability testing for web and mobile products.",
      location: { city: "Mumbai", state: "Maharashtra", country: "India" },
      profiles: [{ network: "Behance", url: "https://behance.net/kabirjoshi" }, { network: "LinkedIn", url: "https://linkedin.com/in/kabirjoshi" }],
      portfolioUrl: "https://kabirjoshi.design", availability: "FULL_TIME",
    },
    education: [{ institution: NUVOSID, program: "Advanced Diploma in UI/UX Design", studyType: "Advanced Diploma", startDate: "2023-08", endDate: "2025-06", score: { system: "CGPA_10", value: "8.8" }, highlights: [] }],
    projects: [
      { title: "'Sehat' — Clinic Booking App", type: "Academic", role: "UX Designer", tools: ["Figma", "Maze", "FigJam"], brief: "Mobile app to book clinic appointments in Tier-2 cities.", highlights: ["Researched and tested with 12 users; raised task success to 92%", "Designed 24 screens and a reusable design system"], link: "https://behance.net/gallery/sehat-app" },
      { title: "E-commerce Checkout Redesign", type: "Personal", role: "Designer", tools: ["Figma", "Protopie"], brief: "Redesign of a cluttered 5-step checkout.", highlights: ["Reduced checkout from 5 steps to 2", "Prototyped and validated a 28% drop-off reduction"] },
    ],
    experience: [{ organization: "Bolt Digital", position: "UX Intern", employmentType: "Internship", location: "Remote", startDate: "2024-12", endDate: "2025-03", highlights: ["Ran 8 usability sessions and synthesised findings", "Shipped a responsive marketing page with the dev team"] }],
    skills: [{ category: "Core Skills", items: ["User research", "Wireframing", "Prototyping", "Usability testing", "Design systems"] }, { category: "Process", items: ["Design thinking", "Accessibility (WCAG)", "Responsive design"] }],
    software: [{ name: "Figma", level: "Advanced" }, { name: "FigJam", level: "Advanced" }, { name: "Protopie", level: "Intermediate" }, { name: "Maze", level: "Intermediate" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Native" }],
  },

  product_design: {
    discipline: "product_design", template: "grid_portfolio", targetRole: "Product Design Intern",
    basics: {
      name: "Arjun Reddy", headline: "Industrial Designer | Products & CMF", email: "arjun.reddy@example.com", phone: "9700011122",
      summary: "Industrial designer who takes products from sketch to prototype, balancing form, ergonomics and manufacturability. Hands-on with CAD, 3D printing and user testing.",
      location: { city: "Hyderabad", state: "Telangana", country: "India" },
      profiles: [{ network: "Behance", url: "https://behance.net/arjunreddy" }, { network: "LinkedIn", url: "https://linkedin.com/in/arjunreddy" }],
      portfolioUrl: "https://behance.net/arjunreddy", availability: "INTERNSHIP",
    },
    education: [{ institution: NUVOSID, program: "Diploma in Product Design", studyType: "Diploma", startDate: "2023-07", endDate: "2025-05", score: { system: "PERCENTAGE", value: "81%" }, highlights: [] }],
    projects: [
      { title: "Low-Cost Water Filter", type: "Academic", role: "Product Designer", tools: ["Fusion 360", "KeyShot"], brief: "Affordable gravity water filter for rural homes.", highlights: ["Modelled and 3D-printed 4 prototypes across iterations", "Cut target unit cost to ₹450 through DFM"], link: "https://behance.net/gallery/water-filter" },
      { title: "Modular Desk Organiser", type: "Personal", role: "Designer", tools: ["Rhino", "KeyShot"], brief: "Stackable desk organiser system.", highlights: ["Reduced part count by 30% via a single repeated module", "User-tested with 6 students for ergonomics"] },
    ],
    experience: [{ organization: "Form Labs Studio", position: "Design Intern", employmentType: "Internship", location: "Hyderabad", startDate: "2024-11", endDate: "2025-01", highlights: ["Built foam and 3D-printed mockups for client reviews", "Prepared CMF options for a consumer appliance"] }],
    skills: [{ category: "Core Skills", items: ["Sketching", "Ergonomics", "Prototyping", "3D printing", "CMF (Colour-Material-Finish)"] }, { category: "Technical", items: ["Surface modelling", "Design for manufacturing (DFM)"] }],
    software: [{ name: "Fusion 360", level: "Advanced" }, { name: "Rhino", level: "Intermediate" }, { name: "KeyShot", level: "Advanced" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Telugu", fluency: "Native" }, { language: "Hindi", fluency: "Conversational" }],
  },

  animation_motion: {
    discipline: "animation_motion", template: "grid_portfolio", targetRole: "Motion Graphics Designer",
    basics: {
      name: "Ishaan Verma", headline: "Motion & 2D/3D Animator", email: "ishaan.verma@example.com", phone: "9600012345",
      summary: "Animator & motion designer comfortable across 2D and 3D, from storyboard to final render. Strong sense of timing, staging and visual storytelling.",
      location: { city: "Noida", state: "Uttar Pradesh", country: "India" },
      profiles: [{ network: "Vimeo", url: "https://vimeo.com/ishaanverma" }, { network: "Instagram", url: "https://instagram.com/ishaan.motion" }],
      portfolioUrl: "https://vimeo.com/ishaanverma", availability: "FULL_TIME",
    },
    education: [{ institution: NUVOSID, program: "Diploma in Animation & Motion Design", studyType: "Diploma", startDate: "2023-06", endDate: "2025-04", score: { system: "CGPA_10", value: "8.2" }, highlights: [] }],
    projects: [
      { title: "'Rangoli' — Festival Explainer", type: "Academic", role: "Animator", tools: ["After Effects", "Illustrator"], brief: "A 45-second 2D explainer on the story of Diwali.", highlights: ["Storyboarded and animated a 45-second film", "Crossed 10,000 views on the college showcase reel"], link: "https://vimeo.com/rangoli-explainer" },
      { title: "3D Product Reveal", type: "Client", role: "Motion Designer", tools: ["Blender", "Premiere Pro"], brief: "A 20-second 3D reveal for a sneaker brand.", highlights: ["Modelled, lit and rendered a 20-second reveal", "Delivered the final cut within a 1-week timeline"] },
    ],
    experience: [{ organization: "Frame Theory", position: "Motion Intern", employmentType: "Internship", location: "Remote", startDate: "2024-12", endDate: "2025-02", highlights: ["Edited 15+ social reels for brand clients", "Created lower-thirds and title animation templates"] }],
    skills: [{ category: "Core Skills", items: ["2D animation", "Storyboarding", "Motion graphics", "Video editing", "Compositing"] }, { category: "Pipeline", items: ["Keyframing", "Texturing", "Rotoscoping"] }],
    software: [{ name: "After Effects", level: "Advanced" }, { name: "Blender", level: "Intermediate" }, { name: "Premiere Pro", level: "Advanced" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Native" }],
  },

  photography_media: {
    discipline: "photography_media", template: "grid_portfolio", targetRole: "Photographer",
    basics: {
      name: "Diya Nair", headline: "Photographer | Product & Fashion", email: "diya.nair@example.com", phone: "9500054321",
      summary: "Photographer across product and fashion with a strong grasp of lighting and retouching. Experienced directing shoots end-to-end, from mood board to final delivery.",
      location: { city: "Kochi", state: "Kerala", country: "India" },
      profiles: [{ network: "Instagram", url: "https://instagram.com/diya.shoots" }, { network: "Behance", url: "https://behance.net/diyanair" }],
      portfolioUrl: "https://behance.net/diyanair", availability: "FREELANCE",
    },
    education: [{ institution: NUVOSID, program: "Diploma in Photography & Visual Media", studyType: "Diploma", startDate: "2023-07", endDate: "2025-05", score: { system: "PERCENTAGE", value: "84%" }, highlights: [] }],
    projects: [
      { title: "Jewellery Product Series", type: "Client", role: "Photographer", tools: ["Lightroom", "Capture One"], brief: "Catalogue shoot for a local jewellery brand.", highlights: ["Shot and retouched 60 product images", "Delivered a consistent catalogue used across 3 campaigns"], link: "https://behance.net/gallery/diya-jewellery" },
      { title: "'Monsoon Streets' — Photo Essay", type: "Personal", role: "Photographer", tools: ["Lightroom", "Photoshop"], brief: "A documentary essay on Kochi during the monsoon.", highlights: ["Curated a 20-image essay", "Selected for a college exhibition"] },
    ],
    experience: [{ organization: "Studio Lumen", position: "Assistant Photographer", employmentType: "Internship", location: "Kochi", startDate: "2024-10", endDate: "2025-01", highlights: ["Assisted on 10+ fashion and product shoots", "Managed lighting setups and tethered capture"] }],
    skills: [{ category: "Core Skills", items: ["Product photography", "Fashion photography", "Studio lighting", "Retouching", "Art direction"] }, { category: "Technical & Gear", items: ["DSLR / Mirrorless", "Tethered shooting", "Strobe & continuous lighting"] }],
    software: [{ name: "Lightroom", level: "Advanced" }, { name: "Photoshop", level: "Advanced" }, { name: "Capture One", level: "Intermediate" }],
    exhibitions: [{ title: "Monsoon Streets", venue: "NUVOSID Annual Showcase", date: "2025", summary: "Documentary photo essay" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Malayalam", fluency: "Native" }, { language: "Hindi", fluency: "Conversational" }],
  },

  custom: {
    discipline: "custom", template: "minimal", targetRole: "Designer",
    basics: {
      name: "Aarav Kulkarni", headline: "Multidisciplinary Designer", email: "aarav.kulkarni@example.com", phone: "9123456780",
      summary: "Multidisciplinary designer who enjoys solving problems across media. Curious, collaborative and comfortable learning new tools quickly.",
      location: { city: "Pune", state: "Maharashtra", country: "India" },
      profiles: [{ network: "Portfolio", url: "https://aaravk.design" }], portfolioUrl: "https://aaravk.design", availability: "INTERNSHIP",
    },
    education: [{ institution: NUVOSID, program: "Diploma in Design", studyType: "Diploma", startDate: "2023-07", endDate: "2025-05", highlights: [] }],
    projects: [{ title: "Campus Wayfinding System", type: "Academic", role: "Designer", tools: ["Illustrator", "Figma"], brief: "Signage and wayfinding for a college campus.", highlights: ["Designed a signage system across 4 blocks", "Tested routes with 10 first-year students"] }],
    skills: [{ category: "Core Skills", items: ["Design thinking", "Research", "Prototyping", "Presentation"] }],
    software: [{ name: "Figma", level: "Intermediate" }, { name: "Photoshop", level: "Intermediate" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Fluent" }, { language: "Marathi", fluency: "Native" }],
  },
};

// Return a deep, cleaned copy of the starter sample for a discipline.
export function getStarterSample(disciplineId) {
  const raw = RAW[disciplineId] || RAW.custom;
  return cleanResumeData(JSON.parse(JSON.stringify(raw)));
}

export const SAMPLE_IDS = Object.keys(RAW);
