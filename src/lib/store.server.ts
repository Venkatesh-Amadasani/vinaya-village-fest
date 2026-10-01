// Persistent database store connected directly to Supabase PostgreSQL.
import { sql } from "./db.server";
import { randomUUID } from "crypto";
import { financialSummary, live } from "@/domain/rules";
import type {
  AppNotification, Auction, AuctionContribution, AuditLog, Donation, Expense, ExpenseCategory,
  Festival, FestivalBranding, FestivalMembership, Highlight, MemoryPost, NotificationPreferences,
  User, UserPermission,
} from "@/domain/types";

let festivals: Festival[] = [
  { id: "fest-2026", year: 2026, status: "ACTIVE", startDate: "2026-09-14", endDate: "2026-09-24", isCurrent: true },
  { id: "fest-2025", year: 2025, status: "CLOSED", startDate: "2025-08-27", endDate: "2025-09-06", isCurrent: false },
  { id: "fest-2024", year: 2024, status: "CLOSED", startDate: "2024-09-07", endDate: "2024-09-17", isCurrent: false },
];
let branding: FestivalBranding[] = [
  {
    festivalId: "fest-2026",
    nameEn: "Sri Vinayaka Chavithi 2026",
    nameTe: "శ్రీ వినాయక చవితి 2026",
    taglineEn: "Every rupee accounted, every devotee welcome",
    taglineTe: "ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం",
    siteNameEn: "Chinnagollapalli Vinayaka Chavithi",
    siteNameTe: "చిన్నగొల్లపల్లి వినాయక చవితి",
    idolImage: null,
    bannerImage: null,
    logo: null,
    accentHue: 45,
    openingBalanceGeneral: 0,
    openingBalanceYouth: 0,
  }
];
let users: User[] = [
  { id: "74400a08-12ef-48d6-9be4-da5022b333b1", name: "Admin", phone: "9999999999", role: "ADMIN", village: "Chinnagollapalli", preferredLanguage: "en", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "64ce6798-b1b7-4a45-aa2f-9e7956802ea7", name: "Ravi Kumar", phone: "9000000002", role: "GENERAL", village: "Chinnagollapalli", preferredLanguage: "te", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "0819d743-52f5-48f1-9a32-e659686df531", name: "Lakshmi Devi", phone: "9000000003", role: "GENERAL", village: "Chinnagollapalli", preferredLanguage: "te", createdAt: "2026-01-01T00:00:00.000Z" },
];
let userPermissions: UserPermission[] = [
  { userId: "64ce6798-b1b7-4a45-aa2f-9e7956802ea7", permission: "YOUTH_ACCESS", festivalId: null },
  { userId: "64ce6798-b1b7-4a45-aa2f-9e7956802ea7", permission: "VIEW_YOUTH_DATA", festivalId: null },
  { userId: "64ce6798-b1b7-4a45-aa2f-9e7956802ea7", permission: "VIEW_COMBINED_DATA", festivalId: null },
];
let memberships: FestivalMembership[] = [
  { userId: "64ce6798-b1b7-4a45-aa2f-9e7956802ea7", festivalId: "fest-2026", youth: true, approved: true },
];
let categories: ExpenseCategory[] = [];
let donations: Donation[] = [];
let expenses: Expense[] = [];
let auctions: Auction[] = [];
let contributions: AuctionContribution[] = [];
let highlights: Highlight[] = [];
let posts: MemoryPost[] = [];
let notifications: AppNotification[] = [];
let preferences: NotificationPreferences[] = [];
let audit: AuditLog[] = [];

export const db = {
  festivals, branding, users, userPermissions, memberships, categories, donations, expenses,
  auctions, contributions, highlights, posts, notifications, preferences, audit,
};

export const newId = (_prefix: string) => randomUUID();

let hasLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function syncFromDb(): Promise<void> {
  try {
    const [
      dbFestivals, dbBranding, dbUsers, dbCategories,
      dbDonations, dbExpenses, dbAuctions, dbContributions,
      dbHighlights, dbPosts, dbMedia, dbUserPerms, dbMemberships, dbAuditLogs
    ] = await Promise.all([
      sql`SELECT * FROM festivals ORDER BY year DESC`,
      sql`SELECT * FROM festival_branding`,
      sql`SELECT * FROM users WHERE is_active = true`,
      sql`SELECT * FROM expense_categories WHERE is_active = true`,
      sql`SELECT * FROM donations ORDER BY donation_date DESC`,
      sql`SELECT * FROM expenses ORDER BY expense_date DESC`,
      sql`SELECT * FROM auctions ORDER BY created_at DESC`,
      sql`SELECT * FROM auction_contributions ORDER BY contribution_date DESC`,
      sql`SELECT * FROM highlights WHERE is_active = true ORDER BY display_order ASC`,
      sql`SELECT * FROM memory_posts WHERE is_active = true ORDER BY display_order ASC`,
      sql`SELECT * FROM media WHERE is_active = true`,
      sql`SELECT up.user_id, p.code as permission FROM user_permissions up JOIN permissions p ON p.id = up.permission_id WHERE up.is_active = true`,
      sql`SELECT * FROM festival_memberships`,
      sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`
    ]);

    db.festivals = dbFestivals.map((f: any) => ({
      id: f.id,
      year: Number(f.year),
      status: f.status,
      startDate: f.start_date ? new Date(f.start_date).toISOString().slice(0, 10) : "2026-09-14",
      endDate: f.end_date ? new Date(f.end_date).toISOString().slice(0, 10) : "2026-09-24",
      isCurrent: Boolean(f.is_current),
    }));

    db.branding = dbBranding.map((b: any) => ({
      festivalId: b.festival_id,
      nameEn: b.name_en || `Sri Vinayaka Chavithi ${db.festivals.find(f => f.id === b.festival_id)?.year || ''}`,
      nameTe: b.name_te || `శ్రీ వినాయక చవితి ${db.festivals.find(f => f.id === b.festival_id)?.year || ''}`,
      taglineEn: b.tagline_en || "Every rupee accounted, every devotee welcome",
      taglineTe: b.tagline_te || "ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం",
      siteNameEn: b.site_name_en || "Chinnagollapalli Vinayaka Chavithi",
      siteNameTe: b.site_name_te || "చిన్నగొల్లపల్లి వినాయక చవితి",
      idolImage: b.idol_image_url || null,
      bannerImage: b.banner_url || null,
      logo: b.logo_url || null,
      accentHue: b.accent_color === '#FF6B35' ? 45 : 30,
      openingBalanceGeneral: Number(b.opening_balance_general || 0),
      openingBalanceYouth: Number(b.opening_balance_youth || 0),
    }));

    // Ensure all festivals have a branding record
    for (const f of db.festivals) {
      if (!db.branding.some(b => b.festivalId === f.id)) {
        db.branding.push({
          festivalId: f.id,
          nameEn: `Sri Vinayaka Chavithi ${f.year}`,
          nameTe: `శ్రీ వినాయక చవితి ${f.year}`,
          taglineEn: "Every rupee accounted, every devotee welcome",
          taglineTe: "ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం",
          siteNameEn: "Chinnagollapalli Vinayaka Chavithi",
          siteNameTe: "చిన్నగొల్లపల్లి వినాయక చవితి",
          idolImage: null,
          bannerImage: null,
          logo: null,
          accentHue: 45,
          openingBalanceGeneral: 0,
          openingBalanceYouth: 0,
        });
      }
    }

    db.users = dbUsers.map((u: any) => ({
      id: u.id,
      name: u.full_name,
      phone: u.phone || "9000000000",
      role: u.role === "ADMIN" ? "ADMIN" : "GENERAL",
      active: Boolean(u.is_active),
    }));

    db.categories = dbCategories.map((c: any) => ({
      id: c.id,
      nameEn: c.name_en,
      nameTe: c.name_te || c.name_en,
      scope: c.name_en.toLowerCase().includes("youth") ? "YOUTH" : "ANY",
    }));

    db.donations = dbDonations.map((d: any) => ({
      id: d.id,
      festivalId: d.festival_id,
      donorName: d.donor_name,
      donorNameTe: d.donor_name_te || null,
      village: d.notes?.startsWith("Village: ") ? d.notes.replace("Village: ", "") : null,
      scope: d.allocation_type,
      totalAmount: Number(d.total_amount),
      generalAmount: Number(d.general_amount),
      youthAmount: Number(d.youth_amount),
      method: d.payment_method,
      proofUrl: d.payment_proof_url,
      note: d.notes,
      date: d.donation_date ? new Date(d.donation_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      createdBy: d.created_by,
      createdAt: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
      status: "APPROVED",
      deletedAt: d.is_deleted && d.deleted_at ? new Date(d.deleted_at).toISOString() : null,
      deleteReason: d.deletion_reason || null,
    }));

    db.expenses = dbExpenses.map((e: any) => ({
      id: e.id,
      festivalId: e.festival_id,
      categoryId: e.category_id,
      scope: e.scope,
      amount: Number(e.amount),
      description: e.description || "",
      paidTo: e.paid_by || null,
      receiptUrl: e.receipt_url || null,
      date: e.expense_date ? new Date(e.expense_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      createdBy: e.created_by,
      createdAt: e.created_at ? new Date(e.created_at).toISOString() : new Date().toISOString(),
      status: "APPROVED",
      deletedAt: e.is_deleted && e.deleted_at ? new Date(e.deleted_at).toISOString() : null,
      deleteReason: e.deletion_reason || null,
    }));

    db.auctions = dbAuctions.map((a: any) => ({
      id: a.id,
      festivalId: a.for_festival_id,
      auctionYear: Number(a.auction_year),
      forFestivalYear: Number(a.auction_year),
      itemEn: a.item_name_en,
      itemTe: a.item_name_te || a.item_name_en,
      winnerType: a.participant_type,
      winnerName: a.participant_name,
      finalAmount: Number(a.final_amount),
      paymentStatus: a.payment_status,
      scope: a.participant_name?.toLowerCase().includes("youth") ? "YOUTH" : "GENERAL",
      createdBy: a.created_by,
      createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
      status: "APPROVED",
      deletedAt: null,
      deleteReason: null,
    }));

    db.contributions = dbContributions.map((c: any) => ({
      id: c.id,
      auctionId: c.auction_id,
      contributorName: c.contributor_name,
      amount: Number(c.amount),
      method: c.payment_method,
      date: c.contribution_date ? new Date(c.contribution_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      festivalId: db.auctions.find(a => a.id === c.auction_id)?.festivalId || db.festivals[0]?.id || "",
      createdBy: c.created_by,
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      status: "APPROVED",
      deletedAt: c.is_deleted && c.deleted_at ? new Date(c.deleted_at).toISOString() : null,
      deleteReason: c.deletion_reason || null,
    }));

    db.highlights = dbHighlights.map((h: any) => ({
      id: h.id,
      festivalId: h.festival_id,
      titleEn: h.title_en,
      titleTe: h.title_te || h.title_en,
      bodyEn: h.message_en || "",
      bodyTe: h.message_te || h.message_en || "",
      image: h.image_url || null,
      enabled: Boolean(h.is_active),
      order: Number(h.display_order),
      relatedAuctionId: h.related_auction_id || null,
      relatedDonationId: h.related_donation_id || null,
    }));

    db.posts = dbPosts.map((p: any) => ({
      id: p.id,
      festivalId: p.festival_id,
      kind: "MEMORY" as const,
      titleEn: p.title_en,
      titleTe: p.title_te || p.title_en,
      body: p.caption_en || "",
      visibility: p.visibility || "PUBLIC",
      createdAt: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      media: dbMedia
        .filter((m: any) => m.memory_post_id === p.id)
        .map((m: any) => ({
          id: m.id,
          postId: m.memory_post_id,
          kind: "IMAGE" as const,
          url: m.public_url,
          caption: null,
        })),
    }));

    // User permissions from DB
    db.userPermissions = dbUserPerms.map((up: any) => ({
      userId: up.user_id,
      permission: up.permission as any,
      festivalId: null,
    }));

    // Festival memberships from DB
    db.memberships = dbMemberships.map((m: any) => ({
      userId: m.user_id,
      festivalId: m.festival_id,
      youth: true,
      approved: m.status === "APPROVED",
    }));

    // Only if completely fresh database with zero permissions and memberships
    if (dbUserPerms.length === 0 && dbMemberships.length === 0) {
      const youthUser = db.users.find((u) => u.phone === "9000000002") || db.users[1];
      if (youthUser) {
        db.userPermissions.push(
          { userId: youthUser.id, permission: "YOUTH_ACCESS", festivalId: null },
          { userId: youthUser.id, permission: "VIEW_YOUTH_DATA", festivalId: null },
          { userId: youthUser.id, permission: "VIEW_COMBINED_DATA", festivalId: null },
          { userId: youthUser.id, permission: "DONATION_ADD", festivalId: null },
          { userId: youthUser.id, permission: "CONTRIBUTION_ADD", festivalId: null },
        );
        db.memberships = [
          { userId: youthUser.id, festivalId: db.festivals.find((f) => f.isCurrent)?.id || db.festivals[0]?.id || "", youth: true, approved: true },
        ];
      }
    }

    if (dbAuditLogs && dbAuditLogs.length > 0) {
      db.audit = dbAuditLogs.map((a: any) => ({
        id: a.id,
        actorId: a.performed_by || "admin",
        action: a.action,
        entity: a.entity_type,
        recordId: a.entity_id || "",
        oldValue: a.old_values ? (typeof a.old_values === 'string' ? a.old_values : JSON.stringify(a.old_values)) : null,
        newValue: a.new_values ? (typeof a.new_values === 'string' ? a.new_values : JSON.stringify(a.new_values)) : null,
        reason: a.reason || null,
        at: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
      }));
    }

    hasLoaded = true;
  } catch (err) {
    console.error("Failed to sync from Supabase PostgreSQL:", err);
  }
}

export async function ensureDb(): Promise<typeof db> {
  if (!hasLoaded) {
    if (!loadPromise) {
      loadPromise = Promise.race([
        syncFromDb(),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
    await loadPromise;
  }
  return db;
}

// ---------- Persistence Actions directly to Supabase ----------

export async function writeAudit(entry: Omit<AuditLog, "id" | "at">) {
  const id = newId("al");
  const now = new Date().toISOString();
  db.audit.unshift({ ...entry, id, at: now });

  try {
    const fId = db.festivals.find(f => f.isCurrent)?.id || null;
    await sql`
      INSERT INTO audit_logs (
        id, festival_id, performed_by, action, entity_type,
        entity_id, old_values, new_values, reason, created_at
      ) VALUES (
        ${id}, ${fId}, ${entry.actorId.startsWith("u-") ? null : entry.actorId}, ${entry.action}, ${entry.entity},
        ${entry.recordId.startsWith("d-") || entry.recordId.startsWith("e-") ? null : entry.recordId},
        ${entry.oldValue}, ${entry.newValue}, ${entry.reason}, NOW()
      )
    `;
  } catch (e) {
    console.error("writeAudit error:", e);
  }
}

export function notify(userIds: string[], n: Omit<AppNotification, "id" | "userId" | "read" | "createdAt">) {
  for (const userId of userIds) {
    const pref = db.preferences.find((p) => p.userId === userId);
    if (pref && pref.kinds[n.kind] === false) continue;
    db.notifications.unshift({ ...n, id: newId("n"), userId, read: false, createdAt: new Date().toISOString() });
  }
}

export async function persistDonation(d: Donation) {
  try {
    const adminUser = db.users.find(u => u.role === "ADMIN");
    const creatorId = d.createdBy?.startsWith("u-") ? (adminUser?.id || d.createdBy) : d.createdBy;
    await sql`
      INSERT INTO donations (
        id, festival_id, donor_name, donor_name_te, total_amount, allocation_type,
        general_amount, youth_amount, donation_date, payment_method,
        payment_status, notes, created_by, is_deleted, created_at, updated_at
      ) VALUES (
        ${d.id}, ${d.festivalId}, ${d.donorName}, ${d.donorNameTe ?? null}, ${d.totalAmount}, ${d.scope},
        ${d.generalAmount}, ${d.youthAmount}, ${d.date}, ${d.method},
        'PAID', ${d.village ? 'Village: ' + d.village : null}, ${creatorId}, false, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        donor_name = ${d.donorName},
        donor_name_te = ${d.donorNameTe ?? null},
        total_amount = ${d.totalAmount},
        general_amount = ${d.generalAmount},
        youth_amount = ${d.youthAmount},
        allocation_type = ${d.scope},
        payment_method = ${d.method},
        donation_date = ${d.date},
        notes = ${d.village ? 'Village: ' + d.village : null},
        updated_at = NOW()
    `;
  } catch (err) {
    console.error("persistDonation error:", err);
  }
}

export async function persistExpense(e: Expense) {
  try {
    const adminUser = db.users.find(u => u.role === "ADMIN");
    const creatorId = e.createdBy?.startsWith("u-") ? (adminUser?.id || e.createdBy) : e.createdBy;
    await sql`
      INSERT INTO expenses (
        id, festival_id, category_id, scope, amount,
        description, paid_by, payment_method, payment_status,
        expense_date, created_by, is_deleted, created_at, updated_at
      ) VALUES (
        ${e.id}, ${e.festivalId}, ${e.categoryId}, ${e.scope}, ${e.amount},
        ${e.description}, ${e.paidTo}, 'CASH', 'PAID',
        ${e.date}, ${creatorId}, false, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        amount = ${e.amount},
        description = ${e.description},
        paid_by = ${e.paidTo},
        scope = ${e.scope},
        category_id = ${e.categoryId},
        expense_date = ${e.date},
        updated_at = NOW()
    `;
  } catch (err) {
    console.error("persistExpense error:", err);
  }
}

export async function persistContribution(c: AuctionContribution) {
  try {
    const adminUser = db.users.find(u => u.role === "ADMIN");
    const creatorId = c.createdBy?.startsWith("u-") ? (adminUser?.id || c.createdBy) : c.createdBy;
    await sql`
      INSERT INTO auction_contributions (
        id, auction_id, contributor_name, amount, contribution_date,
        payment_method, payment_status, created_by, is_deleted, created_at, updated_at
      ) VALUES (
        ${c.id}, ${c.auctionId}, ${c.contributorName}, ${c.amount}, ${c.date},
        ${c.method}, 'PAID', ${creatorId}, false, NOW(), NOW()
      )
    `;
  } catch (err) {
    console.error("persistContribution error:", err);
  }
}

export async function persistSoftDelete(entity: "donation" | "expense", id: string, reason: string) {
  try {
    if (entity === "donation") {
      await sql`
        UPDATE donations 
        SET is_deleted = true, deleted_at = NOW(), deletion_reason = ${reason}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE expenses 
        SET is_deleted = true, deleted_at = NOW(), deletion_reason = ${reason}
        WHERE id = ${id}
      `;
    }
  } catch (err) {
    console.error("persistSoftDelete error:", err);
  }
}

export async function persistHighlight(h: Highlight) {
  try {
    const adminUser = db.users.find(u => u.role === "ADMIN");
    await sql`
      INSERT INTO highlights (
        id, festival_id, highlight_type, title_en, title_te,
        message_en, message_te, display_order, is_active, visibility,
        created_by, created_at, updated_at
      ) VALUES (
        ${h.id}, ${h.festivalId}, 'ANNOUNCEMENT', ${h.titleEn}, ${h.titleTe},
        ${h.bodyEn}, ${h.bodyTe}, ${h.order}, ${h.enabled}, 'PUBLIC',
        ${adminUser?.id || null}, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title_en = ${h.titleEn},
        title_te = ${h.titleTe},
        message_en = ${h.bodyEn},
        message_te = ${h.bodyTe},
        display_order = ${h.order},
        is_active = ${h.enabled},
        updated_at = NOW()
    `;
  } catch (err) {
    console.error("persistHighlight error:", err);
  }
}

export async function persistStatus(festivalId: string, status: string) {
  try {
    await sql`
      UPDATE festivals 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${festivalId}::uuid
    `;
  } catch (err) {
    console.error("persistStatus error:", err);
  }
}

export async function persistNewFestival(f: Festival, brandingData?: {
  nameEn?: string;
  nameTe?: string;
  openingBalanceGeneral?: number;
  openingBalanceYouth?: number;
}) {
  try {
    const nameEn = brandingData?.nameEn || `Sri Vinayaka Chavithi ${f.year}`;
    const nameTe = brandingData?.nameTe || `శ్రీ వినాయక చవితి ${f.year}`;
    const opGen = brandingData?.openingBalanceGeneral || 0;
    const opYouth = brandingData?.openingBalanceYouth || 0;

    await sql`
      INSERT INTO festivals (id, year, name_en, name_te, status, start_date, end_date, is_current, created_at, updated_at)
      VALUES (${f.id}::uuid, ${f.year}, ${nameEn}, ${nameTe}, ${f.status}, ${f.startDate}::date, ${f.endDate}::date, ${f.isCurrent}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        year = ${f.year}, name_en = ${nameEn}, name_te = ${nameTe}, status = ${f.status},
        start_date = ${f.startDate}::date, end_date = ${f.endDate}::date, is_current = ${f.isCurrent}, updated_at = NOW()
    `;

    await sql`
      INSERT INTO festival_branding (
        id, festival_id, name_en, name_te, tagline_en, tagline_te,
        site_name_en, site_name_te, accent_color, opening_balance_general, opening_balance_youth,
        updated_at
      ) VALUES (
        gen_random_uuid(), ${f.id}::uuid, ${nameEn}, ${nameTe},
        'Every rupee accounted, every devotee welcome', 'ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం',
        'Chinnagollapalli Vinayaka Chavithi', 'చిన్నగొల్లపల్లి వినాయక చవితి',
        '#e11d48', ${opGen}, ${opYouth}, NOW()
      )
      ON CONFLICT (festival_id) DO UPDATE SET
        name_en = ${nameEn}, name_te = ${nameTe},
        opening_balance_general = ${opGen}, opening_balance_youth = ${opYouth},
        updated_at = NOW()
    `;
  } catch (err) {
    console.error("persistNewFestival error:", err);
  }
}

export async function persistUpdateFestival(f: Festival, nameEn?: string, nameTe?: string) {
  try {
    await sql`
      UPDATE festivals SET
        year = ${f.year},
        name_en = COALESCE(${nameEn ?? null}, name_en),
        name_te = COALESCE(${nameTe ?? null}, name_te),
        status = ${f.status},
        start_date = ${f.startDate}::date,
        end_date = ${f.endDate}::date,
        is_current = ${f.isCurrent},
        updated_at = NOW()
      WHERE id = ${f.id}::uuid
    `;
    if (nameEn || nameTe) {
      await sql`
        UPDATE festival_branding SET
          name_en = COALESCE(${nameEn ?? null}, name_en),
          name_te = COALESCE(${nameTe ?? null}, name_te),
          updated_at = NOW()
        WHERE festival_id = ${f.id}::uuid
      `;
    }
  } catch (err) {
    console.error("persistUpdateFestival error:", err);
  }
}

export async function persistSetCurrentFestival(festivalId: string) {
  try {
    await sql`UPDATE festivals SET is_current = (id = ${festivalId}::uuid), updated_at = NOW()`;
  } catch (err) {
    console.error("persistSetCurrentFestival error:", err);
  }
}

export async function persistCloseFestivalAndForwardBalance(closingId: string, forwardToFestivalId?: string) {
  try {
    await sql`UPDATE festivals SET status = 'CLOSED', updated_at = NOW() WHERE id = ${closingId}::uuid`;

    if (forwardToFestivalId) {
      const closingFest = db.festivals.find((f) => f.id === closingId);
      const targetFest = db.festivals.find((f) => f.id === forwardToFestivalId);
      if (closingFest && targetFest) {
        const donations = live(db.donations.filter((d) => d.festivalId === closingId));
        const expenses = live(db.expenses.filter((e) => e.festivalId === closingId));
        const auctions = live(db.auctions.filter((a) => a.festivalId === closingId));
        const b = db.branding.find((x) => x.festivalId === closingId);
        const s = financialSummary(donations, expenses, auctions, db.contributions, {
          general: b?.openingBalanceGeneral || 0,
          youth: b?.openingBalanceYouth || 0,
        });

        const targetBranding = db.branding.find((x) => x.festivalId === forwardToFestivalId);
        if (targetBranding) {
          targetBranding.openingBalanceGeneral = s.general.balance;
          targetBranding.openingBalanceYouth = s.youth.balance;
        }

        await sql`
          UPDATE festival_branding SET
            opening_balance_general = ${s.general.balance},
            opening_balance_youth = ${s.youth.balance},
            updated_at = NOW()
          WHERE festival_id = ${forwardToFestivalId}::uuid
        `;
      }
    }
  } catch (err) {
    console.error("persistCloseFestivalAndForwardBalance error:", err);
  }
}

export async function persistCategory(c: { id: string; nameEn: string; nameTe: string; scope: string }) {
  try {
    await sql`
      INSERT INTO expense_categories (id, name_en, name_te, scope, is_active, created_at)
      VALUES (${c.id}, ${c.nameEn}, ${c.nameTe}, ${c.scope}, true, NOW())
      ON CONFLICT (id) DO NOTHING
    `;
  } catch (err) {
    console.error("persistCategory error:", err);
  }
}

export async function persistApproval(id: string) {
  try {
    await sql`
      UPDATE donations SET payment_status = 'PAID', updated_at = NOW() WHERE id = ${id}
    `;
  } catch (err) {
    console.error("persistApproval error:", err);
  }
}

export async function persistBranding(festivalId: string, fields: {
  nameEn?: string | undefined; nameTe?: string | undefined; taglineEn?: string | undefined; taglineTe?: string | undefined;
  siteNameEn?: string | undefined; siteNameTe?: string | undefined; logo?: string | null | undefined;
  openingBalanceGeneral?: number | undefined; openingBalanceYouth?: number | undefined;
  startDate?: string | undefined; endDate?: string | undefined;
}) {
  try {
    await sql`
      UPDATE festival_branding SET
        name_en = COALESCE(${fields.nameEn ?? null}, name_en),
        name_te = COALESCE(${fields.nameTe ?? null}, name_te),
        tagline_en = COALESCE(${fields.taglineEn ?? null}, tagline_en),
        tagline_te = COALESCE(${fields.taglineTe ?? null}, tagline_te),
        site_name_en = COALESCE(${fields.siteNameEn ?? null}, site_name_en),
        site_name_te = COALESCE(${fields.siteNameTe ?? null}, site_name_te),
        logo_url = COALESCE(${fields.logo ?? null}, logo_url),
        opening_balance_general = COALESCE(${fields.openingBalanceGeneral ?? null}, opening_balance_general),
        opening_balance_youth = COALESCE(${fields.openingBalanceYouth ?? null}, opening_balance_youth),
        updated_at = NOW()
      WHERE festival_id = ${festivalId}
    `;

    if (fields.startDate || fields.endDate) {
      const f = db.festivals.find((x) => x.id === festivalId);
      if (f) {
        if (fields.startDate) f.startDate = fields.startDate;
        if (fields.endDate) f.endDate = fields.endDate;
      }
      await sql`
        UPDATE festivals SET
          start_date = COALESCE(${fields.startDate ?? null}::date, start_date),
          end_date = COALESCE(${fields.endDate ?? null}::date, end_date),
          updated_at = NOW()
        WHERE id = ${festivalId}
      `;
    }
  } catch (err) {
    console.error("persistBranding error:", err);
  }
}

export async function persistAuction(a: Auction) {
  try {
    const adminUser = db.users.find(u => u.role === "ADMIN");
    const creatorId = a.createdBy?.startsWith("u-") ? (adminUser?.id || a.createdBy) : a.createdBy;
    const year = db.festivals.find(f => f.id === a.festivalId)?.year || 2026;
    await sql`
      INSERT INTO auctions (
        id, auction_year, for_festival_id, item_name_en, item_name_te,
        participant_type, participant_name, final_amount, payment_status,
        notes, is_public, created_by, created_at, updated_at
      ) VALUES (
        ${a.id}, ${year}, ${a.festivalId},
        ${a.itemEn}, ${a.itemTe || a.itemEn}, ${a.winnerType}, ${a.winnerName},
        ${a.finalAmount}, 'PENDING', ${a.scope === "YOUTH" ? 'Scope: YOUTH' : 'Scope: GENERAL'},
        true, ${creatorId}, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        item_name_en = ${a.itemEn},
        item_name_te = ${a.itemTe || a.itemEn},
        participant_type = ${a.winnerType},
        participant_name = ${a.winnerName},
        final_amount = ${a.finalAmount},
        updated_at = NOW()
    `;
  } catch (err) {
    console.error("persistAuction error:", err);
  }
}

export async function persistPost(p: MemoryPost) {
  try {
    const adminUser = db.users.find(u => u.role === "ADMIN");
    await sql`
      INSERT INTO memory_posts (
        id, festival_id, title_en, title_te, caption_en, caption_te,
        visibility, display_order, is_featured, is_active, created_by, created_at, updated_at
      ) VALUES (
        ${p.id}, ${p.festivalId}, ${p.titleEn}, ${p.titleTe || p.titleEn},
        ${p.body}, ${p.body}, ${p.visibility}, 0, false, true,
        ${adminUser?.id || null}, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title_en = ${p.titleEn},
        title_te = ${p.titleTe || p.titleEn},
        caption_en = ${p.body},
        visibility = ${p.visibility},
        updated_at = NOW()
    `;
    if (p.media && p.media.length > 0) {
      for (const m of p.media) {
        await sql`
          INSERT INTO media (
            id, festival_id, memory_post_id, filename, storage_path, public_url,
            mime_type, file_size_bytes, visibility, is_active, uploaded_by, created_at
          ) VALUES (
            ${m.id}, ${p.festivalId}, ${p.id}, 'photo.jpg', ${m.url}, ${m.url},
            'image/jpeg', 1024, ${p.visibility}, true, ${adminUser?.id || null}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET public_url = ${m.url}
        `;
      }
    }
  } catch (err) {
    console.error("persistPost error:", err);
  }
}

export async function persistPermission(userId: string, permission: string, festivalId: string, enabled: boolean) {
  try {
    if (userId.startsWith("u-")) return;
    const admin = db.users.find((u) => u.role === "ADMIN");
    const adminId = admin?.id || userId;

    if (enabled) {
      await sql`
        INSERT INTO user_permissions (id, user_id, permission_id, granted_by, is_active, granted_at)
        SELECT gen_random_uuid(), ${userId}::uuid, p.id, ${adminId}::uuid, true, NOW()
        FROM permissions p WHERE p.code = ${permission}
        ON CONFLICT (user_id, permission_id) DO UPDATE SET is_active = true, revoked_at = null, granted_at = NOW()
      `;
    } else {
      await sql`
        UPDATE user_permissions
        SET is_active = false, revoked_at = NOW()
        WHERE user_id = ${userId}::uuid
          AND permission_id = (SELECT id FROM permissions WHERE code = ${permission})
      `;
    }

    if (permission === "YOUTH_ACCESS") {
      const festId = festivalId || db.festivals.find((f) => f.isCurrent)?.id || db.festivals[0]?.id;
      if (festId) {
        if (enabled) {
          await sql`
            INSERT INTO festival_memberships (id, festival_id, user_id, status, approved_by, approved_at, created_at, updated_at)
            VALUES (gen_random_uuid(), ${festId}::uuid, ${userId}::uuid, 'APPROVED', ${adminId}::uuid, NOW(), NOW(), NOW())
            ON CONFLICT (festival_id, user_id) DO UPDATE SET status = 'APPROVED', approved_by = ${adminId}::uuid, approved_at = NOW(), updated_at = NOW()
          `;
        } else {
          await sql`
            UPDATE festival_memberships
            SET status = 'REVOKED', revoked_by = ${adminId}::uuid, revoked_at = NOW(), updated_at = NOW()
            WHERE festival_id = ${festId}::uuid AND user_id = ${userId}::uuid
          `;
        }
      }
    }
  } catch (err) {
    console.error("persistPermission error:", err);
  }
}


