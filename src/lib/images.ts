// Maps demo media keys to bundled assets.
// TODO(prod-storage): media URLs will come from Lovable Cloud storage; this map goes away.
import idol2026 from "@/assets/idol-2026.jpg";
import procession from "@/assets/gallery-procession.jpg";
import laddu from "@/assets/gallery-laddu.jpg";

const map: Record<string, string> = { "idol-2026": idol2026, "gallery-procession": procession, "gallery-laddu": laddu };
export const resolveImage = (key: string | null) => (key ? (map[key] ?? key) : null);
