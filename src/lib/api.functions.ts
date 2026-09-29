// Server API. ALL visibility and permission rules are enforced here, never only in the UI.
// TODO(prod-auth): replace the demo cookie identity with Lovable Cloud auth (requireSupabaseAuth)
// and move row filtering into RLS policies mirroring canView()/canSeeYouth.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  acceptsFinancialWrites, auctionPaid, auctionRemaining, can, canTransition, canView,
  derivePaymentStatus, financialSummary, live, resolveViewer, validateContribution, validateDonationSplit,
} from "@/domain/rules";
import type { Donation, Expense, NotificationKind, Permission, Viewer } from "@/domain/types";

const DEMO_COOKIE = "vvc_demo_uid";
const PAGE = 10;
const store = () => import("./store.server");

async function ctx(year?: number) {
  const { db } = await store();
  const { getCookie } = await import("@tanstack/react-start/server");
  const festival =
    (year ? db.festivals.find((f) => f.year === year) : undefined) ?? db.festivals.find((f) => f.isCurrent)!;
  const uid = getCookie(DEMO_COOKIE);
  const user = db.users.find((u) => u.id === uid) ?? null;
  const viewer = resolveViewer(user, db.userPermissions, db.memberships, festival.id);
  return { db, festival, viewer };
}
function requirePerm(v: Viewer, p: Permission) {
  if (!can(v, p)) throw new Error("PERMISSION_DENIED");
}
const yearInput = z.object({ year: z.number().int().optional() });

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, viewer } = await ctx();
  const unread = viewer.user ? db.notifications.filter((n) => n.userId === viewer.user!.id && !n.read).length : 0;
  return { viewer, unread, demoUsers: db.users.map((u) => ({ id: u.id, name: u.name, role: u.role })) };
});

export const setDemoUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { setCookie, deleteCookie } = await import("@tanstack/react-start/server");
    if (data.userId) setCookie(DEMO_COOKIE, data.userId, { path: "/", httpOnly: true, sameSite: "lax" });
    else deleteCookie(DEMO_COOKIE, { path: "/" });
    return { ok: true };
  });

export const getFestivalsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await store();
  return db.festivals
    .map((f) => {
      const summary = financialSummary(
        db.donations.filter((d) => d.festivalId === f.id), db.expenses.filter((e) => e.festivalId === f.id),
        db.auctions.filter((a) => a.festivalId === f.id), db.contributions,
      );
      return { festival: f, branding: db.branding.find((b) => b.festivalId === f.id)!, general: summary.general };
    })
    .sort((a, b) => b.festival.year - a.festival.year);
});

export const getOverviewFn = createServerFn({ method: "GET" })
  .inputValidator((d) => yearInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx(data.year);
    const fid = festival.id;
    const donations = live(db.donations.filter((d) => d.festivalId === fid));
    const expenses = live(db.expenses.filter((e) => e.festivalId === fid));
    const auctions = live(db.auctions.filter((a) => a.festivalId === fid));
    const summary = financialSummary(donations, expenses, auctions, db.contributions);
    const byCategory = (scope: "GENERAL" | "YOUTH") =>
      db.categories
        .map((c) => ({ id: c.id, nameEn: c.nameEn, nameTe: c.nameTe, amount: expenses.filter((e) => e.scope === scope && e.categoryId === c.id).reduce((s, e) => s + e.amount, 0) }))
        .filter((c) => c.amount > 0);
    return {
      festival,
      branding: db.branding.find((b) => b.festivalId === fid)!,
      viewer,
      general: summary.general,
      youth: viewer.canSeeYouth ? summary.youth : null,
      generalByCategory: byCategory("GENERAL"),
      youthByCategory: viewer.canSeeYouth ? byCategory("YOUTH") : null,
      highlights: db.highlights.filter((h) => h.festivalId === fid && h.enabled).sort((a, b) => a.order - b.order),
      counts: { donors: donations.filter((d) => d.generalAmount > 0).length, expenses: expenses.filter((e) => e.scope === "GENERAL").length, auctions: auctions.filter((a) => a.scope === "GENERAL").length },
    };
  });

const listInput = z.object({
  year: z.number().int().optional(), q: z.string().max(80).optional(),
  scope: z.enum(["ALL", "GENERAL", "YOUTH"]).optional(), page: z.number().int().min(1).optional(),
});
function paginate<T>(rows: T[], page = 1) {
  return { rows: rows.slice((page - 1) * PAGE, page * PAGE), total: rows.length, page, pageSize: PAGE };
}

