// DEMO DATA STORE — in-memory, per server instance. NOT persistent.
// TODO(prod-db): replace every accessor here with PostgreSQL queries (Lovable Cloud)
// using the same shapes from src/domain/types.ts. Mutations reset on server restart.
import type {
  AppNotification, Auction, AuctionContribution, AuditLog, Donation, Expense, ExpenseCategory,
  Festival, FestivalBranding, FestivalMembership, Highlight, MemoryPost, NotificationPreferences,
  User, UserPermission,
} from "@/domain/types";

const ts = (d: string) => new Date(d).toISOString();
const base = (id: string, festivalId: string, createdAt: string) => ({
  id, festivalId, createdBy: "u-admin", createdAt: ts(createdAt), status: "APPROVED" as const, deletedAt: null, deleteReason: null,
});

const festivals: Festival[] = [
  { id: "f-2025", year: 2025, status: "ARCHIVED", startDate: "2025-08-27", endDate: "2025-09-06", isCurrent: false },
  { id: "f-2026", year: 2026, status: "ACTIVE", startDate: "2026-09-14", endDate: "2026-09-24", isCurrent: true },
  { id: "f-2027", year: 2027, status: "PLANNING", startDate: "2027-09-04", endDate: "2027-09-14", isCurrent: false },
];
const branding: FestivalBranding[] = [
  { festivalId: "f-2025", nameEn: "Sri Vinayaka Chavithi Utsavalu 2025", nameTe: "శ్రీ వినాయక చవితి ఉత్సవాలు 2025", taglineEn: "Our village, our Ganapati", taglineTe: "మన ఊరు, మన గణపతి", idolImage: null, bannerImage: null, logo: null, accentHue: 30 },
  { festivalId: "f-2026", nameEn: "Sri Vinayaka Chavithi Utsavalu 2026", nameTe: "శ్రీ వినాయక చవితి ఉత్సవాలు 2026", taglineEn: "Every rupee accounted, every devotee welcome", taglineTe: "ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం", idolImage: "idol-2026", bannerImage: null, logo: null, accentHue: 45 },
  { festivalId: "f-2027", nameEn: "Sri Vinayaka Chavithi Utsavalu 2027", nameTe: "శ్రీ వినాయక చవితి ఉత్సవాలు 2027", taglineEn: "Planning begins", taglineTe: "ప్రణాళిక ప్రారంభం", idolImage: null, bannerImage: null, logo: null, accentHue: 20 },
];
const users: User[] = [
  { id: "u-admin", name: "Venkatesh Amadasani", phone: "9000000001", role: "ADMIN", active: true },
  { id: "u-youth", name: "Ravi Kumar", phone: "9000000002", role: "GENERAL", active: true },
  { id: "u-general", name: "Lakshmi Devi", phone: "9000000003", role: "GENERAL", active: true },
];
const userPermissions: UserPermission[] = [
  { userId: "u-youth", permission: "YOUTH_ACCESS", festivalId: "f-2026" },
  { userId: "u-youth", permission: "VIEW_YOUTH_DATA", festivalId: "f-2026" },
  { userId: "u-youth", permission: "VIEW_COMBINED_DATA", festivalId: "f-2026" },
  { userId: "u-youth", permission: "DONATION_ADD", festivalId: "f-2026" },
  { userId: "u-youth", permission: "CONTRIBUTION_ADD", festivalId: "f-2026" },
];
const memberships: FestivalMembership[] = [{ userId: "u-youth", festivalId: "f-2026", youth: true, approved: true }];

const categories: ExpenseCategory[] = [
  { id: "c-idol", nameEn: "Idol", nameTe: "విగ్రహం", scope: "ANY" },
  { id: "c-pandal", nameEn: "Pandal & Decoration", nameTe: "పందిరి & అలంకరణ", scope: "ANY" },
  { id: "c-sound", nameEn: "Sound & Lighting", nameTe: "సౌండ్ & లైటింగ్", scope: "ANY" },
  { id: "c-prasadam", nameEn: "Prasadam & Annadanam", nameTe: "ప్రసాదం & అన్నదానం", scope: "ANY" },
  { id: "c-pooja", nameEn: "Pooja Items", nameTe: "పూజా సామగ్రి", scope: "ANY" },
  { id: "c-events", nameEn: "Youth Events", nameTe: "యువత కార్యక్రమాలు", scope: "YOUTH" },
];

