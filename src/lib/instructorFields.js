// Shared instructor (mentor) field mapping used by admin + public routes.

const cleanArr = (a) => (Array.isArray(a) ? a.map((x) => (x || "").toString().trim()).filter(Boolean) : []);

export function serializeInstructor(i) {
  return {
    id: (i._id && i._id.toString()) || i.id,
    name: i.name || "",
    role: i.role || "",
    designation: i.designation || "",
    url: i.url || "",
    image: i.image || "",
    bio: i.bio || "",
    education: i.education || "",
    experience: i.experience || "",
    videoUrl: i.videoUrl || "",
    videoCaption: i.videoCaption || "",
    credentials: i.credentials || [],
    memberships: i.memberships || [],
    expertise: i.expertise || [],
    details: (i.details || []).map((d) => ({
      title: d.title || "",
      variant: d.variant || "paragraph",
      content: d.content || "",
      items: d.items || [],
    })),
    status: i.status || "Active",
    createdAt: i.createdAt,
  };
}

export function buildInstructorDoc(b) {
  return {
    name: (b.name || "").trim(),
    role: (b.role || "").trim(),
    designation: (b.designation || "").trim(),
    url: (b.url || "").trim(),
    image: b.image || "",
    bio: (b.bio || "").trim(),
    education: (b.education || "").trim(),
    experience: (b.experience || "").trim(),
    videoUrl: (b.videoUrl || "").trim(),
    videoCaption: (b.videoCaption || "").trim(),
    credentials: cleanArr(b.credentials),
    memberships: cleanArr(b.memberships),
    expertise: cleanArr(b.expertise),
    details: Array.isArray(b.details)
      ? b.details
          .map((d) => ({
            title: (d.title || "").trim(),
            variant: ["paragraph", "tags", "bullets"].includes(d.variant) ? d.variant : "paragraph",
            content: (d.content || "").trim(),
            items: cleanArr(d.items),
          }))
          .filter((d) => d.title || d.content || d.items.length)
      : [],
    status: b.status === "Inactive" ? "Inactive" : "Active",
  };
}