export const listDonationsFn = createServerFn({ method: "GET" })
  .inputValidator((d) => listInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx(data.year);
    const q = data.q?.toLowerCase().trim();
    let rows: Donation[] = live(db.donations.filter((d) => d.festivalId === festival.id));
    if (!viewer.canSeeYouth) {
      // Public: only the general portion is visible; youth-only donations are hidden entirely.
      rows = rows.filter((d) => d.generalAmount > 0).map((d) => ({ ...d, scope: "GENERAL", totalAmount: d.generalAmount, youthAmount: 0 }));
    }
    if (data.scope === "GENERAL") rows = rows.filter((d) => d.generalAmount > 0);
    if (data.scope === "YOUTH") rows = rows.filter((d) => d.youthAmount > 0);
    if (q) rows = rows.filter((d) => d.donorName.toLowerCase().includes(q) || (d.village ?? "").toLowerCase().includes(q));
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return { ...paginate(rows, data.page), sum: rows.reduce((s, d) => s + d.totalAmount, 0), canSeeYouth: viewer.canSeeYouth, readOnly: !acceptsFinancialWrites(festival.status), canAdd: can(viewer, "DONATION_ADD") && acceptsFinancialWrites(festival.status), canDelete: can(viewer, "DONATION_DELETE") && acceptsFinancialWrites(festival.status) };
  });

export const listExpensesFn = createServerFn({ method: "GET" })
  .inputValidator((d) => listInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx(data.year);
    const q = data.q?.toLowerCase().trim();
    let rows: Expense[] = live(db.expenses.filter((e) => e.festivalId === festival.id));
    if (!viewer.canSeeYouth) rows = rows.filter((e) => e.scope === "GENERAL");
    if (data.scope && data.scope !== "ALL") rows = rows.filter((e) => e.scope === data.scope);
    if (q) rows = rows.filter((e) => e.description.toLowerCase().includes(q) || (e.paidTo ?? "").toLowerCase().includes(q));
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return { ...paginate(rows, data.page), sum: rows.reduce((s, e) => s + e.amount, 0), categories: db.categories, canSeeYouth: viewer.canSeeYouth, readOnly: !acceptsFinancialWrites(festival.status), canAdd: can(viewer, "EXPENSE_ADD") && acceptsFinancialWrites(festival.status), canDelete: can(viewer, "EXPENSE_DELETE") && acceptsFinancialWrites(festival.status) };
  });

export const listAuctionsFn = createServerFn({ method: "GET" })
  .inputValidator((d) => yearInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx(data.year);
    const auctions = live(db.auctions.filter((a) => a.festivalId === festival.id));
    return {
      readOnly: !acceptsFinancialWrites(festival.status),
      canAddContribution: can(viewer, "CONTRIBUTION_ADD") && acceptsFinancialWrites(festival.status),
      auctions: auctions.map((a) => {
        const hideContributors = !viewer.canSeeYouth && (a.scope === "YOUTH" || a.winnerType === "GROUP");
        const cs = live(db.contributions.filter((c) => c.auctionId === a.id));
        return {
          auction: { ...a, paymentStatus: derivePaymentStatus(a, db.contributions) },
          paid: auctionPaid(a, db.contributions),
          remaining: auctionRemaining(a, db.contributions),
          contributionCount: cs.length,
          contributions: hideContributors ? null : cs.map((c) => ({ id: c.id, contributorName: c.contributorName, amount: c.amount, date: c.date })),
        };
      }),
    };
  });

export const listGalleryFn = createServerFn({ method: "GET" })
  .inputValidator((d) => yearInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx(data.year);
    return db.posts.filter((p) => p.festivalId === festival.id && canView(viewer, p.visibility));
  });

// ---------- Mutations ----------
const method = z.enum(["CASH", "PHONEPE", "GOOGLE_PAY", "UPI", "BANK_TRANSFER", "OTHER"]);

