import { queryOptions } from "@tanstack/react-query";
import {
  getAdminFn, getFestivalsFn, getOverviewFn, getSessionFn, listAuctionsFn, listDonationsFn,
  listExpensesFn, listGalleryFn, listNotificationsFn,
} from "./api.functions";

export type ListParams = { year?: number; q?: string; scope?: "ALL" | "GENERAL" | "YOUTH"; page?: number };

export const sessionQ = () => queryOptions({ queryKey: ["session"], queryFn: () => getSessionFn() });
export const festivalsQ = () => queryOptions({ queryKey: ["festivals"], queryFn: () => getFestivalsFn() });
export const overviewQ = (year?: number) => queryOptions({ queryKey: ["overview", year ?? "current"], queryFn: () => getOverviewFn({ data: { year } }) });
export const donationsQ = (p: ListParams) => queryOptions({ queryKey: ["donations", p], queryFn: () => listDonationsFn({ data: p }) });
export const expensesQ = (p: ListParams) => queryOptions({ queryKey: ["expenses", p], queryFn: () => listExpensesFn({ data: p }) });
export const auctionsQ = (year?: number) => queryOptions({ queryKey: ["auctions", year ?? "current"], queryFn: () => listAuctionsFn({ data: { year } }) });
export const galleryQ = (year?: number) => queryOptions({ queryKey: ["gallery", year ?? "current"], queryFn: () => listGalleryFn({ data: { year } }) });
export const notificationsQ = () => queryOptions({ queryKey: ["notifications"], queryFn: () => listNotificationsFn() });
export const adminQ = () => queryOptions({ queryKey: ["admin"], queryFn: () => getAdminFn() });
