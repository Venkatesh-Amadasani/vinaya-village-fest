import { queryOptions } from "@tanstack/react-query";
import {
  getAdminFn, getFestivalsFn, getOverviewFn, getSessionFn, listAuctionsFn, listDonationsFn,
  listExpensesFn, listGalleryFn, listNotificationsFn, getDonationFn, getExpenseFn, getAuctionFn, getYouthFn, getAdminDataFn,
} from "./api.functions";

export function getClientUid(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const fromStorage = window.localStorage?.getItem("vvc_demo_uid");
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch {}
  try {
    const match = document.cookie?.match(/(?:^|;\s*)vvc_demo_uid=([^;]*)/);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  } catch {}
  return undefined;
}

export type ListParams = { year?: number; q?: string; scope?: "ALL" | "GENERAL" | "YOUTH"; page?: number };

export const sessionQ = () => {
  const uid = getClientUid();
  return queryOptions({
    queryKey: ["session", uid ?? "anon"],
    queryFn: () => getSessionFn({ data: { uid } }),
  });
};

export const festivalsQ = () => queryOptions({ queryKey: ["festivals"], queryFn: () => getFestivalsFn() });
export const overviewQ = (year?: number) => queryOptions({ queryKey: ["overview", year ?? "current"], queryFn: () => getOverviewFn({ data: { year } }) });
export const donationsQ = (p: ListParams) => queryOptions({ queryKey: ["donations", p], queryFn: () => listDonationsFn({ data: p }) });
export const expensesQ = (p: ListParams) => queryOptions({ queryKey: ["expenses", p], queryFn: () => listExpensesFn({ data: p }) });
export const auctionsQ = (year?: number) => queryOptions({ queryKey: ["auctions", year ?? "current"], queryFn: () => listAuctionsFn({ data: { year } }) });
export const galleryQ = (year?: number) => queryOptions({ queryKey: ["gallery", year ?? "current"], queryFn: () => listGalleryFn({ data: { year } }) });
export const notificationsQ = () => queryOptions({ queryKey: ["notifications"], queryFn: () => listNotificationsFn() });

export const adminQ = () => {
  const uid = getClientUid();
  return queryOptions({
    queryKey: ["admin", uid ?? "anon"],
    queryFn: () => getAdminFn({ data: { uid } }),
  });
};

export const donationQ = (id: string) => queryOptions({ queryKey: ["donation", id], queryFn: () => getDonationFn({ data: { id } }) });
export const expenseQ = (id: string) => queryOptions({ queryKey: ["expense", id], queryFn: () => getExpenseFn({ data: { id } }) });
export const auctionQ = (id: string) => queryOptions({ queryKey: ["auction", id], queryFn: () => getAuctionFn({ data: { id } }) });

export const youthQ = () => {
  const uid = getClientUid();
  return queryOptions({
    queryKey: ["youth", uid ?? "anon"],
    queryFn: () => getYouthFn({ data: { uid } }),
  });
};

export const adminDataQ = () => {
  const uid = getClientUid();
  return queryOptions({
    queryKey: ["adminData", uid ?? "anon"],
    queryFn: () => getAdminDataFn({ data: { uid } }),
  });
};