export const addDonationFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    donorName: z.string().trim().min(1).max(120), village: z.string().trim().max(80).nullable(),
    scope: z.enum(["GENERAL", "YOUTH", "BOTH"]), totalAmount: z.number().positive().max(10_000_000),
    generalAmount: z.number().min(0), youthAmount: z.number().min(0), method, date: z.string().min(10).max(10),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requirePerm(viewer, "DONATION_ADD");
    if (data.scope !== "GENERAL" && !viewer.canSeeYouth) throw new Error("PERMISSION_DENIED");
    if (!acceptsFinancialWrites(festival.status)) throw new Error("Festival is not accepting changes");
    const err = validateDonationSplit(data);
    if (err) throw new Error(err);
    const { newId, writeAudit, notify } = await store();
    const rec: Donation = {
      ...data, id: newId("d"), festivalId: festival.id, createdBy: viewer.user!.id, createdAt: new Date().toISOString(),
      status: viewer.isAdmin ? "APPROVED" : "PENDING_APPROVAL", deletedAt: null, deleteReason: null, proofUrl: null, note: null,
    };
    db.donations.push(rec);
    writeAudit({ actorId: viewer.user!.id, action: "CREATE", entity: "donation", recordId: rec.id, oldValue: null, newValue: JSON.stringify(data), reason: null });
    notify(db.users.filter((u) => u.role === "ADMIN" && u.id !== viewer.user!.id).map((u) => u.id), {
      festivalId: festival.id, kind: "DONATION", titleEn: "New donation recorded", titleTe: "కొత్త విరాళం నమోదు",
      bodyEn: `${data.donorName} — ₹${data.totalAmount}`, bodyTe: `${data.donorName} — ₹${data.totalAmount}`,
    });
    return { id: rec.id };
  });

export const addExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    scope: z.enum(["GENERAL", "YOUTH"]), categoryId: z.string(), description: z.string().trim().min(1).max(200),
    amount: z.number().positive().max(10_000_000), paidTo: z.string().trim().max(120).nullable(), date: z.string().min(10).max(10),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requirePerm(viewer, "EXPENSE_ADD");
    if (data.scope === "YOUTH" && !viewer.canSeeYouth) throw new Error("PERMISSION_DENIED");
    if (!acceptsFinancialWrites(festival.status)) throw new Error("Festival is not accepting changes");
    const { newId, writeAudit } = await store();
    const rec: Expense = { ...data, id: newId("e"), festivalId: festival.id, createdBy: viewer.user!.id, createdAt: new Date().toISOString(), status: "APPROVED", deletedAt: null, deleteReason: null, receiptUrl: null };
    db.expenses.push(rec);
    writeAudit({ actorId: viewer.user!.id, action: "CREATE", entity: "expense", recordId: rec.id, oldValue: null, newValue: JSON.stringify(data), reason: null });
    return { id: rec.id };
  });

export const addContributionFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ auctionId: z.string(), contributorName: z.string().trim().min(1).max(120), amount: z.number().positive(), method }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requirePerm(viewer, "CONTRIBUTION_ADD");
    const a = db.auctions.find((x) => x.id === data.auctionId && !x.deletedAt);
    if (!a) throw new Error("Auction not found");
    if (a.scope === "YOUTH" && !viewer.canSeeYouth) throw new Error("PERMISSION_DENIED");
    const af = db.festivals.find((f) => f.id === a.festivalId);
    if (!af || !acceptsFinancialWrites(af.status)) throw new Error("Festival is closed — records are read-only");
    const err = validateContribution(a, db.contributions, data.amount);
    if (err) throw new Error(err);
    const { newId, writeAudit } = await store();
    const today = new Date().toISOString().slice(0, 10);
    const id = newId("ac");
    db.contributions.push({ ...data, id, festivalId: festival.id, createdBy: viewer.user!.id, createdAt: new Date().toISOString(), status: "APPROVED", deletedAt: null, deleteReason: null, date: today });
    writeAudit({ actorId: viewer.user!.id, action: "CREATE", entity: "auction_contribution", recordId: id, oldValue: null, newValue: JSON.stringify(data), reason: null });
    return { id };
  });

export const softDeleteFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ entity: z.enum(["donation", "expense"]), id: z.string(), reason: z.string().trim().min(3).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requirePerm(viewer, data.entity === "donation" ? "DONATION_DELETE" : "EXPENSE_DELETE");
    const list: Array<Donation | Expense> = data.entity === "donation" ? db.donations : db.expenses;
    const rec = list.find((r) => r.id === data.id && !r.deletedAt);
    if (!rec) throw new Error("Record not found");
    const rf = db.festivals.find((f) => f.id === rec.festivalId);
    if (!rf || !acceptsFinancialWrites(rf.status)) throw new Error("Festival is closed — records are read-only");
    const old = JSON.stringify(rec);
    rec.deletedAt = new Date().toISOString();
    rec.deleteReason = data.reason;
    const { writeAudit } = await store();
    writeAudit({ actorId: viewer.user!.id, action: "SOFT_DELETE", entity: data.entity, recordId: rec.id, oldValue: old, newValue: null, reason: data.reason });
    return { ok: true };
  });

