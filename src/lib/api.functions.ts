// Server API. ALL visibility and permission rules are enforced here, never only in the UI.
// TODO(prod-auth): replace the demo cookie identity with Lovable Cloud auth (requireSupabaseAuth)
// and move row filtering into RLS policies mirroring canView()/canSeeYouth.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  acceptsFinancialWrites, auctionPaid, auctionRemaining, can, canTransition, canView,
  derivePaymentStatus, financialSummary, live, resolveViewer, validateContribution, validateDonationSplit,
} from "@/domain/rules";
import type { Auction, Donation, Expense, Festival, FestivalBranding, Highlight, MemoryPost, NotificationKind, Permission, User, Viewer } from "@/domain/types";

const defaultBranding: FestivalBranding = {
  festivalId: "", nameEn: "Sri Vinayaka Chavithi", nameTe: "శ్రీ వినాయక చవితి",
  taglineEn: "Every rupee accounted, every devotee welcome", taglineTe: "ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం",
  siteNameEn: "Chinnagollapalli Vinayaka Chavithi", siteNameTe: "చిన్నగొల్లపల్లి వినాయక చవితి",
  idolImage: null, bannerImage: null, logo: null, accentHue: 38, openingBalanceGeneral: 0, openingBalanceYouth: 0
};

const DEMO_COOKIE = "vvc_demo_uid";
const PAGE = 10;
const store = () => import("./store.server");

async function ctx(year?: number) {
  const { ensureDb } = await store();
  const db = await ensureDb();
  let uid: string | undefined = undefined;
  // Try multiple approaches to read the cookie (Cloudflare Workers compatibility)
  try {
    const { getCookie } = await import("@tanstack/react-start/server");
    uid = getCookie(DEMO_COOKIE);
  } catch {}
  // Fallback: parse cookies from the raw web request (works on Cloudflare Workers)
  if (!uid) {
    try {
      const { getWebRequest } = await import("@tanstack/react-start/server");
      const req = getWebRequest();
      const cookieHeader = req?.headers?.get?.("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEMO_COOKIE}=([^;]*)`));
      if (match?.[1]) uid = decodeURIComponent(match[1]);
    } catch {}
  }
  // Fallback 2: h3 event (Nitro runtime)
  if (!uid) {
    try {
      const { getEvent, parseCookies } = await import("h3");
      const event = getEvent();
      if (event) {
        const cookies = parseCookies(event);
        uid = cookies[DEMO_COOKIE];
      }
    } catch {}
  }
  const festival =
    ((year ? db.festivals.find((f) => f.year === year) : undefined) ?? 
    db.festivals.find((f) => f.isCurrent) ?? 
    db.festivals[0]) || { id: "fest-2026", year: 2026, status: "ACTIVE", isCurrent: true, startDate: "2026-09-14", endDate: "2026-09-24" };
  const user = uid ? (db.users || []).find((u) => u.id === uid) ?? null : null;
  const viewer = resolveViewer(user, db.userPermissions || [], db.memberships || [], festival.id);
  return { db, festival, viewer };
}
function requirePerm(v: Viewer, p: Permission) {
  if (!can(v, p)) throw new Error("PERMISSION_DENIED");
}
const yearInput = z.object({ year: z.number().int().optional() });

// Debug endpoint to diagnose cookie reading on Cloudflare Workers
export const debugSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const results: Record<string, any> = { methods: {} };
  // Method 1: TanStack getCookie
  try {
    const { getCookie } = await import("@tanstack/react-start/server");
    const val = getCookie(DEMO_COOKIE);
    results.methods.tanstackGetCookie = { success: true, value: val || null };
  } catch (e: any) {
    results.methods.tanstackGetCookie = { success: false, error: e?.message || String(e) };
  }
  // Method 2: getWebRequest
  try {
    const { getWebRequest } = await import("@tanstack/react-start/server");
    const req = getWebRequest();
    const cookieHeader = req?.headers?.get?.("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEMO_COOKIE}=([^;]*)`));
    results.methods.webRequest = { success: true, cookieHeader: cookieHeader.substring(0, 200), parsedUid: match?.[1] || null };
  } catch (e: any) {
    results.methods.webRequest = { success: false, error: e?.message || String(e) };
  }
  // Method 3: h3 event
  try {
    const h3 = await import("h3");
    const event = (h3 as any).getEvent?.();
    if (event) {
      const cookies = h3.parseCookies(event);
      results.methods.h3Event = { success: true, uid: cookies[DEMO_COOKIE] || null };
    } else {
      results.methods.h3Event = { success: false, error: "getEvent not available or returned null" };
    }
  } catch (e: any) {
    results.methods.h3Event = { success: false, error: e?.message || String(e) };
  }
  // Also check store users
  const { ensureDb } = await store();
  const db = await ensureDb();
  results.userCount = db.users?.length || 0;
  results.userIds = (db.users || []).slice(0, 5).map(u => ({ id: u.id.substring(0, 8) + "...", name: u.name, role: u.role }));
  return results;
});

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, festival, viewer } = await ctx();
  const safeViewer = viewer || { user: null, permissions: [], isAdmin: false, canSeeYouth: false };
  const unread = safeViewer.user ? (db.notifications || []).filter((n) => n.userId === safeViewer.user!.id && !n.read).length : 0;
  const branding = (db.branding || []).find((b) => b.festivalId === festival?.id) ?? db.branding?.[0];
  const siteName = {
    en: branding?.siteNameEn || branding?.nameEn || "Chinnagollapalli Vinayaka Chavithi",
    te: branding?.siteNameTe || branding?.nameTe || "చిన్నగొల్లపల్లి వినాయక చవితి",
  };
  const logoUrl = branding?.logo ?? null;
  return {
    viewer: safeViewer,
    unread,
    demoUsers: (db.users || []).map((u) => {
      const isYouth = (db.userPermissions || []).some((p) => p.userId === u.id && p.permission === "YOUTH_ACCESS");
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        isYouth,
        subtitleEn: u.role === "ADMIN" ? "Admin" : isYouth ? "Youth Member" : "General Devotee",
        subtitleTe: u.role === "ADMIN" ? "నిర్వాహకులు" : isYouth ? "యువత సభ్యుడు" : "సాధారణ భక్తుడు",
      };
    }),
    siteName,
    logoUrl,
  };
});

