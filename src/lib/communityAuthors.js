import Student from "@/models/Student";
import { mockStudents } from "@/lib/db";

const OID = /^[a-f0-9]{24}$/i;

// Resolve the CURRENT profile image for a set of author (student) ids. The image
// is looked up live rather than stored on the post, so an author's latest
// profile photo shows on all of their past questions and answers. Returns a map
// { authorId: imageUrl }; ids without an image are simply absent.
export async function authorImages(ids, useMock) {
  const map = {};
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (!uniq.length) return map;

  if (useMock) {
    for (const s of mockStudents()) {
      const sid = (s._id && s._id.toString()) || s.id;
      if (uniq.includes(sid) && s.image) map[sid] = s.image;
    }
    return map;
  }

  // Only valid ObjectId strings can be queried (admin/mock ids are skipped).
  const valid = uniq.filter((x) => OID.test(x));
  if (!valid.length) return map;
  const docs = await Student.find({ _id: { $in: valid } }).select("image").lean().catch(() => []);
  for (const d of docs) if (d.image) map[d._id.toString()] = d.image;
  return map;
}