// ---------- Notifications ----------
export const listNotificationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, viewer } = await ctx();
  if (!viewer.user) return { signedIn: false as const, items: [], prefs: null, festivals: [] };
  const prefs = db.preferences.find((p) => p.userId === viewer.user!.id) ?? null;
  return { signedIn: true as const, items: db.notifications.filter((n) => n.userId === viewer.user!.id), prefs, festivals: db.festivals.map((f) => ({ id: f.id, year: f.year })) };
});
export const markReadFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    if (!viewer.user) throw new Error("UNAUTHENTICATED");
    db.notifications.filter((n) => n.userId === viewer.user!.id && (data.id === null || n.id === data.id)).forEach((n) => (n.read = true));
    return { ok: true };
  });
const kinds = z.enum(["ANNOUNCEMENT", "DONATION", "EXPENSE", "AUCTION", "APPROVAL", "SYSTEM"]);
export const setPreferenceFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ kind: kinds, enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    if (!viewer.user) throw new Error("UNAUTHENTICATED");
    let p = db.preferences.find((x) => x.userId === viewer.user!.id);
    if (!p) {
      const all = { ANNOUNCEMENT: true, DONATION: true, EXPENSE: true, AUCTION: true, APPROVAL: true, SYSTEM: true } satisfies Record<NotificationKind, boolean>;
      p = { userId: viewer.user.id, kinds: all };
      db.preferences.push(p);
    }
    p.kinds[data.kind] = data.enabled;
    return { ok: true };
  });

// ---------- Admin ----------
function requireAdmin(v: Viewer) {
  if (!v.isAdmin) throw new Error("PERMISSION_DENIED");
}
export const getAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, viewer } = await ctx();
  if (!viewer.isAdmin) return { denied: true as const };
  return {
    denied: false as const,
    festivals: db.festivals.map((f) => ({ ...f, name: db.branding.find((b) => b.festivalId === f.id)!.nameEn })),
    highlights: [...db.highlights].sort((a, b) => a.order - b.order),
    users: db.users.map((u) => ({ ...u, permissions: db.userPermissions.filter((p) => p.userId === u.id).map((p) => p.permission) })),
    audit: db.audit.slice(0, 50).map((a) => ({ ...a, actor: db.users.find((u) => u.id === a.actorId)?.name ?? a.actorId })),
  };
});
export const toggleHighlightFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string(), enabled: z.boolean().optional(), move: z.enum(["up", "down"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const list = db.highlights.filter((h) => h.festivalId === db.highlights.find((x) => x.id === data.id)?.festivalId).sort((a, b) => a.order - b.order);
    const i = list.findIndex((h) => h.id === data.id);
    if (i < 0) throw new Error("Not found");
    const cur = list[i]!;
    if (data.enabled !== undefined) cur.enabled = data.enabled;
    const j = data.move === "up" ? i - 1 : data.move === "down" ? i + 1 : -1;
    const other = list[j];
    if (other) [cur.order, other.order] = [other.order, cur.order];
    return { ok: true };
  });
export const advanceFestivalFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string(), to: z.enum(["PLANNING", "ACTIVE", "FINAL_REVIEW", "CLOSED", "ARCHIVED"]), reason: z.string().trim().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const f = db.festivals.find((x) => x.id === data.id);
    if (!f || !canTransition(f.status, data.to)) throw new Error("Invalid lifecycle transition");
    const { writeAudit } = await store();
    writeAudit({ actorId: viewer.user!.id, action: "STATUS_CHANGE", entity: "festival", recordId: f.id, oldValue: f.status, newValue: data.to, reason: data.reason });
    f.status = data.to;
    return { ok: true };
  });
export const announceFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ titleEn: z.string().trim().min(1).max(120), titleTe: z.string().trim().max(120), body: z.string().trim().max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requireAdmin(viewer);
    const { notify } = await store();
    notify(db.users.map((u) => u.id), { festivalId: festival.id, kind: "ANNOUNCEMENT", titleEn: data.titleEn, titleTe: data.titleTe || data.titleEn, bodyEn: data.body, bodyTe: data.body });
    return { ok: true };
  });

// ---------- Detail views (visibility enforced) ----------
const idInput = z.object({ id: z.string().min(1).max(60) });
const audience = (db: Awaited<ReturnType<typeof store>>["db"], recordId: string) =>
  db.audit.filter((a) => a.recordId === recordId).map((a) => ({ ...a, actor: db.users.find((u) => u.id === a.actorId)?.name ?? a.actorId }));