export const setDemoUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { setCookie, deleteCookie } = await import("@tanstack/react-start/server");
    if (data.userId) setCookie(DEMO_COOKIE, data.userId, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 31536000 });
    else deleteCookie(DEMO_COOKIE, { path: "/" });
    return { ok: true };
  });

export const loginUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    identifier: z.string().trim().min(1, "Phone number or username is required"),
    password: z.string().min(1, "Password is required"),
  }).parse(d))
  .handler(async ({ data }) => {
    const { sql } = await import("./db.server");
    const { ensureDb } = await store();
    const db = await ensureDb();
    const clean = data.identifier.trim();
    type DbUserRow = {
      id: string;
      full_name: string;
      phone: string | null;
      email: string | null;
      role: string;
      hashed_password?: string | null;
      is_active: boolean;
    };
    let userRow: DbUserRow | undefined = undefined;
    try {
      const rows = await sql`
        SELECT id, full_name, phone, email, role, hashed_password, is_active
        FROM users
        WHERE (phone = ${clean} OR email = ${clean.toLowerCase()} OR LOWER(full_name) = ${clean.toLowerCase()})
          AND is_active = true
        LIMIT 1
      `;
      userRow = rows[0] as unknown as DbUserRow | undefined;
    } catch (err) {
      console.warn("Direct DB login query error, checking store:", err);
    }
    if (!userRow) {
      const memUser = (db.users || []).find(
        (u) => u.phone === clean || (u.name && u.name.toLowerCase() === clean.toLowerCase()) || (u.role === "ADMIN" && (clean === "admin" || clean === "9999999999"))
      );
      if (memUser) {
        userRow = {
          id: memUser.id,
          full_name: memUser.name,
          phone: memUser.phone,
          email: null,
          role: memUser.role,
          hashed_password: null,
          is_active: true,
        };
      }
    }
    if (!userRow) {
      throw new Error("USER_NOT_FOUND");
    }
    const bcrypt = await import("bcryptjs");
    let match = false;
    if (userRow.hashed_password) {
      try {
        match = bcrypt.compareSync(data.password, userRow.hashed_password);
      } catch {
        match = false;
      }
    }
    // Default seeded passwords fallback
    if (!match) {
      if (userRow.role === "ADMIN" && (data.password === "admin123" || data.password === "admin")) match = true;
      if (userRow.phone === "9000000002" && data.password === "youth123") match = true;
      if (userRow.phone === "9000000003" && data.password === "user123") match = true;
    }
    if (!match) {
      throw new Error("INVALID_PASSWORD");
    }

    try {
      await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${userRow.id}`;
    } catch {}

    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(DEMO_COOKIE, userRow.id, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 31536000 });

    const existing = db.users.find((u) => u.id === userRow.id);
    if (existing) {
      existing.name = userRow.full_name;
      existing.role = userRow.role === "ADMIN" ? "ADMIN" : "GENERAL";
      existing.active = Boolean(userRow.is_active);
      existing.phone = userRow.phone || "9000000000";
    } else {
      db.users.push({
        id: userRow.id,
        name: userRow.full_name,
        phone: userRow.phone || "9000000000",
        role: userRow.role === "ADMIN" ? "ADMIN" : "GENERAL",
        active: Boolean(userRow.is_active),
      });
    }

    return {
      ok: true,
      user: {
        id: userRow.id,
        name: userRow.full_name,
        role: userRow.role,
        phone: userRow.phone,
      },
    };
  });

export const registerUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    phone: z.string().trim().regex(/^\d{10}$/, "Please enter a valid 10-digit mobile number"),
    password: z.string().min(4, "Password must be at least 4 characters").max(50),
    village: z.string().trim().max(80).optional(),
    preferredLanguage: z.enum(["en", "te"]).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { sql } = await import("./db.server");
    const { newId, ensureDb } = await store();
    const db = await ensureDb();

    // Check if phone already registered
    const existing = await sql`
      SELECT id FROM users WHERE phone = ${data.phone} LIMIT 1
    `;
    if (existing && existing.length > 0) {
      throw new Error("PHONE_ALREADY_EXISTS");
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const crypto = await import("node:crypto");
    const id = crypto.randomUUID();
    const email = `${data.phone}@vinayachavithi.local`;
    const lang = data.preferredLanguage || "en";

    await sql`
      INSERT INTO users (
        id, full_name, phone, email, hashed_password, role, is_active, preferred_language, created_at, updated_at
      ) VALUES (
        ${id}, ${data.name}, ${data.phone}, ${email}, ${hashedPassword}, 'GENERAL', true, ${lang}, NOW(), NOW()
      )
    `;

    const newUser: User = {
      id,
      name: data.name,
      phone: data.phone,
      role: "GENERAL",
      active: true,
    };
    db.users.push(newUser);

    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(DEMO_COOKIE, id, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 31536000 });

    return {
      ok: true,
      user: {
        id,
        name: data.name,
        phone: data.phone,
        role: "GENERAL",
      },
    };
  });

export const logoutUserFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const { deleteCookie } = await import("@tanstack/react-start/server");
    deleteCookie(DEMO_COOKIE, { path: "/" });
    return { ok: true };
  });

export const getFestivalsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureDb } = await store();
  const db = await ensureDb();
  return db.festivals
    .map((f) => {
      const b = db.branding.find((b) => b.festivalId === f.id) ?? db.branding[0] ?? defaultBranding;
      const summary = financialSummary(
        db.donations.filter((d) => d.festivalId === f.id), db.expenses.filter((e) => e.festivalId === f.id),
        db.auctions.filter((a) => a.festivalId === f.id), db.contributions,
        { general: b.openingBalanceGeneral ?? 0, youth: b.openingBalanceYouth ?? 0 }
      );
      return { festival: f, branding: b, general: summary.general };
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
    const branding = db.branding.find((b) => b.festivalId === fid) ?? db.branding[0] ?? defaultBranding;
    const summary = financialSummary(donations, expenses, auctions, db.contributions, {
      general: branding?.openingBalanceGeneral ?? 0,
      youth: branding?.openingBalanceYouth ?? 0,
    });
    const byCategory = (scope: "GENERAL" | "YOUTH") =>
      db.categories
        .map((c) => ({ id: c.id, nameEn: c.nameEn, nameTe: c.nameTe, amount: expenses.filter((e) => e.scope === scope && e.categoryId === c.id).reduce((s, e) => s + e.amount, 0) }))
        .filter((c) => c.amount > 0);
    return {
      festival,
      branding,
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
    if (q) rows = rows.filter((d) => d.donorName.toLowerCase().includes(q) || (d.donorNameTe ?? "").toLowerCase().includes(q) || (d.village ?? "").toLowerCase().includes(q));
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
    donorName: z.string().trim().min(1).max(120), donorNameTe: z.string().trim().max(120).nullable().optional(),
    village: z.string().trim().max(80).nullable(),
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
    const { newId, writeAudit, notify, persistDonation } = await store();
    const rec: Donation = {
      ...data, donorNameTe: data.donorNameTe || null, id: newId("d"), festivalId: festival.id, createdBy: viewer.user!.id, createdAt: new Date().toISOString(),
      status: "APPROVED", deletedAt: null, deleteReason: null, proofUrl: null, note: null,
    };
    db.donations.push(rec);
    await persistDonation(rec);
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
    const { newId, writeAudit, persistExpense } = await store();
    const rec: Expense = { ...data, id: newId("e"), festivalId: festival.id, createdBy: viewer.user!.id, createdAt: new Date().toISOString(), status: "APPROVED", deletedAt: null, deleteReason: null, receiptUrl: null };
    db.expenses.push(rec);
    await persistExpense(rec);
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
    const { newId, writeAudit, persistContribution } = await store();
    const today = new Date().toISOString().slice(0, 10);
    const id = newId("ac");
    const rec = { ...data, id, festivalId: festival.id, createdBy: viewer.user!.id, createdAt: new Date().toISOString(), status: "APPROVED" as const, deletedAt: null, deleteReason: null, date: today };
    db.contributions.push(rec);
    await persistContribution(rec);
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
    const { writeAudit, persistSoftDelete } = await store();
    await persistSoftDelete(data.entity, data.id, data.reason);
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
    festivals: db.festivals.map((f) => {
      const b = db.branding.find((b) => b.festivalId === f.id);
      return {
        ...f,
        name: b?.nameEn || `Festival ${f.year}`,
        nameEn: b?.nameEn || `Festival ${f.year}`,
        nameTe: b?.nameTe || `ఉత్సవం ${f.year}`,
        openingBalanceGeneral: b?.openingBalanceGeneral || 0,
        openingBalanceYouth: b?.openingBalanceYouth || 0,
      };
    }).sort((a, b) => b.year - a.year),
    highlights: [...db.highlights].sort((a, b) => a.order - b.order),
    users: db.users.map((u) => ({ ...u, permissions: db.userPermissions.filter((p) => p.userId === u.id).map((p) => p.permission) })),
    audit: db.audit.slice(0, 50).map((a) => {
      const u = db.users.find((u) => u.id === a.actorId);
      return { ...a, actor: u?.role === "ADMIN" ? "Admin" : (u?.name ?? a.actorId) };
    }),
  };
});
export const addCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ nameEn: z.string().trim().min(1).max(60), nameTe: z.string().trim().min(1).max(60), scope: z.enum(["GENERAL", "YOUTH", "ANY"]) }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const { newId, writeAudit, persistCategory } = await store();
    const cat = { id: newId("c"), ...data };
    db.categories.push(cat);
    await persistCategory(cat);
    writeAudit({ actorId: viewer.user!.id, action: "CREATE", entity: "expense_category", recordId: cat.id, oldValue: null, newValue: JSON.stringify(data), reason: null });
    return cat;
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
    const { persistHighlight } = await store();
    await persistHighlight(cur);
    if (other) await persistHighlight(other);
    return { ok: true };
  });
export const advanceFestivalFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string(), to: z.enum(["PLANNING", "ACTIVE", "FINAL_REVIEW", "CLOSED", "ARCHIVED"]), reason: z.string().trim().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const f = db.festivals.find((x) => x.id === data.id);
    if (!f) throw new Error("Festival not found");
    const { writeAudit, persistStatus } = await store();
    writeAudit({ actorId: viewer.user!.id, action: "STATUS_CHANGE", entity: "festival", recordId: f.id, oldValue: f.status, newValue: data.to, reason: data.reason || "Status updated" });
    f.status = data.to;
    await persistStatus(f.id, data.to);
    return { ok: true };
  });

export const addFestivalFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    year: z.number().int().min(2000).max(2100),
    nameEn: z.string().trim().min(1).max(200),
    nameTe: z.string().trim().max(200).optional(),
    startDate: z.string().min(10).max(10).optional(),
    endDate: z.string().min(10).max(10).optional(),
    status: z.enum(["PLANNING", "ACTIVE", "FINAL_REVIEW", "CLOSED", "ARCHIVED"]).default("PLANNING"),
    isCurrent: z.boolean().default(false),
    carryForwardFromYear: z.number().int().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    if (db.festivals.some((f) => f.year === data.year)) {
      throw new Error(`Festival for year ${data.year} already exists`);
    }

    const { newId, writeAudit, persistNewFestival, persistSetCurrentFestival } = await store();
    const id = newId("f");
    const startDate = data.startDate || `${data.year}-09-01`;
    const endDate = data.endDate || `${data.year}-09-11`;
    const nameEn = data.nameEn;
    const nameTe = data.nameTe || data.nameEn;

    let opGen = 0;
    let opYouth = 0;
    if (data.carryForwardFromYear) {
      const prevFest = db.festivals.find((f) => f.year === data.carryForwardFromYear);
      if (prevFest) {
        const donations = live(db.donations.filter((d) => d.festivalId === prevFest.id));
        const expenses = live(db.expenses.filter((e) => e.festivalId === prevFest.id));
        const auctions = live(db.auctions.filter((a) => a.festivalId === prevFest.id));
        const b = db.branding.find((x) => x.festivalId === prevFest.id);
        const s = financialSummary(donations, expenses, auctions, db.contributions, {
          general: b?.openingBalanceGeneral || 0,
          youth: b?.openingBalanceYouth || 0,
        });
        opGen = s.general.balance;
        opYouth = s.youth.balance;
      }
    }

    if (data.isCurrent) {
      for (const f of db.festivals) {
        f.isCurrent = false;
      }
    }

    const newFest: Festival = {
      id,
      year: data.year,
      status: data.status,
      startDate,
      endDate,
      isCurrent: data.isCurrent,
    };
    db.festivals.unshift(newFest);

    const newBranding: FestivalBranding = {
      festivalId: id,
      nameEn,
      nameTe,
      taglineEn: "Every rupee accounted, every devotee welcome",
      taglineTe: "ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం",
      siteNameEn: "Chinnagollapalli Vinayaka Chavithi",
      siteNameTe: "చిన్నగొల్లపల్లి వినాయక చవితి",
      idolImage: null,
      bannerImage: null,
      logo: null,
      accentHue: 38,
      openingBalanceGeneral: opGen,
      openingBalanceYouth: opYouth,
    };
    db.branding.unshift(newBranding);

    await persistNewFestival(newFest, {
      nameEn,
      nameTe,
      openingBalanceGeneral: opGen,
      openingBalanceYouth: opYouth,
    });
    if (data.isCurrent) {
      await persistSetCurrentFestival(id);
    }

    writeAudit({
      actorId: viewer.user!.id,
      action: "CREATE",
      entity: "festival",
      recordId: id,
      oldValue: null,
      newValue: JSON.stringify(data),
      reason: "Added new festival edition",
    });

    return { id, year: data.year };
  });

export const updateFestivalFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string(),
    year: z.number().int().min(2000).max(2100).optional(),
    nameEn: z.string().trim().min(1).max(200).optional(),
    nameTe: z.string().trim().max(200).optional(),
    startDate: z.string().min(10).max(10).optional(),
    endDate: z.string().min(10).max(10).optional(),
    status: z.enum(["PLANNING", "ACTIVE", "FINAL_REVIEW", "CLOSED", "ARCHIVED"]).optional(),
    isCurrent: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const f = db.festivals.find((x) => x.id === data.id);
    if (!f) throw new Error("Festival not found");

    const oldVal = JSON.stringify(f);
    if (data.year !== undefined) f.year = data.year;
    if (data.startDate !== undefined) f.startDate = data.startDate;
    if (data.endDate !== undefined) f.endDate = data.endDate;
    if (data.status !== undefined) f.status = data.status;

    const b = db.branding.find((x) => x.festivalId === f.id);
    if (b) {
      if (data.nameEn) b.nameEn = data.nameEn;
      if (data.nameTe) b.nameTe = data.nameTe;
    }

    const { writeAudit, persistUpdateFestival, persistSetCurrentFestival } = await store();
    if (data.isCurrent) {
      for (const item of db.festivals) {
        item.isCurrent = item.id === f.id;
      }
      f.isCurrent = true;
      await persistSetCurrentFestival(f.id);
    }

    await persistUpdateFestival(f, data.nameEn, data.nameTe);

    writeAudit({
      actorId: viewer.user!.id,
      action: "UPDATE",
      entity: "festival",
      recordId: f.id,
      oldValue: oldVal,
      newValue: JSON.stringify(data),
      reason: "Updated festival edition details",
    });

    return { ok: true };
  });

export const setCurrentFestivalFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const f = db.festivals.find((x) => x.id === data.id);
    if (!f) throw new Error("Festival not found");

    for (const item of db.festivals) {
      item.isCurrent = item.id === f.id;
    }
    const { writeAudit, persistSetCurrentFestival } = await store();
    await persistSetCurrentFestival(f.id);

    writeAudit({
      actorId: viewer.user!.id,
      action: "STATUS_CHANGE",
      entity: "festival",
      recordId: f.id,
      oldValue: null,
      newValue: `current=true`,
      reason: `Set festival ${f.year} as current active edition`,
    });

    return { ok: true };
  });

export const closeFestivalFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string(),
    forwardToFestivalId: z.string().optional(),
    reason: z.string().trim().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const f = db.festivals.find((x) => x.id === data.id);
    if (!f) throw new Error("Festival not found");

    f.status = "CLOSED";
    const { writeAudit, persistCloseFestivalAndForwardBalance } = await store();
    await persistCloseFestivalAndForwardBalance(f.id, data.forwardToFestivalId);

    writeAudit({
      actorId: viewer.user!.id,
      action: "STATUS_CHANGE",
      entity: "festival",
      recordId: f.id,
      oldValue: "ACTIVE",
      newValue: "CLOSED",
      reason: data.reason || "Festival closed with balance forwarding",
    });

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

export const updateBrandingFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    nameEn: z.string().trim().min(1).max(200).optional(),
    nameTe: z.string().trim().max(200).optional(),
    taglineEn: z.string().trim().max(300).optional(),
    taglineTe: z.string().trim().max(300).optional(),
    siteNameEn: z.string().trim().max(100).optional(),
    siteNameTe: z.string().trim().max(100).optional(),
    logo: z.string().max(5_000_000).nullable().optional(),
    openingBalanceGeneral: z.number().min(0).optional(),
    openingBalanceYouth: z.number().min(0).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requireAdmin(viewer);
    const b = db.branding.find((x) => x.festivalId === festival.id);
    if (!b) throw new Error("Branding not found");
    const old = JSON.stringify({
      nameEn: b.nameEn,
      nameTe: b.nameTe,
      siteNameEn: b.siteNameEn,
      siteNameTe: b.siteNameTe,
      logo: b.logo,
      openingBalanceGeneral: b.openingBalanceGeneral,
      openingBalanceYouth: b.openingBalanceYouth,
      startDate: festival.startDate,
      endDate: festival.endDate,
    });
    if (data.nameEn) b.nameEn = data.nameEn;
    if (data.nameTe) b.nameTe = data.nameTe;
    if (data.taglineEn) b.taglineEn = data.taglineEn;
    if (data.taglineTe) b.taglineTe = data.taglineTe;
    if (data.siteNameEn) b.siteNameEn = data.siteNameEn;
    if (data.siteNameTe) b.siteNameTe = data.siteNameTe;
    if (data.logo !== undefined) b.logo = data.logo;
    if (data.openingBalanceGeneral !== undefined) b.openingBalanceGeneral = data.openingBalanceGeneral;
    if (data.openingBalanceYouth !== undefined) b.openingBalanceYouth = data.openingBalanceYouth;
    if (data.startDate) festival.startDate = data.startDate;
    if (data.endDate) festival.endDate = data.endDate;
    const { writeAudit, persistBranding } = await store();
    await persistBranding(festival.id, data);
    writeAudit({ actorId: viewer.user!.id, action: "UPDATE", entity: "branding", recordId: festival.id, oldValue: old, newValue: JSON.stringify(data), reason: null });
    return { ok: true };
  });

export const addAuctionFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    itemEn: z.string().trim().min(1).max(120),
    itemTe: z.string().trim().max(120).optional(),
    scope: z.enum(["GENERAL", "YOUTH"]),
    winnerType: z.enum(["INDIVIDUAL", "GROUP"]),
    winnerName: z.string().trim().min(1).max(120),
    finalAmount: z.number().positive().max(10_000_000),
    notes: z.string().trim().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requireAdmin(viewer);
    const { newId, writeAudit, persistAuction } = await store();
    const id = newId("a");
    const rec: Auction = {
      id,
      festivalId: festival.id,
      itemEn: data.itemEn,
      itemTe: data.itemTe || data.itemEn,
      scope: data.scope,
      auctionYear: festival.year,
      forFestivalYear: festival.year,
      winnerType: data.winnerType,
      winnerName: data.winnerName,
      finalAmount: data.finalAmount,
      paymentStatus: "PENDING",
      createdBy: viewer.user?.id || "admin",
      createdAt: new Date().toISOString(),
      status: "APPROVED",
      deletedAt: null,
      deleteReason: null,
    };
    db.auctions.push(rec);
    await persistAuction(rec);
    writeAudit({
      actorId: viewer.user?.id || "admin",
      action: "CREATE",
      entity: "auction",
      recordId: id,
      oldValue: null,
      newValue: JSON.stringify(data),
      reason: null,
    });
    return { id };
  });

export const addHighlightFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    titleEn: z.string().trim().min(1).max(120),
    titleTe: z.string().trim().max(120).optional(),
    bodyEn: z.string().trim().min(1).max(500),
    bodyTe: z.string().trim().max(500).optional(),
    imageUrl: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requireAdmin(viewer);
    const { newId, writeAudit, persistHighlight } = await store();
    const id = newId("h");
    const highestOrder = db.highlights.filter((h) => h.festivalId === festival.id).reduce((max, h) => Math.max(max, h.order), 0);
    const rec: Highlight = {
      id,
      festivalId: festival.id,
      titleEn: data.titleEn,
      titleTe: data.titleTe || data.titleEn,
      bodyEn: data.bodyEn,
      bodyTe: data.bodyTe || data.bodyEn,
      image: data.imageUrl || null,
      enabled: data.enabled ?? true,
      order: highestOrder + 1,
      relatedAuctionId: null,
      relatedDonationId: null,
    };
    db.highlights.push(rec);
    await persistHighlight(rec);
    writeAudit({
      actorId: viewer.user?.id || "admin",
      action: "CREATE",
      entity: "highlight",
      recordId: id,
      oldValue: null,
      newValue: JSON.stringify(data),
      reason: null,
    });
    return { id };
  });

export const addMemoryPostFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    titleEn: z.string().trim().min(1).max(120),
    titleTe: z.string().trim().max(120).optional(),
    body: z.string().trim().min(1).max(1000),
    visibility: z.enum(["PUBLIC", "YOUTH", "ADMIN"]),
    imageUrl: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db, festival, viewer } = await ctx();
    requireAdmin(viewer);
    const { newId, writeAudit, persistPost } = await store();
    const id = newId("p");
    const mediaId = newId("m");
    const rec: MemoryPost = {
      id,
      festivalId: festival.id,
      kind: "MEMORY",
      titleEn: data.titleEn,
      titleTe: data.titleTe || data.titleEn,
      body: data.body,
      visibility: data.visibility,
      createdAt: new Date().toISOString(),
      media: data.imageUrl ? [{
        id: mediaId,
        postId: id,
        kind: "IMAGE",
        url: data.imageUrl,
        caption: null,
      }] : [],
    };
    db.posts.push(rec);
    await persistPost(rec);
    writeAudit({
      actorId: viewer.user?.id || "admin",
      action: "CREATE",
      entity: "memory_post",
      recordId: id,
      oldValue: null,
      newValue: JSON.stringify(data),
      reason: null,
    });
    return { id };
  });

export const deleteHighlightFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const idx = db.highlights.findIndex((h) => h.id === data.id);
    if (idx >= 0) db.highlights.splice(idx, 1);
    const { sql } = await import("./db.server");
    try {
      await sql`UPDATE highlights SET is_active = false, updated_at = NOW() WHERE id = ${data.id}`;
    } catch (e) {
      console.error(e);
    }
    return { ok: true };
  });

export const deletePostFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const idx = db.posts.findIndex((p) => p.id === data.id);
    if (idx >= 0) db.posts.splice(idx, 1);
    const { sql } = await import("./db.server");
    try {
      await sql`UPDATE memory_posts SET is_active = false, updated_at = NOW() WHERE id = ${data.id}`;
    } catch (e) {
      console.error(e);
    }
    return { ok: true };
  });

export const deleteAuctionFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db, viewer } = await ctx();
    requireAdmin(viewer);
    const a = db.auctions.find((x) => x.id === data.id);
    if (a) {
      a.deletedAt = new Date().toISOString();
      a.deleteReason = "Deleted by admin";
    }
    const { sql } = await import("./db.server");
    try {
      await sql`UPDATE auctions SET is_public = false, updated_at = NOW() WHERE id = ${data.id}`;
    } catch (e) {
      console.error(e);
    }
    return { ok: true };
  });

// ---------- Detail views (visibility enforced) ----------
const idInput = z.object({ id: z.string().min(1).max(60) });
const audience = (db: Awaited<ReturnType<typeof store>>["db"], recordId: string) =>
  db.audit.filter((a) => a.recordId === recordId).map((a) => {
    const u = db.users.find((u) => u.id === a.actorId);
    return { ...a, actor: u?.role === "ADMIN" ? "Admin" : (u?.name ?? a.actorId) };
  });

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
    const canEdit = can(v, "DONATION_EDIT") && acceptsFinancialWrites(festival.status) && (d.scope === "GENERAL" || v.canSeeYouth);
    return { donation, festival, canSeeYouth: v.canSeeYouth, canEdit, history: v.isAdmin ? audience(db, d.id) : [] };
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
    const canEdit = can(v, "EXPENSE_EDIT") && acceptsFinancialWrites(festival.status);
    return { expense: e, category: db.categories.find((c) => c.id === e.categoryId) ?? null, categories: db.categories, canSeeYouth: v.canSeeYouth, canEdit, festival, history: v.isAdmin ? audience(db, e.id) : [] };
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
  const branding = db.branding.find((b) => b.festivalId === fid);
  const s = financialSummary(donations, expenses, auctions, db.contributions, {
    general: branding?.openingBalanceGeneral ?? 0,
    youth: branding?.openingBalanceYouth ?? 0,
  });
  return {
    denied: false as const, festival, viewer, youth: s.youth, general: s.general,
    youthDonations: donations.filter((d) => d.youthAmount > 0).sort((a, b) => b.date.localeCompare(a.date)),
    youthExpenses: expenses.filter((e) => e.scope === "YOUTH"),
    categories: db.categories,
    members: db.memberships.filter((m) => m.festivalId === fid && m.youth).map((m) => ({ ...m, name: db.users.find((u) => u.id === m.userId)?.name ?? m.userId })),
    allUsers: viewer.isAdmin ? db.users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      isYouth: db.userPermissions.some((p) => p.userId === u.id && p.permission === "YOUTH_ACCESS"),
    })) : null,
    combined: { donations: s.general.donations + s.youth.donations, collected: s.general.auctionCollected + s.youth.auctionCollected, expenses: s.general.expenses + s.youth.expenses, balance: s.general.balance + s.youth.balance },
    youthAuctions: auctions.filter((a) => a.scope === "YOUTH").map((a) => ({
      id: a.id, itemEn: a.itemEn, itemTe: a.itemTe, winnerName: a.winnerName, finalAmount: a.finalAmount,
      paid: auctionPaid(a, db.contributions), remaining: auctionRemaining(a, db.contributions), status: derivePaymentStatus(a, db.contributions),
      contributions: live(db.contributions.filter((c) => c.auctionId === a.id)).map((c) => ({ id: c.id, contributorName: c.contributorName, amount: c.amount, date: c.date })),
    })),
    youthPosts: db.posts.filter((p) => p.festivalId === fid && p.visibility === "YOUTH").map((p) => ({ id: p.id, titleEn: p.titleEn, titleTe: p.titleTe, body: p.body, mediaCount: p.media.length })),
    youthLogs: db.audit.filter((l) => {
      const ids = new Set([...donations.filter((d) => d.youthAmount > 0).map((d) => d.id), ...expenses.filter((e) => e.scope === "YOUTH").map((e) => e.id), ...auctions.filter((a) => a.scope === "YOUTH").map((a) => a.id)]);
      return ids.has(l.recordId);
    }).slice(0, 20).map((l) => {
      const u = db.users.find((u) => u.id === l.actorId);
      return { id: l.id, action: l.action, entity: l.entity, reason: l.reason, at: l.at, actor: u?.role === "ADMIN" ? "Admin" : (u?.name ?? l.actorId) };
    }),
  };
});

// ---------- Admin extras ----------
export const getAdminDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, festival, viewer } = await ctx();
  if (!viewer.isAdmin) return { denied: true as const };
  const fid = festival.id;
  const branding = db.branding.find((b) => b.festivalId === fid) ?? db.branding[0] ?? defaultBranding;
  return {
    denied: false as const, festival,
    branding,
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
    summary: financialSummary(
      db.donations.filter((d) => d.festivalId === fid),
      db.expenses.filter((e) => e.festivalId === fid),
      db.auctions.filter((a) => a.festivalId === fid),
      db.contributions,
      { general: branding?.openingBalanceGeneral ?? 0, youth: branding?.openingBalanceYouth ?? 0 }
    ),
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
    // Remove any existing entry for this user and permission
    db.userPermissions = db.userPermissions.filter(
      (p) => !(p.userId === data.userId && p.permission === perm)
    );
    if (data.enabled) {
      db.userPermissions.push({ userId: data.userId, permission: perm, festivalId: null });
    }

    if (perm === "YOUTH_ACCESS") {
      const m = db.memberships.find((x) => x.userId === data.userId && x.festivalId === festival.id);
      if (m) {
        m.youth = data.enabled;
        m.approved = data.enabled;
      } else if (data.enabled) {
        db.memberships.push({ userId: data.userId, festivalId: festival.id, youth: true, approved: true });
      }
    }
    const { writeAudit, persistPermission } = await store();
    await persistPermission(data.userId, perm, festival.id, data.enabled);
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
    const { writeAudit, persistApproval } = await store();
    await persistApproval(d.id);
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

// ---------- Edits (audited; old + new values recorded) ----------
const donationFields = z.object({
  donorName: z.string().trim().min(1).max(120),
  donorNameTe: z.string().trim().max(120).nullable().optional(),
  village: z.string().trim().max(80).nullable(),
  scope: z.enum(["GENERAL", "YOUTH", "BOTH"]), totalAmount: z.number().positive().max(10_000_000),
  generalAmount: z.number().min(0), youthAmount: z.number().min(0), method, date: z.string().min(10).max(10),
});
export const updateDonationFn = createServerFn({ method: "POST" })
  .inputValidator((d) => donationFields.extend({ id: z.string(), reason: z.string().trim().min(3).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const d = db.donations.find((x) => x.id === data.id && !x.deletedAt);
    if (!d) throw new Error("NOT_FOUND");
    const festival = db.festivals.find((f) => f.id === d.festivalId)!;
    const { viewer } = await ctx(festival.year);
    requirePerm(viewer, "DONATION_EDIT");
    if ((d.scope !== "GENERAL" || data.scope !== "GENERAL") && !viewer.canSeeYouth) throw new Error("PERMISSION_DENIED");
    if (!acceptsFinancialWrites(festival.status)) throw new Error("Festival is read-only");
    const { id, reason, ...fields } = data;
    const err = validateDonationSplit(fields);
    if (err) throw new Error(err);
    const old = JSON.stringify(d);
    Object.assign(d, fields);
    const { writeAudit, persistDonation } = await store();
    await persistDonation(d);
    writeAudit({ actorId: viewer.user!.id, action: "UPDATE", entity: "donation", recordId: id, oldValue: old, newValue: JSON.stringify(fields), reason });
    return { ok: true };
  });

export const updateExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string(), reason: z.string().trim().min(3).max(300),
    scope: z.enum(["GENERAL", "YOUTH"]), categoryId: z.string(), description: z.string().trim().min(1).max(200),
    amount: z.number().positive().max(10_000_000), paidTo: z.string().trim().max(120).nullable(), date: z.string().min(10).max(10),
  }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const e = db.expenses.find((x) => x.id === data.id && !x.deletedAt);
    if (!e) throw new Error("NOT_FOUND");
    const festival = db.festivals.find((f) => f.id === e.festivalId)!;
    const { viewer } = await ctx(festival.year);
    requirePerm(viewer, "EXPENSE_EDIT");
    if ((e.scope === "YOUTH" || data.scope === "YOUTH") && !viewer.canSeeYouth) throw new Error("PERMISSION_DENIED");
    if (!acceptsFinancialWrites(festival.status)) throw new Error("Festival is read-only");
    const { id, reason, ...fields } = data;
    const old = JSON.stringify(e);
    Object.assign(e, fields);
    const { writeAudit, persistExpense } = await store();
    await persistExpense(e);
    writeAudit({ actorId: viewer.user!.id, action: "UPDATE", entity: "expense", recordId: id, oldValue: old, newValue: JSON.stringify(fields), reason });
    return { ok: true };
  });