const names = ["Suresh Reddy", "Padma Rao", "కొండయ్య", "Srinivas Naidu", "Anjali Varma", "రామారావు", "Gopal Krishna", "Sita Mahalakshmi", "Nagaraju", "Bhavani Shankar", "వెంకట లక్ష్మి", "Prasad Babu", "Kavitha", "Mallesh", "సత్యనారాయణ", "Durga Prasad"];
const methods = ["CASH", "PHONEPE", "GOOGLE_PAY", "UPI", "BANK_TRANSFER", "CASH"] as const;
const donations: Donation[] = names.map((n, i) => {
  const scope = i % 5 === 3 ? "YOUTH" : i % 4 === 1 ? "BOTH" : "GENERAL";
  const total = [5116, 2116, 1116, 10116, 516, 3116, 1516, 25116][i % 8] ?? 1116;
  const youthAmount = scope === "YOUTH" ? total : scope === "BOTH" ? Math.round(total * 0.3) : 0;
  return {
    ...base(`d-${i + 1}`, "f-2026", `2026-09-${String(1 + i).padStart(2, "0")}T10:00:00+05:30`),
    donorName: n, village: i % 3 === 0 ? "Kothapalli" : null, scope, totalAmount: total,
    generalAmount: total - youthAmount, youthAmount, method: methods[i % 6] ?? "CASH", proofUrl: null, note: null,
    date: `2026-09-${String(1 + i).padStart(2, "0")}`,
  };
});
donations.push({ ...base("d-2025-1", "f-2025", "2025-08-20"), donorName: "Suresh Reddy", village: null, scope: "GENERAL", totalAmount: 50116, generalAmount: 50116, youthAmount: 0, method: "CASH", proofUrl: null, note: null, date: "2025-08-20" });

const exp = (i: number, scope: "GENERAL" | "YOUTH", categoryId: string, description: string, amount: number, paidTo: string, day: number): Expense => ({
  ...base(`e-${i}`, "f-2026", `2026-09-${day}T12:00:00+05:30`), scope, categoryId, description, amount, paidTo, receiptUrl: null, date: `2026-09-${day}`,
});
const expenses: Expense[] = [
  exp(1, "GENERAL", "c-idol", "12 ft clay idol (eco-friendly)", 38000, "Sri Ganesh Artworks", 10),
  exp(2, "GENERAL", "c-pandal", "Pandal structure & cloth", 22000, "Venkateswara Tent House", 11),
  exp(3, "GENERAL", "c-sound", "Sound system 10 days", 15000, "Durga Sounds", 12),
  exp(4, "GENERAL", "c-prasadam", "Annadanam — day 5", 18500, "Local caterers", 18),
  exp(5, "GENERAL", "c-pooja", "Pooja samagri & flowers", 6200, "Pooja Stores", 13),
  exp(6, "YOUTH", "c-events", "Rangoli & sports prizes", 7500, "Youth committee", 16),
  exp(7, "YOUTH", "c-sound", "DJ for nimajjanam", 9000, "Beat Box", 20),
];
expenses.push({ ...base("e-2025-1", "f-2025", "2025-08-25"), scope: "GENERAL", categoryId: "c-idol", description: "Idol", amount: 32000, paidTo: null, receiptUrl: null, date: "2025-08-25" });