export const getDonationFn = createServerFn({ method: "GET" })
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    const d = db.donations.find((x) => x.id === data.id && !x.deletedAt);
    if (!d) throw new Error("NOT_FOUND");
    const festival = db.festivals.find((f) => f.id === d.festivalId)!;
    const v = resolveViewer(viewer.user, db.userPermissions, db.memberships, festival.id);
    if (!v.canSeeYouth && d.generalAmount <= 0) throw new Error("NOT_FOUND");
    const donation: Donation = v.canSeeYouth ? d : { ...d, scope: "GENERAL", totalAmount: d.generalAmount, youthAmount: 0, note: null };
    return { donation, festival, canSeeYouth: v.canSeeYouth, history: v.isAdmin ? audience(db, d.id) : [] };
  });

export const getExpenseFn = createServerFn({ method: "GET" })
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    const e = db.expenses.find((x) => x.id === data.id && !x.deletedAt);
    if (!e) throw new Error("NOT_FOUND");
    const festival = db.festivals.find((f) => f.id === e.festivalId)!;
    const v = resolveViewer(viewer.user, db.userPermissions, db.memberships, festival.id);
    if (e.scope === "YOUTH" && !v.canSeeYouth) throw new Error("NOT_FOUND");
    return { expense: e, category: db.categories.find((c) => c.id === e.categoryId) ?? null, festival, history: v.isAdmin ? audience(db, e.id) : [] };
  });

export const getAuctionFn = createServerFn({ method: "GET" })
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    const a = db.auctions.find((x) => x.id === data.id && !x.deletedAt);
    if (!a) throw new Error("NOT_FOUND");
    const festival = db.festivals.find((f) => f.id === a.festivalId)!;
    const v = resolveViewer(viewer.user, db.userPermissions, db.memberships, festival.id);
    const hide = !v.canSeeYouth && (a.scope === "YOUTH" || a.winnerType === "GROUP");
    const cs = live(db.contributions.filter((c) => c.auctionId === a.id));
    return {
      festival,
      readOnly: !acceptsFinancialWrites(festival.status),
      canContribute: can(v, "CONTRIBUTION_ADD") && acceptsFinancialWrites(festival.status) && (a.scope === "GENERAL" || v.canSeeYouth),
      view: {
        auction: { ...a, paymentStatus: derivePaymentStatus(a, db.contributions) },
        paid: auctionPaid(a, db.contributions), remaining: auctionRemaining(a, db.contributions), contributionCount: cs.length,
        contributions: hide ? null : cs.map((c) => ({ id: c.id, contributorName: c.contributorName, amount: c.amount, date: c.date })),
      },
    };
  });

// ---------- Youth ----------
export const getYouthFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, festival, viewer } = await ctx();
  if (!viewer.canSeeYouth) return { denied: true as const };
  const fid = festival.id;
  const donations = live(db.donations.filter((d) => d.festivalId === fid));
  const expenses = live(db.expenses.filter((e) => e.festivalId === fid));
  const auctions = live(db.auctions.filter((a) => a.festivalId === fid));
  const s = financialSummary(donations, expenses, auctions, db.contributions);
  return {
    denied: false as const, festival, youth: s.youth, general: s.general,
    youthDonations: donations.filter((d) => d.youthAmount > 0).sort((a, b) => b.date.localeCompare(a.date)),
    youthExpenses: expenses.filter((e) => e.scope === "YOUTH"),
    categories: db.categories,
    members: db.memberships.filter((m) => m.festivalId === fid && m.youth).map((m) => ({ ...m, name: db.users.find((u) => u.id === m.userId)?.name ?? m.userId })),
  };
});

// ---------- Admin extras ----------
export const getAdminDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, festival, viewer } = await ctx();
  if (!viewer.isAdmin) return { denied: true as const };
  const fid = festival.id;
  return {
    denied: false as const, festival,
    branding: db.branding.find((b) => b.festivalId === fid)!,
    donations: db.donations.filter((d) => d.festivalId === fid).sort((a, b) => b.date.localeCompare(a.date)),
    expenses: db.expenses.filter((e) => e.festivalId === fid).sort((a, b) => b.date.localeCompare(a.date)),
    categories: db.categories,
    auctions: live(db.auctions.filter((a) => a.festivalId === fid)).map((a) => ({
      auction: { ...a, paymentStatus: derivePaymentStatus(a, db.contributions) }, paid: auctionPaid(a, db.contributions),
      remaining: auctionRemaining(a, db.contributions), contributionCount: live(db.contributions.filter((c) => c.auctionId === a.id)).length,
      contributions: live(db.contributions.filter((c) => c.auctionId === a.id)).map((c) => ({ id: c.id, contributorName: c.contributorName, amount: c.amount, date: c.date })),
    })),
    posts: db.posts.filter((p) => p.festivalId === fid),
    sentNotifications: db.notifications.filter((n) => n.kind === "ANNOUNCEMENT").length,
    summary: financialSummary(db.donations.filter((d) => d.festivalId === fid), db.expenses.filter((e) => e.festivalId === fid), db.auctions.filter((a) => a.festivalId === fid), db.contributions),
  };
});

