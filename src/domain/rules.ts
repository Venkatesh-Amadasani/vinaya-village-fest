// Centralized business rules. Used by both server (enforcement) and UI (guidance).
import type {
  Auction, AuctionContribution, Donation, Expense, FestivalMembership, FestivalStatus,
  Permission, User, UserPermission, Viewer, Visibility,
} from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function validateDonationSplit(d: Pick<Donation, "scope" | "totalAmount" | "generalAmount" | "youthAmount">): string | null {
  if (!(d.totalAmount > 0)) return "Total amount must be greater than zero";
  if (d.generalAmount < 0 || d.youthAmount < 0) return "Split amounts cannot be negative";
  if (d.scope === "GENERAL" && (d.generalAmount !== d.totalAmount || d.youthAmount !== 0)) return "General donation must allocate the full amount to General";
  if (d.scope === "YOUTH" && (d.youthAmount !== d.totalAmount || d.generalAmount !== 0)) return "Youth donation must allocate the full amount to Youth";
  if (d.scope === "BOTH") {
    if (round2(d.generalAmount + d.youthAmount) !== round2(d.totalAmount)) return "General + Youth must equal the total amount";
    if (d.generalAmount === 0 || d.youthAmount === 0) return "BOTH requires a non-zero amount for each side";
  }
  return null;
}

export const live = <T extends { deletedAt: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt);

export function auctionPaid(a: Auction, contributions: AuctionContribution[]) {
  return round2(live(contributions).filter((c) => c.auctionId === a.id).reduce((s, c) => s + c.amount, 0));
}
export function auctionRemaining(a: Auction, contributions: AuctionContribution[]) {
  return round2(a.finalAmount - auctionPaid(a, contributions));
}
export function derivePaymentStatus(a: Auction, contributions: AuctionContribution[]) {
  const paid = auctionPaid(a, contributions);
  return paid <= 0 ? "PENDING" : paid >= a.finalAmount ? "PAID" : "PARTIAL";
}
export function validateContribution(a: Auction, contributions: AuctionContribution[], amount: number): string | null {
  if (!(amount > 0)) return "Contribution must be greater than zero";
  if (amount > auctionRemaining(a, contributions)) return "Contribution exceeds remaining amount";
  return null;
}

export function financialSummary(donations: Donation[], expenses: Expense[], auctions: Auction[], contributions: AuctionContribution[]) {
  const d = live(donations), e = live(expenses), a = live(auctions);
  const general = {
    donations: d.reduce((s, x) => s + x.generalAmount, 0),
    auctionCommitted: a.filter((x) => x.scope === "GENERAL").reduce((s, x) => s + x.finalAmount, 0),
    auctionCollected: a.filter((x) => x.scope === "GENERAL").reduce((s, x) => s + auctionPaid(x, contributions), 0),
    expenses: e.filter((x) => x.scope === "GENERAL").reduce((s, x) => s + x.amount, 0),
  };
  const youth = {
    donations: d.reduce((s, x) => s + x.youthAmount, 0),
    auctionCommitted: a.filter((x) => x.scope === "YOUTH").reduce((s, x) => s + x.finalAmount, 0),
    auctionCollected: a.filter((x) => x.scope === "YOUTH").reduce((s, x) => s + auctionPaid(x, contributions), 0),
    expenses: e.filter((x) => x.scope === "YOUTH").reduce((s, x) => s + x.amount, 0),
  };
  const bal = (g: typeof general) => round2(g.donations + g.auctionCollected - g.expenses);
  return { general: { ...general, balance: bal(general) }, youth: { ...youth, balance: bal(youth) } };
}
export type FinancialSummary = ReturnType<typeof financialSummary>;

export const LIFECYCLE: FestivalStatus[] = ["PLANNING", "ACTIVE", "FINAL_REVIEW", "CLOSED", "ARCHIVED"];
export function canTransition(from: FestivalStatus, to: FestivalStatus) {
  return LIFECYCLE.indexOf(to) === LIFECYCLE.indexOf(from) + 1;
}
/** Financial writes allowed only while the festival is being run. */
export const acceptsFinancialWrites = (s: FestivalStatus) => s === "PLANNING" || s === "ACTIVE" || s === "FINAL_REVIEW";

export function resolveViewer(user: User | null, perms: UserPermission[], memberships: FestivalMembership[], festivalId: string): Viewer {
  if (!user || !user.active) return { user: null, permissions: [], isAdmin: false, canSeeYouth: false };
  const isAdmin = user.role === "ADMIN";
  const permissions = perms
    .filter((p) => p.userId === user.id && (p.festivalId === null || p.festivalId === festivalId))
    .map((p) => p.permission);
  const member = memberships.find((m) => m.userId === user.id && m.festivalId === festivalId && m.youth && m.approved);
  const canSeeYouth = isAdmin || (!!member && permissions.includes("YOUTH_ACCESS"));
  return { user, permissions, isAdmin, canSeeYouth };
}
export const can = (v: Viewer, p: Permission) => v.isAdmin || v.permissions.includes(p);
export const canView = (v: Viewer, vis: Visibility) => vis === "PUBLIC" || (vis === "YOUTH" && v.canSeeYouth) || v.isAdmin;