const auc = (i: number, itemEn: string, itemTe: string, scope: "GENERAL" | "YOUTH", winnerType: "INDIVIDUAL" | "GROUP", winnerName: string, finalAmount: number, forYear = 2026): Auction => ({
  ...base(`a-${i}`, "f-2026", "2026-09-22T19:00:00+05:30"), itemEn, itemTe, scope, auctionYear: 2026, forFestivalYear: forYear,
  winnerType, winnerName, finalAmount, paymentStatus: "PENDING",
});
const auctions: Auction[] = [
  auc(1, "Ganesh Laddu (21 kg)", "గణేష్ లడ్డు (21 కిలోలు)", "GENERAL", "INDIVIDUAL", "Srinivas Naidu", 151116),
  auc(2, "Silver Kalasam", "వెండి కలశం", "GENERAL", "INDIVIDUAL", "Padma Rao", 45116),
  auc(3, "Youth Laddu", "యువత లడ్డు", "YOUTH", "GROUP", "Kothapalli Youth Friends", 60116),
  auc(4, "Next year idol sponsorship", "వచ్చే ఏడాది విగ్రహ స్పాన్సర్‌షిప్", "GENERAL", "GROUP", "Rythu Sangham", 40000, 2027),
];
const con = (i: number, auctionId: string, contributorName: string, amount: number): AuctionContribution => ({
  ...base(`ac-${i}`, "f-2026", "2026-09-23T10:00:00+05:30"), auctionId, contributorName, amount, method: "UPI", date: "2026-09-23",
});
const contributions: AuctionContribution[] = [
  con(1, "a-1", "Srinivas Naidu", 100000), con(2, "a-2", "Padma Rao", 45116),
  con(3, "a-3", "Ravi Kumar", 15000), con(4, "a-3", "Mahesh", 12000), con(5, "a-3", "Teja", 10000),
  con(6, "a-4", "Rythu Sangham", 10000),
];

const highlights: Highlight[] = [
  { id: "h-1", festivalId: "f-2026", titleEn: "Laddu auctioned for ₹1,51,116", titleTe: "లడ్డు ₹1,51,116కు వేలం", bodyEn: "Congratulations to Srinivas Naidu garu on winning the Ganesh Laddu.", bodyTe: "గణేష్ లడ్డు గెలుచుకున్న శ్రీనివాస్ నాయుడు గారికి అభినందనలు.", image: null, enabled: true, order: 1, relatedAuctionId: "a-1", relatedDonationId: null },
  { id: "h-2", festivalId: "f-2026", titleEn: "Annadanam served 1,200 devotees", titleTe: "1,200 మంది భక్తులకు అన్నదానం", bodyEn: "Thank you to every volunteer who made day 5 possible.", bodyTe: "ఐదవ రోజు కార్యక్రమానికి సహకరించిన ప్రతి స్వచ్ఛంద సేవకుడికి ధన్యవాదాలు.", image: null, enabled: true, order: 2, relatedAuctionId: null, relatedDonationId: null },
  { id: "h-3", festivalId: "f-2026", titleEn: "Nimajjanam on 24 September", titleTe: "సెప్టెంబర్ 24న నిమజ్జనం", bodyEn: "Procession starts 4 PM from the temple street.", bodyTe: "సాయంత్రం 4 గంటలకు గుడి వీధి నుండి ఊరేగింపు.", image: null, enabled: true, order: 3, relatedAuctionId: null, relatedDonationId: null },
];

const posts: MemoryPost[] = [
  { id: "p-1", festivalId: "f-2026", kind: "MEMORY", titleEn: "Procession night", titleTe: "ఊరేగింపు రాత్రి", body: "Drums, lights and the whole village together.", visibility: "PUBLIC", createdAt: ts("2026-09-20"), media: [{ id: "m-1", postId: "p-1", kind: "IMAGE", url: "gallery-procession", caption: null }] },
  { id: "p-2", festivalId: "f-2026", kind: "CONGRATULATIONS", titleEn: "Prasadam ready", titleTe: "ప్రసాదం సిద్ధం", body: "Thanks to the kitchen team.", visibility: "PUBLIC", createdAt: ts("2026-09-18"), media: [{ id: "m-2", postId: "p-2", kind: "IMAGE", url: "gallery-laddu", caption: null }] },
  { id: "p-3", festivalId: "f-2026", kind: "MEMORY", titleEn: "Youth team meeting", titleTe: "యువత సమావేశం", body: "Planning the nimajjanam route.", visibility: "YOUTH", createdAt: ts("2026-09-15"), media: [{ id: "m-3", postId: "p-3", kind: "IMAGE", url: "idol-2026", caption: null }] },
];