export const setPermissionFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string(), permission: z.string(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requireAdmin(viewer);
    const { PERMISSIONS } = await import("@/domain/types");
    const perm = PERMISSIONS.find((p) => p === data.permission);
    if (!perm) throw new Error("Unknown permission");
    const i = db.userPermissions.findIndex((p) => p.userId === data.userId && p.permission === perm && p.festivalId === festival.id);
    if (data.enabled && i < 0) db.userPermissions.push({ userId: data.userId, permission: perm, festivalId: festival.id });
    if (!data.enabled && i >= 0) db.userPermissions.splice(i, 1);
    if (perm === "YOUTH_ACCESS") {
      const m = db.memberships.find((x) => x.userId === data.userId && x.festivalId === festival.id);
      if (m) { m.youth = data.enabled; m.approved = data.enabled; } else if (data.enabled) db.memberships.push({ userId: data.userId, festivalId: festival.id, youth: true, approved: true });
    }
    const { writeAudit } = await store();
    writeAudit({ actorId: viewer.user!.id, action: "UPDATE", entity: "user_permission", recordId: data.userId, oldValue: null, newValue: `${perm}=${data.enabled}`, reason: null });
    return { ok: true };
  });

export const setPostVisibilityFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string(), visibility: z.enum(["PUBLIC", "YOUTH", "ADMIN"]) }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const p = db.posts.find((x) => x.id === data.id);
    if (!p) throw new Error("Not found");
    const { writeAudit } = await store();
    writeAudit({ actorId: viewer.user!.id, action: "UPDATE", entity: "memory_post", recordId: p.id, oldValue: p.visibility, newValue: data.visibility, reason: null });
    p.visibility = data.visibility;
    return { ok: true };
  });

export const approveRecordFn = createServerFn({ method: "POST" })
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requirePerm(viewer, "APPROVE_RECORDS");
    if (!acceptsFinancialWrites(festival.status)) throw new Error("Festival is closed — records are read-only");
    const d = db.donations.find((x) => x.id === data.id);
    if (!d) throw new Error("Not found");
    d.status = "APPROVED";
    const { writeAudit } = await store();
    writeAudit({ actorId: viewer.user!.id, action: "APPROVE", entity: "donation", recordId: d.id, oldValue: "PENDING_APPROVAL", newValue: "APPROVED", reason: null });
    return { ok: true };
  });

export const exportReportFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ kind: z.enum(["donations", "expenses", "auctions"]) }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requireAdmin(viewer);
    const esc = (v: string | number | null) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const fid = festival.id;
    let rows: Array<Array<string | number | null>>;
    if (data.kind === "donations") rows = [["Date", "Donor", "Village", "Scope", "Total", "General", "Youth", "Method", "Status"], ...live(db.donations.filter((d) => d.festivalId === fid)).map((d) => [d.date, d.donorName, d.village, d.scope, d.totalAmount, d.generalAmount, d.youthAmount, d.method, d.status])];
    else if (data.kind === "expenses") rows = [["Date", "Scope", "Category", "Description", "Amount", "Paid to"], ...live(db.expenses.filter((e) => e.festivalId === fid)).map((e) => [e.date, e.scope, db.categories.find((c) => c.id === e.categoryId)?.nameEn ?? "", e.description, e.amount, e.paidTo])];
    else rows = [["Item", "Scope", "Winner", "Final", "Paid", "Remaining", "For year"], ...live(db.auctions.filter((a) => a.festivalId === fid)).map((a) => [a.itemEn, a.scope, a.winnerName, a.finalAmount, auctionPaid(a, db.contributions), auctionRemaining(a, db.contributions), a.forFestivalYear])];
    return { filename: `${data.kind}-${festival.year}.csv`, csv: rows.map((r) => r.map(esc).join(",")).join("\n") };
  });
