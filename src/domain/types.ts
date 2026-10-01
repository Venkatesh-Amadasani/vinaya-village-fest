// Domain types mirroring the production PostgreSQL schema.
// Table names in comments map 1:1 to future DB tables.

export type ID = string;
export type ISODate = string;

export type FestivalStatus = "PLANNING" | "ACTIVE" | "FINAL_REVIEW" | "CLOSED" | "ARCHIVED";
export type BaseRole = "GENERAL" | "ADMIN";
export type Scope = "GENERAL" | "YOUTH";
export type DonationScope = "GENERAL" | "YOUTH" | "BOTH";
export type Visibility = "PUBLIC" | "YOUTH" | "ADMIN";
export type PaymentMethod = "CASH" | "PHONEPE" | "GOOGLE_PAY" | "UPI" | "BANK_TRANSFER" | "OTHER";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";
export type RecordStatus = "PENDING_APPROVAL" | "APPROVED";

export const PERMISSIONS = [
  "YOUTH_ACCESS",
  "DONATION_ADD", "DONATION_EDIT", "DONATION_DELETE",
  "EXPENSE_ADD", "EXPENSE_EDIT", "EXPENSE_DELETE",
  "AUCTION_ADD", "AUCTION_EDIT", "AUCTION_DELETE",
  "CONTRIBUTION_ADD", "CONTRIBUTION_EDIT", "CONTRIBUTION_DELETE",
  "APPROVE_RECORDS", "VIEW_YOUTH_DATA", "VIEW_COMBINED_DATA",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** users */
export interface User { id: ID; name: string; phone: string; role: BaseRole; active: boolean }
/** user_permissions (permissions table = PERMISSIONS constant) */
export interface UserPermission { userId: ID; permission: Permission; festivalId: ID | null }
/** festival_memberships */
export interface FestivalMembership { userId: ID; festivalId: ID; youth: boolean; approved: boolean }

/** festival_branding */
export interface FestivalBranding {
  festivalId: ID; nameEn: string; nameTe: string; taglineEn: string; taglineTe: string;
  siteNameEn: string; siteNameTe: string;
  idolImage: string | null; bannerImage: string | null; logo: string | null; accentHue: number;
  openingBalanceGeneral: number; openingBalanceYouth: number;
}
/** festivals */
export interface Festival {
  id: ID; year: number; status: FestivalStatus; startDate: ISODate; endDate: ISODate; isCurrent: boolean;
}

interface FinancialBase {
  id: ID; festivalId: ID; createdBy: ID; createdAt: ISODate;
  status: RecordStatus; deletedAt: ISODate | null; deleteReason: string | null;
}

/** donations */
export interface Donation extends FinancialBase {
  donorName: string; donorNameTe: string | null; village: string | null; scope: DonationScope;
  totalAmount: number; generalAmount: number; youthAmount: number;
  method: PaymentMethod; proofUrl: string | null; note: string | null; date: ISODate;
}
/** expense_categories */
export interface ExpenseCategory { id: ID; nameEn: string; nameTe: string; scope: Scope | "ANY" }
/** expenses */
export interface Expense extends FinancialBase {
  scope: Scope; categoryId: ID; description: string; amount: number;
  paidTo: string | null; receiptUrl: string | null; date: ISODate;
}
/** auctions — FINAL RESULT ONLY, no bid history by design */
export interface Auction extends FinancialBase {
  itemEn: string; itemTe: string; scope: Scope; auctionYear: number; forFestivalYear: number;
  winnerType: "INDIVIDUAL" | "GROUP"; winnerName: string; finalAmount: number; paymentStatus: PaymentStatus;
}
/** auction_contributions */
export interface AuctionContribution extends FinancialBase {
  auctionId: ID; contributorName: string; amount: number; method: PaymentMethod; date: ISODate;
}

/** highlights — manually managed only */
export interface Highlight {
  id: ID; festivalId: ID; titleEn: string; titleTe: string; bodyEn: string; bodyTe: string;
  image: string | null; enabled: boolean; order: number;
  relatedAuctionId: ID | null; relatedDonationId: ID | null;
}
/** media */
export interface Media { id: ID; postId: ID; kind: "IMAGE" | "VIDEO"; url: string; caption: string | null }
/** memory_posts */
export interface MemoryPost {
  id: ID; festivalId: ID; kind: "CONGRATULATIONS" | "MEMORY"; titleEn: string; titleTe: string;
  body: string; visibility: Visibility; createdAt: ISODate; media: Media[];
}

export type NotificationKind = "ANNOUNCEMENT" | "DONATION" | "EXPENSE" | "AUCTION" | "APPROVAL" | "SYSTEM";
/** notifications */
export interface AppNotification {
  id: ID; userId: ID; festivalId: ID | null; kind: NotificationKind;
  titleEn: string; titleTe: string; bodyEn: string; bodyTe: string; read: boolean; createdAt: ISODate;
}
/** notification_preferences */
export interface NotificationPreferences { userId: ID; kinds: Record<NotificationKind, boolean> }

/** audit_logs */
export interface AuditLog {
  id: ID; actorId: ID; action: "CREATE" | "UPDATE" | "SOFT_DELETE" | "APPROVE" | "STATUS_CHANGE";
  entity: string; recordId: ID; oldValue: string | null; newValue: string | null;
  reason: string | null; at: ISODate;
}

/** Resolved viewer context computed server-side. */
export interface Viewer {
  user: User | null;
  permissions: Permission[];
  isAdmin: boolean;
  canSeeYouth: boolean;
}