const notifications: AppNotification[] = [];
const preferences: NotificationPreferences[] = [];
const audit: AuditLog[] = [
  { id: "al-1", actorId: "u-admin", action: "STATUS_CHANGE", entity: "festival", recordId: "f-2026", oldValue: "PLANNING", newValue: "ACTIVE", reason: "Festival started", at: ts("2026-09-14T06:00:00+05:30") },
];

export const db = {
  festivals, branding, users, userPermissions, memberships, categories, donations, expenses,
  auctions, contributions, highlights, posts, notifications, preferences, audit,
};

let seq = 1000;
export const newId = (p: string) => `${p}-${++seq}`;

export function writeAudit(entry: Omit<AuditLog, "id" | "at">) {
  db.audit.unshift({ ...entry, id: newId("al"), at: new Date().toISOString() });
}

export function notify(userIds: string[], n: Omit<AppNotification, "id" | "userId" | "read" | "createdAt">) {
  for (const userId of userIds) {
    const pref = db.preferences.find((p) => p.userId === userId);
    if (pref && pref.kinds[n.kind] === false) continue;
    db.notifications.unshift({ ...n, id: newId("n"), userId, read: false, createdAt: new Date().toISOString() });
  }
}

// Seed audit trail and festival-aware notifications for demo users
db.audit.push(
  { id: "al-2", actorId: "u-admin", action: "STATUS_CHANGE", entity: "festival", recordId: "f-2025", oldValue: "CLOSED", newValue: "ARCHIVED", reason: "Accounts audited and published", at: ts("2025-10-15T10:00:00+05:30") },
  { id: "al-3", actorId: "u-admin", action: "CREATE", entity: "auction", recordId: "a-4", oldValue: null, newValue: "Next year idol sponsorship → 2027", reason: null, at: ts("2026-09-22T20:00:00+05:30") },
);
db.audit.sort((a, b) => b.at.localeCompare(a.at));
notify(["u-admin", "u-youth", "u-general"], { festivalId: "f-2025", kind: "SYSTEM", titleEn: "2025 accounts archived", titleTe: "2025 లెక్కలు భద్రపరచబడ్డాయి", bodyEn: "Final 2025 report is available under Previous Years.", bodyTe: "2025 తుది నివేదిక గత సంవత్సరాలలో అందుబాటులో ఉంది." });
db.notifications.forEach((n) => (n.read = true));
notify(["u-admin"], { festivalId: "f-2027", kind: "SYSTEM", titleEn: "2027 festival created", titleTe: "2027 ఉత్సవం సృష్టించబడింది", bodyEn: "Idol sponsorship for 2027 was won in the 2026 auction.", bodyTe: "2027 విగ్రహ స్పాన్సర్‌షిప్ 2026 వేలంలో గెలుచుకున్నారు." });
// Seed a few notifications for demo users
notify(["u-admin", "u-youth", "u-general"], { festivalId: "f-2026", kind: "ANNOUNCEMENT", titleEn: "Festival 2026 is live", titleTe: "ఉత్సవాలు 2026 ప్రారంభం", bodyEn: "Follow donations and expenses openly on this site.", bodyTe: "విరాళాలు, ఖర్చులను ఈ సైట్‌లో చూడండి." });
notify(["u-youth", "u-admin"], { festivalId: "f-2026", kind: "AUCTION", titleEn: "Youth laddu contribution recorded", titleTe: "యువత లడ్డు చెల్లింపు నమోదు", bodyEn: "₹10,000 added by Teja.", bodyTe: "తేజ ₹10,000 చెల్లించారు." });
