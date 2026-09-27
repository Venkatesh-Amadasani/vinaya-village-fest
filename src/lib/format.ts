const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number) => inr.format(n);
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));
export const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", PHONEPE: "PhonePe", GOOGLE_PAY: "Google Pay", UPI: "UPI", BANK_TRANSFER: "Bank Transfer", OTHER: "Other",
};
