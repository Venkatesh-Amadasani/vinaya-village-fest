import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { adminQ, adminDataQ } from "@/lib/queries";
import {
  addAuctionFn, addCategoryFn, addFestivalFn, addHighlightFn, addMemoryPostFn, advanceFestivalFn,
  announceFn, approveRecordFn, closeFestivalFn, deleteAuctionFn, deleteHighlightFn, deletePostFn,
  exportReportFn, setCurrentFestivalFn, setPermissionFn, setPostVisibilityFn, toggleHighlightFn,
  updateBrandingFn, updateFestivalFn
} from "@/lib/api.functions";
import type { ExpenseCategory, FestivalStatus } from "@/domain/types";
import { LIFECYCLE } from "@/domain/rules";
import { PERMISSIONS } from "@/domain/types";
import { pick, useI18n, type Key } from "@/lib/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AuctionCard, DonationList, ExpenseList, FundCards } from "@/components/app/Finance";
import { ContributionForm, DeleteRecordDialog } from "@/components/app/Forms";
import { DeniedState, PageSkeleton, Pill, SectionHeader } from "@/components/app/bits";
import { cn } from "@/lib/utils";

function BrandingManager({ branding, festival, lang, onSave }: {
  branding: {
    siteNameEn?: string; siteNameTe?: string; nameEn?: string; nameTe?: string;
    taglineEn?: string; taglineTe?: string; logo?: string | null;
    openingBalanceGeneral?: number; openingBalanceYouth?: number;
  };
  festival: {
    startDate?: string;
    endDate?: string;
  };
  lang: "en" | "te";
  onSave: (data: {
    siteNameEn: string; siteNameTe: string; nameEn: string; nameTe: string;
    taglineEn: string; taglineTe: string; logo: string | null;
    openingBalanceGeneral: number; openingBalanceYouth: number;
    startDate: string; endDate: string;
  }) => Promise<void>;
}) {
  const [siteNameEn, setSiteNameEn] = useState(branding.siteNameEn || "Chinnagollapalli Vinayaka Chavithi");
  const [siteNameTe, setSiteNameTe] = useState(branding.siteNameTe || "చిన్నగొల్లపల్లి వినాయక చవితి");
  const [nameEn, setNameEn] = useState(branding.nameEn || "Sri Vinayaka Chavithi 2026");
  const [nameTe, setNameTe] = useState(branding.nameTe || "శ్రీ వినాయక చవితి 2026");
  const [taglineEn, setTaglineEn] = useState(branding.taglineEn || "Every rupee accounted, every devotee welcome");
  const [taglineTe, setTaglineTe] = useState(branding.taglineTe || "ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం");
  const [logo, setLogo] = useState<string | null>(branding.logo || null);
  const [openingBalanceGeneral, setOpeningBalanceGeneral] = useState<number>(branding.openingBalanceGeneral || 0);
  const [openingBalanceYouth, setOpeningBalanceYouth] = useState<number>(branding.openingBalanceYouth || 0);
  const [startDate, setStartDate] = useState<string>(festival.startDate || "2026-09-14");
  const [endDate, setEndDate] = useState<string>(festival.endDate || "2026-09-24");
  const [saving, setSaving] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(lang === "te" ? "చిత్రం సైజు 2MB కన్నా తక్కువ ఉండాలి" : "Image file should be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      toast.success(lang === "te" ? "లోగో ఎంచుకోబడింది! సేవ్ బటన్ నొక్కండి." : "Logo loaded! Click Save to apply.");
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        siteNameEn, siteNameTe, nameEn, nameTe, taglineEn, taglineTe, logo,
        openingBalanceGeneral, openingBalanceYouth,
        startDate, endDate,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
      <div className="border-b pb-3">
        <h3 className="text-lg font-bold">
          {lang === "te" ? "వెబ్‌సైట్ పేరు, లోగో & ఉత్సవ తేదీలు" : "Website Identity, Logo & Festival Dates"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {lang === "te"
            ? "వెబ్‌సైట్ పేరు, ఉత్సవ తేదీలు, లోగో మరియు గత సంవత్సర నిల్వను ఇక్కడ మార్చండి."
            : "Customize website header name, festival name, logo, festival dates, and forwarded balance."}
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {/* Logo Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/40 border">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">
              {lang === "te" ? "ప్రస్తుత లోగో" : "Current Logo"}
            </span>
            <div className="h-16 w-16 rounded-full border-2 border-primary/20 overflow-hidden bg-background flex items-center justify-center shadow-inner">
              {logo ? (
                <img src={logo} alt="Website Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-festive font-display text-xl text-primary-foreground">ॐ</span>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">
              {lang === "te" ? "కొత్త లోగో అప్‌లోడ్ చేయండి" : "Upload New Logo"}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90">
                {lang === "te" ? "చిత్రాన్ని ఎంచుకోండి" : "Choose Image File"}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {logo && (
                <Button type="button" variant="outline" size="sm" onClick={() => setLogo(null)} className="text-xs text-destructive hover:bg-destructive/10">
                  {lang === "te" ? "డిఫాల్ట్ లోగోకు మార్చండి" : "Reset to Default Logo"}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {lang === "te" ? "PNG, JPG, SVG, WebP ఫైళ్ళకు మద్దతు ఉంది." : "Supports PNG, JPG, SVG, WebP. Recommended: Square image."}
            </p>
          </div>
        </div>

        {/* Website Header Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold">
              {lang === "te" ? "వెబ్‌సైట్ పేరు (ఆంగ్లంలో)" : "Website Header Name"}
            </label>
            <Input required value={siteNameEn} onChange={(e) => setSiteNameEn(e.target.value)} placeholder="Chinnagollapalli Vinayaka Chavithi" maxLength={100} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold">
              {lang === "te" ? "వెబ్‌సైట్ పేరు (తెలుగులో)" : "Website Header Name (Telugu)"}
            </label>
            <Input required value={siteNameTe} onChange={(e) => setSiteNameTe(e.target.value)} placeholder="చిన్నగొల్లపల్లి వినాయక చవితి" maxLength={100} className="mt-1" />
          </div>
        </div>

        {/* Festival Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold">
              {lang === "te" ? "ఉత్సవం పేరు (ఆంగ్లంలో)" : "Festival Name"}
            </label>
            <Input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Sri Vinayaka Chavithi 2026" maxLength={120} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold">
              {lang === "te" ? "ఉత్సవం పేరు (తెలుగులో)" : "Festival Name (Telugu)"}
            </label>
            <Input required value={nameTe} onChange={(e) => setNameTe(e.target.value)} placeholder="శ్రీ వినాయక చవితి 2026" maxLength={120} className="mt-1" />
          </div>
        </div>

        {/* Tagline */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold">
              {lang === "te" ? "ట్యాగ్‌లైన్ (ఆంగ్లంలో)" : "Tagline"}
            </label>
            <Input value={taglineEn} onChange={(e) => setTaglineEn(e.target.value)} placeholder="Every rupee accounted, every devotee welcome" maxLength={200} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold">
              {lang === "te" ? "ట్యాగ్‌లైన్ (తెలుగులో)" : "Tagline (Telugu)"}
            </label>
            <Input value={taglineTe} onChange={(e) => setTaglineTe(e.target.value)} placeholder="ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం" maxLength={200} className="mt-1" />
          </div>
        </div>

        {/* Festival Dates (Shown on Starting Dashboard) */}
        <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
          <div className="border-b pb-2">
            <h4 className="text-sm font-bold">
              {lang === "te" ? "ఉత్సవ ప్రారంభ మరియు ముగింపు తేదీలు" : "Festival Dates (Displayed on Starting Dashboard)"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "te"
                ? "ప్రధాన డాష్‌బోర్డ్‌లో ప్రదర్శించబడే ఉత్సవ ప్రారంభ మరియు ముగింపు తేదీలను మార్చండి."
                : "Change the start and end dates shown on the homepage starting dashboard banner."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">
                {lang === "te" ? "ప్రారంభ తేదీ" : "Start Date"}
              </label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">
                {lang === "te" ? "ముగింపు తేదీ" : "End Date"}
              </label>
              <Input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Forwarded Balance from Previous Year */}
        <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
          <div className="border-b pb-2">
            <h4 className="text-sm font-bold">
              {lang === "te" ? "గత సంవత్సరం నుండి బదిలీ అయిన నిల్వ" : "Forwarded Balance from Previous Year"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "te"
                ? "గత సంవత్సరం నుండి మిగిలిన నిల్వను ప్రస్తుత సంవత్సర ప్రారంభ నిల్వగా నమోదు చేయండి."
                : "Unspent funds carried forward from last year as the starting opening balance for this year."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">
                {lang === "te" ? "జనరల్ ఫండ్ నిల్వ (₹)" : "General Fund Forwarded Balance (₹)"}
              </label>
              <Input
                type="number"
                min="0"
                value={openingBalanceGeneral}
                onChange={(e) => setOpeningBalanceGeneral(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">
                {lang === "te" ? "యూత్ ఫండ్ నిల్వ (₹)" : "Youth Fund Forwarded Balance (₹)"}
              </label>
              <Input
                type="number"
                min="0"
                value={openingBalanceYouth}
                onChange={(e) => setOpeningBalanceYouth(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto font-semibold">
          {saving
            ? (lang === "te" ? "సేవ్ చేస్తోంది..." : "Saving...")
            : (lang === "te" ? "సేవ్ చేయండి" : "Save Website Settings & Dates")}
        </Button>
      </form>
    </div>
  );
}

function UserPermissionManager({ user, lang, onSetPermission }: {
  user: { id: string; name: string; role: string; permissions: string[] };
  lang: "en" | "te";
  onSetPermission: (permission: string, enabled: boolean) => Promise<void> | void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [perms, setPerms] = useState<string[]>(user.permissions);

  useEffect(() => {
    setPerms(user.permissions);
  }, [user.permissions]);

  const toggle = async (p: string, enabled: boolean) => {
    setPerms((prev) => (enabled ? [...prev, p] : prev.filter((x) => x !== p)));
    await onSetPermission(p, enabled);
  };

  const hasYouth = perms.includes("YOUTH_ACCESS");
  const hasDonationAdd = perms.includes("DONATION_ADD");
  const hasExpenseAdd = perms.includes("EXPENSE_ADD");

  const youthBadge = hasYouth
    ? (lang === "te" ? "యువత సభ్యుడు" : "Youth Member")
    : (lang === "te" ? "సాధారణ భక్తుడు" : "Devotee");

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <b className="text-base font-semibold">{user.name}</b>
          <span className="ml-2 inline-block"><Pill tone={user.role === "ADMIN" ? "primary" : "muted"}>{user.role}</Pill></span>
        </div>
        {user.role !== "ADMIN" && (
          <Pill tone={hasYouth ? "youth" : "muted"}>
            {youthBadge}
          </Pill>
        )}
      </div>

      {user.role === "ADMIN" ? (
        <p className="text-sm text-muted-foreground">
          {lang === "te"
            ? "నిర్వాహకుడికి అన్ని డాష్‌బోర్డులు మరియు రికార్డులకు పూర్తి యాక్సెస్ ఉంటుంది."
            : "Admin has complete access to all dashboards and financial records."}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Youth Access */}
            <div className={cn("p-3 rounded-lg border flex flex-col justify-between gap-2", hasYouth ? "bg-primary/5 border-primary/30" : "bg-muted/20")}>
              <div>
                <div className="font-semibold text-sm flex items-center justify-between">
                  <span>{lang === "te" ? "యువత సభ్యత్వ అనుమతి" : "Youth Member Access"}</span>
                  <Switch checked={hasYouth} onCheckedChange={(v) => void toggle("YOUTH_ACCESS", v)} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "te" ? "ప్రత్యక్ష స్విచ్. ఎటువంటి విన్నపం అవసరం లేదు." : "Direct toggle switch. No request needed."}
                </p>
              </div>
            </div>

            {/* Donation Add */}
            <div className={cn("p-3 rounded-lg border flex flex-col justify-between gap-2", hasDonationAdd ? "bg-primary/5 border-primary/30" : "bg-muted/20")}>
              <div>
                <div className="font-semibold text-sm flex items-center justify-between">
                  <span>{lang === "te" ? "విరాళాల నమోదు" : "Record Donations"}</span>
                  <Switch checked={hasDonationAdd} onCheckedChange={(v) => void toggle("DONATION_ADD", v)} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "te" ? "భక్తుల విరాళాలను నమోదు చేయడానికి అనుమతించండి." : "Allow recording devotee donations."}
                </p>
              </div>
            </div>

            {/* Expense Add */}
            <div className={cn("p-3 rounded-lg border flex flex-col justify-between gap-2", hasExpenseAdd ? "bg-primary/5 border-primary/30" : "bg-muted/20")}>
              <div>
                <div className="font-semibold text-sm flex items-center justify-between">
                  <span>{lang === "te" ? "ఖర్చుల నమోదు" : "Record Expenses"}</span>
                  <Switch checked={hasExpenseAdd} onCheckedChange={(v) => void toggle("EXPENSE_ADD", v)} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "te" ? "ఉత్సవ ఖర్చులను నమోదు చేయడానికి అనుమతించండి." : "Allow recording festival expenses."}
                </p>
              </div>
            </div>
          </div>

          <div>
            <button type="button" onClick={() => setShowAll(!showAll)} className="text-xs text-primary font-medium hover:underline">
              {showAll
                ? (lang === "te" ? "ఇతర అనుమతులను దాచండి" : "Hide other permissions")
                : (lang === "te" ? "మరిన్ని అనుమతులు" : "More permissions (Auctions, Approvals, Edits)")}
            </button>
            {showAll && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3 pt-3 border-t">
                {PERMISSIONS.filter((p) => !["YOUTH_ACCESS", "DONATION_ADD", "EXPENSE_ADD"].includes(p)).map((p) => (
                  <label key={p} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                    <Switch checked={perms.includes(p)} onCheckedChange={(v) => void toggle(p, v)} />
                    <span className="truncate">{p}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManager({ categories, onAdd, lang }: { categories: ExpenseCategory[]; onAdd: (c: { nameEn: string; nameTe: string; scope: "GENERAL" | "YOUTH" | "ANY" }) => void; lang: "en" | "te" }) {
  const [en, setEn] = useState(""); const [te, setTe] = useState(""); const [scope, setScope] = useState<"GENERAL" | "YOUTH" | "ANY">("ANY");
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-2 font-semibold">{lang === "te" ? "ఖర్చు వర్గాలు" : "Expense Categories"}</h3>
      <div className="mb-3 flex flex-wrap gap-2">{categories.map((c) => <Pill key={c.id}>{lang === "te" ? c.nameTe : c.nameEn} · {c.scope}</Pill>)}</div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!en.trim() || !te.trim()) return; onAdd({ nameEn: en, nameTe: te, scope }); setEn(""); setTe(""); }}>
        <Input className="max-w-44" placeholder={lang === "te" ? "వర్గం పేరు (ఆంగ్లం)" : "Category Name (English)"} value={en} onChange={(e) => setEn(e.target.value)} maxLength={60} />
        <Input className="max-w-44" placeholder={lang === "te" ? "వర్గం పేరు (తెలుగు)" : "Category Name (Telugu)"} value={te} onChange={(e) => setTe(e.target.value)} maxLength={60} />
        <select className="h-10 rounded-md border bg-background px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as "GENERAL" | "YOUTH" | "ANY")} aria-label="Scope">
          <option value="ANY">{lang === "te" ? "అన్నీ" : "Any"}</option>
          <option value="GENERAL">{lang === "te" ? "సాధారణం" : "General"}</option>
          <option value="YOUTH">{lang === "te" ? "యువత" : "Youth"}</option>
        </select>
        <Button type="submit">{lang === "te" ? "జోడించు" : "Add"}</Button>
      </form>
    </div>
  );
}

type AddAuctionInput = {
  itemEn: string;
  itemTe?: string | undefined;
  scope: "GENERAL" | "YOUTH";
  winnerType: "INDIVIDUAL" | "GROUP";
  winnerName: string;
  finalAmount: number;
  notes?: string | undefined;
};

type AddHighlightInput = {
  titleEn: string;
  titleTe?: string | undefined;
  bodyEn: string;
  bodyTe?: string | undefined;
  imageUrl?: string | null | undefined;
  enabled?: boolean | undefined;
};

type AddMemoryInput = {
  titleEn: string;
  titleTe?: string | undefined;
  body: string;
  visibility: "PUBLIC" | "YOUTH" | "ADMIN";
  imageUrl?: string | null | undefined;
};

function AddAuctionDialog({ onAdd, lang }: { onAdd: (data: AddAuctionInput) => Promise<void>; lang: "en" | "te" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [itemEn, setItemEn] = useState("");
  const [itemTe, setItemTe] = useState("");
  const [scope, setScope] = useState<"GENERAL" | "YOUTH">("GENERAL");
  const [winnerType, setWinnerType] = useState<"INDIVIDUAL" | "GROUP">("INDIVIDUAL");
  const [winnerName, setWinnerName] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEn.trim() || !winnerName.trim() || !finalAmount) return;
    setBusy(true);
    try {
      await onAdd({
        itemEn: itemEn.trim(),
        itemTe: itemTe.trim() || itemEn.trim(),
        scope,
        winnerType,
        winnerName: winnerName.trim(),
        finalAmount: Number(finalAmount),
        notes: notes.trim() || undefined,
      });
      setOpen(false);
      setItemEn("");
      setItemTe("");
      setWinnerName("");
      setFinalAmount("");
      setNotes("");
      toast.success(lang === "te" ? "వేలం విజయవంతంగా జోడించబడింది" : "Auction item added successfully");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold">+ {lang === "te" ? "కొత్త వేలం జోడించండి" : "Add Auction Item"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "te" ? "కొత్త వేలం నమోదు" : "Add New Auction Item"}</DialogTitle>
          <DialogDescription>
            {lang === "te" ? "గెలుచుకున్న వేలం వస్తువు మరియు బిడ్ వివరాలను నమోదు చేయండి." : "Record a completed auction item with winner and winning bid amount."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "వస్తువు పేరు (ఆంగ్లంలో)" : "Item Name"}</label>
            <Input required value={itemEn} onChange={(e) => setItemEn(e.target.value)} placeholder="e.g. Main Laddu Prasadam" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "వస్తువు పేరు (తెలుగులో)" : "Item Name (Telugu)"}</label>
            <Input value={itemTe} onChange={(e) => setItemTe(e.target.value)} placeholder="ఉదా: ప్రధాన లడ్డూ ప్రసాదం" maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold">{lang === "te" ? "ఫండ్ వర్గం" : "Fund Scope"}</label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as "GENERAL" | "YOUTH")}>
                <option value="GENERAL">{lang === "te" ? "సాధారణ నిధి" : "General Fund"}</option>
                <option value="YOUTH">{lang === "te" ? "యువత నిధి" : "Youth Fund"}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">{lang === "te" ? "విజేత రకం" : "Winner Type"}</label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={winnerType} onChange={(e) => setWinnerType(e.target.value as "INDIVIDUAL" | "GROUP")}>
                <option value="INDIVIDUAL">{lang === "te" ? "వ్యక్తిగత" : "Individual"}</option>
                <option value="GROUP">{lang === "te" ? "సమూహం" : "Group"}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "విజేత పేరు" : "Winner Name"}</label>
            <Input required value={winnerName} onChange={(e) => setWinnerName(e.target.value)} placeholder="e.g. Ramesh Goud" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "చివరి గెలుపు మొత్తం (₹)" : "Final Winning Amount (₹)"}</label>
            <Input required type="number" min="1" max="10000000" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} placeholder="25000" />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "గమనికలు" : "Notes"}</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={lang === "te" ? "ఐచ్ఛిక గమనికలు" : "Optional notes"} maxLength={200} />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{lang === "te" ? "రద్దు" : "Cancel"}</Button>
            <Button type="submit" disabled={busy}>{busy ? (lang === "te" ? "నమోదవుతోంది..." : "Saving...") : (lang === "te" ? "వేలం సేవ్ చేయండి" : "Save Auction")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddHighlightDialog({ onAdd, lang }: { onAdd: (data: AddHighlightInput) => Promise<void>; lang: "en" | "te" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [titleEn, setTitleEn] = useState("");
  const [titleTe, setTitleTe] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyTe, setBodyTe] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error(lang === "te" ? "చిత్రం సైజు 3MB కన్నా తక్కువ ఉండాలి" : "Image file should be less than 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim() || !bodyEn.trim()) return;
    setBusy(true);
    try {
      await onAdd({
        titleEn: titleEn.trim(),
        titleTe: titleTe.trim() || titleEn.trim(),
        bodyEn: bodyEn.trim(),
        bodyTe: bodyTe.trim() || bodyEn.trim(),
        imageUrl,
        enabled: true,
      });
      setOpen(false);
      setTitleEn("");
      setTitleTe("");
      setBodyEn("");
      setBodyTe("");
      setImageUrl(null);
      toast.success(lang === "te" ? "ముఖ్యాంశం జోడించబడింది" : "Highlight added successfully");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold">+ {lang === "te" ? "కొత్త ముఖ్యాంశం జోడించండి" : "Add Highlight"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "te" ? "కొత్త ముఖ్యాంశం" : "Add Festival Highlight"}</DialogTitle>
          <DialogDescription>
            {lang === "te" ? "ఉత్సవ ప్రత్యేకతలను హోమ్ పేజీలో ప్రదర్శించండి." : "Add a featured moment or announcement to the homepage carousel."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "శీర్షిక (ఆంగ్లంలో)" : "Title"}</label>
            <Input required value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="e.g. Grand Laddu Auction Winner" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "శీర్షిక (తెలుగులో)" : "Title (Telugu)"}</label>
            <Input value={titleTe} onChange={(e) => setTitleTe(e.target.value)} placeholder="ఉదా: ఘనంగా ముగిసిన లడ్డూ వేలం" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "వివరణ (ఆంగ్లంలో)" : "Description"}</label>
            <Input required value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} placeholder="e.g. Smt & Sri Venkatesh won the sacred laddu" maxLength={300} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "వివరణ (తెలుగులో)" : "Description (Telugu)"}</label>
            <Input value={bodyTe} onChange={(e) => setBodyTe(e.target.value)} placeholder="ఉదా: వెంకటేష్ దంపతులు లడ్డూ ప్రసాదాన్ని దక్కించుకున్నారు" maxLength={300} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "ఫోటో అప్‌లోడ్ చేయండి" : "Highlight Photo"}</label>
            <div className="flex items-center gap-3 mt-1">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
                {lang === "te" ? "చిత్రాన్ని ఎంచుకోండి" : "Choose Image File"}
                <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              </label>
              {imageUrl && <span className="text-xs text-primary font-medium">{lang === "te" ? "ఎంచుకోబడింది" : "Image selected"}</span>}
            </div>
            {imageUrl && (
              <div className="mt-2 h-20 w-32 rounded border overflow-hidden">
                <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{lang === "te" ? "రద్దు" : "Cancel"}</Button>
            <Button type="submit" disabled={busy}>{busy ? (lang === "te" ? "సేవ్ చేస్తోంది..." : "Saving...") : (lang === "te" ? "సేవ్ చేయండి" : "Save Highlight")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemoryDialog({ onAdd, lang }: { onAdd: (data: AddMemoryInput) => Promise<void>; lang: "en" | "te" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [titleEn, setTitleEn] = useState("");
  const [titleTe, setTitleTe] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "YOUTH" | "ADMIN">("PUBLIC");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error(lang === "te" ? "చిత్రం సైజు 3MB కన్నా తక్కువ ఉండాలి" : "Image file should be less than 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) return;
    setBusy(true);
    try {
      await onAdd({
        titleEn: titleEn.trim(),
        titleTe: titleTe.trim() || titleEn.trim(),
        body: body.trim(),
        visibility,
        imageUrl,
      });
      setOpen(false);
      setTitleEn("");
      setTitleTe("");
      setBody("");
      setImageUrl(null);
      toast.success(lang === "te" ? "ఫోటో & జ్ఞాపకం జోడించబడింది" : "Memory & photo added successfully");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold">+ {lang === "te" ? "కొత్త ఫోటో / జ్ఞాపకం జోడించండి" : "Add Photo & Memory"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "te" ? "ఫోటో & జ్ఞాపకం జోడించండి" : "Add Memory & Media"}</DialogTitle>
          <DialogDescription>
            {lang === "te" ? "గ్యాలరీ కోసం ఉత్సవ ఫోటో మరియు జ్ఞాపకాలను అప్‌లోడ్ చేయండి." : "Upload festival photos and memorable moments to the village gallery."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "శీర్షిక (ఆంగ్లంలో)" : "Title"}</label>
            <Input required value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="e.g. Visarjan Procession" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "శీర్షిక (తెలుగులో)" : "Title (Telugu)"}</label>
            <Input value={titleTe} onChange={(e) => setTitleTe(e.target.value)} placeholder="ఉదా: నిమజ్జన శోభాయాత్ర" maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "వివరణ" : "Caption / Story"}</label>
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder={lang === "te" ? "కార్యక్రమ జ్ఞాపకాలు..." : "Memorable moments from the event..."} maxLength={500} />
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "ఎవరికి కనిపించాలి" : "Visibility"}</label>
            <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={visibility} onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "YOUTH" | "ADMIN")}>
              <option value="PUBLIC">{lang === "te" ? "ప్రజలందరికీ (PUBLIC)" : "PUBLIC"}</option>
              <option value="YOUTH">{lang === "te" ? "యువత సభ్యులకు మాత్రమే (YOUTH)" : "YOUTH"}</option>
              <option value="ADMIN">{lang === "te" ? "నిర్వాహకులకు మాత్రమే (ADMIN)" : "ADMIN"}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold">{lang === "te" ? "ఫోటో ఎంచుకోండి" : "Upload Photo"}</label>
            <div className="flex items-center gap-3 mt-1">
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
                {lang === "te" ? "చిత్రాన్ని ఎంచుకోండి" : "Choose Image File"}
                <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              </label>
              {imageUrl && <span className="text-xs text-primary font-medium">{lang === "te" ? "ఎంచుకోబడింది" : "Image selected"}</span>}
            </div>
            {imageUrl && (
              <div className="mt-2 h-24 w-36 rounded border overflow-hidden">
                <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{lang === "te" ? "రద్దు" : "Cancel"}</Button>
            <Button type="submit" disabled={busy}>{busy ? (lang === "te" ? "సేవ్ చేస్తోంది..." : "Saving...") : (lang === "te" ? "సేవ్ చేయండి" : "Save Memory")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AdminFestivalItem = {
  id: string;
  year: number;
  status: FestivalStatus;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  name: string;
  nameEn: string;
  nameTe: string;
  openingBalanceGeneral: number;
  openingBalanceYouth: number;
};

function AddFestivalDialog({
  festivals,
  lang,
  onAdd,
}: {
  festivals: AdminFestivalItem[];
  lang: "en" | "te";
  onAdd: (data: {
    year: number;
    nameEn: string;
    nameTe?: string;
    startDate?: string;
    endDate?: string;
    status: FestivalStatus;
    isCurrent: boolean;
    carryForwardFromYear?: number;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const maxYear = festivals.length > 0 ? Math.max(...festivals.map((f) => f.year)) : 2026;
  const [year, setYear] = useState<number>(maxYear + 1);
  const [nameEn, setNameEn] = useState(`Sri Vinayaka Chavithi ${maxYear + 1}`);
  const [nameTe, setNameTe] = useState(`శ్రీ వినాయక చవితి ${maxYear + 1}`);
  const [startDate, setStartDate] = useState(`${maxYear + 1}-09-01`);
  const [endDate, setEndDate] = useState(`${maxYear + 1}-09-11`);
  const [status, setStatus] = useState<FestivalStatus>("PLANNING");
  const [isCurrent, setIsCurrent] = useState(false);
  const [carryForwardYear, setCarryForwardYear] = useState<string>("none");

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setNameEn(`Sri Vinayaka Chavithi ${newYear}`);
    setNameTe(`శ్రీ వినాయక చవితి ${newYear}`);
    setStartDate(`${newYear}-09-01`);
    setEndDate(`${newYear}-09-11`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !year) return;
    setBusy(true);
    try {
      await onAdd({
        year,
        nameEn: nameEn.trim(),
        nameTe: nameTe.trim() || nameEn.trim(),
        startDate,
        endDate,
        status,
        isCurrent,
        ...(carryForwardYear !== "none" ? { carryForwardFromYear: Number(carryForwardYear) } : {}),
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold gap-1.5 shadow-sm">
          <span>+</span>
          <span>{lang === "te" ? "కొత్త ఉత్సవ సంవత్సరం జోడించండి" : "Add Festival Year"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lang === "te" ? "కొత్త ఉత్సవ సంవత్సరాన్ని జోడించండి" : "Add New Festival Edition"}
          </DialogTitle>
          <DialogDescription>
            {lang === "te"
              ? "కొత్త ఉత్సవ సంవత్సరాన్ని సృష్టించండి, తేదీలను నిర్ణయించండి మరియు మునుపటి సంవత్సరం నిల్వను బదిలీ చేయండి."
              : "Create a new festival edition, configure dates, and optionally carry forward unspent balances from a prior year."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "సంవత్సరం" : "Festival Year"}
              </label>
              <Input
                type="number"
                min={2000}
                max={2100}
                required
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "ప్రారంభ స్థితి" : "Initial Status"}
              </label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as FestivalStatus)}
              >
                <option value="PLANNING">{lang === "te" ? "ప్రణాళిక" : "Planning"}</option>
                <option value="ACTIVE">{lang === "te" ? "జరుగుతోంది" : "Active"}</option>
                <option value="FINAL_REVIEW">{lang === "te" ? "తుది సమీక్ష" : "Final Review"}</option>
                <option value="CLOSED">{lang === "te" ? "ముగిసింది" : "Closed"}</option>
                <option value="ARCHIVED">{lang === "te" ? "భద్రపరచబడింది" : "Archived"}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "ఉత్సవం పేరు (ఆంగ్లం)" : "Festival Name (English)"}
            </label>
            <Input
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Sri Vinayaka Chavithi 2028"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "ఉత్సవం పేరు (తెలుగు)" : "Festival Name (Telugu)"}
            </label>
            <Input
              value={nameTe}
              onChange={(e) => setNameTe(e.target.value)}
              placeholder="శ్రీ వినాయక చవితి 2028"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "ప్రారంభ తేదీ" : "Start Date"}
              </label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "ముగింపు తేదీ" : "End Date"}
              </label>
              <Input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Carry forward prior year balance */}
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <label className="text-xs font-semibold block">
              {lang === "te"
                ? "గత సంవత్సరం నుండి మిగిలిన నిల్వను బదిలీ చేయాలా?"
                : "Carry forward unspent balance from prior festival?"}
            </label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={carryForwardYear}
              onChange={(e) => setCarryForwardYear(e.target.value)}
            >
              <option value="none">
                {lang === "te" ? "బదిలీ చేయవద్దు (0 నిల్వ)" : "None (Start with 0 balance)"}
              </option>
              {festivals.map((f) => (
                <option key={f.id} value={f.year}>
                  {lang === "te"
                    ? `${f.year} (${f.nameTe || f.name}) నిల్వను బదిలీ చేయండి`
                    : `Forward unspent balance from ${f.year} (${f.nameEn || f.name})`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {lang === "te"
                ? "ఎంచుకున్న సంవత్సరం నుండి మిగిలిన జనరల్ మరియు యూత్ ఫండ్ నిల్వలు స్వయంచాలకంగా లెక్కించబడి ఈ కొత్త సంవత్సర ప్రారంభ నిల్వగా నమోదు అవుతాయి."
                : "The remaining closing balances from the selected year will automatically become the starting opening balance for this new year."}
            </p>
          </div>

          {/* Make Current Festival toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div>
              <div className="text-sm font-semibold">
                {lang === "te" ? "ప్రస్తుత క్రియాశీల ఉత్సవంగా చేయండి" : "Make Current Active Festival"}
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "te"
                  ? "వెబ్‌సైట్ హోమ్‌పేజీ మరియు ప్రధాన విభాగాలలో ఈ సంవత్సరాన్ని చూపిస్తుంది."
                  : "Displays this year on the homepage banner and default views."}
              </p>
            </div>
            <Switch checked={isCurrent} onCheckedChange={setIsCurrent} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {lang === "te" ? "రద్దు" : "Cancel"}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy
                ? (lang === "te" ? "జోడిస్తోంది..." : "Creating...")
                : (lang === "te" ? "ఉత్సవాన్ని సృష్టించండి" : "Create Festival")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditFestivalDialog({
  festival,
  lang,
  onSave,
}: {
  festival: AdminFestivalItem;
  lang: "en" | "te";
  onSave: (data: {
    id: string;
    year: number;
    nameEn: string;
    nameTe: string;
    startDate: string;
    endDate: string;
    status: FestivalStatus;
    isCurrent: boolean;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [year, setYear] = useState<number>(festival.year);
  const [nameEn, setNameEn] = useState(festival.nameEn || festival.name);
  const [nameTe, setNameTe] = useState(festival.nameTe || festival.name);
  const [startDate, setStartDate] = useState(festival.startDate || `${festival.year}-09-01`);
  const [endDate, setEndDate] = useState(festival.endDate || `${festival.year}-09-11`);
  const [status, setStatus] = useState<FestivalStatus>(festival.status);
  const [isCurrent, setIsCurrent] = useState(festival.isCurrent);

  useEffect(() => {
    setYear(festival.year);
    setNameEn(festival.nameEn || festival.name);
    setNameTe(festival.nameTe || festival.name);
    setStartDate(festival.startDate || `${festival.year}-09-01`);
    setEndDate(festival.endDate || `${festival.year}-09-11`);
    setStatus(festival.status);
    setIsCurrent(festival.isCurrent);
  }, [festival]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        id: festival.id,
        year,
        nameEn: nameEn.trim(),
        nameTe: nameTe.trim(),
        startDate,
        endDate,
        status,
        isCurrent,
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {lang === "te" ? "సవరించు" : "Edit"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lang === "te"
              ? `${festival.year} ఉత్సవ వివరాలను సవరించండి`
              : `Edit Festival ${festival.year}`}
          </DialogTitle>
          <DialogDescription>
            {lang === "te"
              ? "ఉత్సవ సంవత్సరం, పేర్లు, ప్రారంభ/ముగింపు తేదీలు మరియు స్థితిని మార్చండి."
              : "Update festival year number, bilingual titles, dates, or lifecycle status."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "సంవత్సరం" : "Festival Year"}
              </label>
              <Input
                type="number"
                min={2000}
                max={2100}
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "ఉత్సవ స్థితి" : "Festival Status"}
              </label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as FestivalStatus)}
              >
                <option value="PLANNING">{lang === "te" ? "ప్రణాళిక" : "Planning"}</option>
                <option value="ACTIVE">{lang === "te" ? "జరుగుతోంది" : "Active"}</option>
                <option value="FINAL_REVIEW">{lang === "te" ? "తుది సమీక్ష" : "Final Review"}</option>
                <option value="CLOSED">{lang === "te" ? "ముగిసింది" : "Closed"}</option>
                <option value="ARCHIVED">{lang === "te" ? "భద్రపరచబడింది" : "Archived"}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "ఉత్సవం పేరు (ఆంగ్లం)" : "Festival Name (English)"}
            </label>
            <Input
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "ఉత్సవం పేరు (తెలుగు)" : "Festival Name (Telugu)"}
            </label>
            <Input
              value={nameTe}
              onChange={(e) => setNameTe(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "ప్రారంభ తేదీ" : "Start Date"}
              </label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "ముగింపు తేదీ" : "End Date"}
              </label>
              <Input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div>
              <div className="text-sm font-semibold">
                {lang === "te" ? "ప్రస్తుత క్రియాశీల ఉత్సవంగా చేయండి" : "Make Current Active Festival"}
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "te"
                  ? "హోమ్‌పేజీ మరియు ప్రధాన డాష్‌బోర్డులో ఈ సంవత్సరం ప్రదర్శించబడుతుంది."
                  : "Sets this year as the active edition on the homepage."}
              </p>
            </div>
            <Switch checked={isCurrent} onCheckedChange={setIsCurrent} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {lang === "te" ? "రద్దు" : "Cancel"}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy
                ? (lang === "te" ? "సేవ్ చేస్తోంది..." : "Saving...")
                : (lang === "te" ? "సేవ్ చేయండి" : "Save Changes")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CloseFestivalDialog({
  festival,
  festivals,
  lang,
  onClose,
}: {
  festival: AdminFestivalItem;
  festivals: AdminFestivalItem[];
  lang: "en" | "te";
  onClose: (data: { id: string; forwardToFestivalId?: string; reason?: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const otherFestivals = festivals.filter((f) => f.id !== festival.id);
  const defaultTarget = otherFestivals.find((f) => f.year > festival.year) || otherFestivals[0];
  const [targetId, setTargetId] = useState<string>(defaultTarget?.id || "none");
  const [reason, setReason] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onClose({
        id: festival.id,
        ...(targetId !== "none" ? { forwardToFestivalId: targetId } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20">
          {lang === "te" ? "ముగింపు & నిల్వ బదిలీ" : "Close & Forward"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lang === "te"
              ? `${festival.year} ఉత్సవాన్ని ముగించండి`
              : `Close Festival ${festival.year}`}
          </DialogTitle>
          <DialogDescription>
            {lang === "te"
              ? "ఈ ఉత్సవాన్ని ముగించి మిగిలిన నిల్వను తదుపరి సంవత్సరానికి బదిలీ చేయండి."
              : "Mark this festival edition as CLOSED and forward remaining funds to another year."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="rounded-lg border border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">
              {lang === "te" ? "ముఖ్య గమనిక:" : "Important Note:"}
            </p>
            <p>
              {lang === "te"
                ? "ఉత్సవం ముగిసిన తర్వాత, ఆర్థిక రికార్డులు చదవడానికి మాత్రమే ఉంటాయి (ఫ్రీజ్ చేయబడతాయి). మిగిలిన నిల్వ క్రింద ఎంచుకున్న సంవత్సరానికి బదిలీ చేయబడుతుంది."
                : "Once closed, financial records will be frozen to read-only. Unspent general and youth fund balances will be credited to the chosen target year's opening balance."}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te"
                ? "మిగిలిన నిల్వను ఏ సంవత్సరానికి బదిలీ చేయాలి?"
                : "Forward remaining balance to which festival?"}
            </label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="none">
                {lang === "te" ? "ఎక్కడికీ బదిలీ చేయవద్దు (ఈ సంవత్సరంలోనే ఉంచండి)" : "Do not forward (Keep in this festival)"}
              </option>
              {otherFestivals.map((f) => (
                <option key={f.id} value={f.id}>
                  {lang === "te"
                    ? `${f.year} (${f.nameTe || f.name}) కి బదిలీ చేయండి`
                    : `Forward to ${f.year} (${f.nameEn || f.name})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "ముగింపు కారణం / వ్యాఖ్య (ఐచ్ఛికం)" : "Closing reason / note (Optional)"}
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={lang === "te" ? "ఉదా: ఉత్సవం విజయవంతంగా ముగిసింది" : "e.g. Festival successfully completed"}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {lang === "te" ? "రద్దు" : "Cancel"}
            </Button>
            <Button type="submit" disabled={busy} className="bg-amber-600 hover:bg-amber-700 text-white">
              {busy
                ? (lang === "te" ? "ముగిస్తోంది..." : "Closing...")
                : (lang === "te" ? "ఉత్సవాన్ని ముగించండి" : "Confirm & Close Festival")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FestivalEditionsManager({
  festivals,
  lang,
  onAddFestival,
  onUpdateFestival,
  onSetCurrent,
  onCloseFestival,
  onStatusChange,
}: {
  festivals: AdminFestivalItem[];
  lang: "en" | "te";
  onAddFestival: (data: {
    year: number;
    nameEn: string;
    nameTe?: string;
    startDate?: string;
    endDate?: string;
    status: FestivalStatus;
    isCurrent: boolean;
    carryForwardFromYear?: number;
  }) => Promise<void>;
  onUpdateFestival: (data: {
    id: string;
    year: number;
    nameEn: string;
    nameTe: string;
    startDate: string;
    endDate: string;
    status: FestivalStatus;
    isCurrent: boolean;
  }) => Promise<void>;
  onSetCurrent: (id: string) => Promise<void>;
  onCloseFestival: (data: { id: string; forwardToFestivalId?: string; reason?: string }) => Promise<void>;
  onStatusChange: (id: string, to: FestivalStatus) => Promise<void>;
}) {
  const statusLabels: Record<FestivalStatus, { en: string; te: string; tone: "primary" | "muted" | "youth" | "warn" }> = {
    PLANNING: { en: "Planning", te: "ప్రణాళిక", tone: "muted" },
    ACTIVE: { en: "Active", te: "జరుగుతోంది", tone: "primary" },
    FINAL_REVIEW: { en: "Final Review", te: "తుది సమీక్ష", tone: "youth" },
    CLOSED: { en: "Closed", te: "ముగిసింది", tone: "warn" },
    ARCHIVED: { en: "Archived", te: "భద్రపరచబడింది", tone: "muted" },
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>{lang === "te" ? "ఉత్సవ సంవత్సరాల నిర్వహణ" : "Festival Editions & Years"}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
              {festivals.length}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === "te"
              ? "కొత్త సంవత్సరాలు జోడించండి, స్థితి మార్చండి, ముగించండి మరియు ప్రస్తుత ఉత్సవాన్ని నిర్ణయించండి."
              : "Add new years, switch active edition, disable/archive, edit details, or close and forward balances."}
          </p>
        </div>
        <AddFestivalDialog festivals={festivals} lang={lang} onAdd={onAddFestival} />
      </div>

      <div className="grid gap-3">
        {festivals.map((f) => {
          const s = statusLabels[f.status] || { en: f.status, te: f.status, tone: "muted" as const };
          const festName = lang === "te" ? (f.nameTe || f.name) : (f.nameEn || f.name);

          return (
            <div
              key={f.id}
              className={cn(
                "rounded-xl border p-4 transition-all space-y-3",
                f.isCurrent
                  ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20 shadow-sm"
                  : "bg-muted/15 hover:bg-muted/30"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl font-bold tracking-tight">
                    {f.year}
                  </span>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{festName}</span>
                      {f.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary text-primary-foreground">
                          ★ {lang === "te" ? "ప్రస్తుత ఉత్సవం" : "CURRENT"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.startDate} → {f.endDate}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Pill tone={s.tone}>
                    {lang === "te" ? s.te : s.en}
                  </Pill>

                  {/* Direct status dropdown */}
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
                    value={f.status}
                    onChange={(e) => void onStatusChange(f.id, e.target.value as FestivalStatus)}
                    aria-label="Change status"
                  >
                    <option value="PLANNING">{lang === "te" ? "ప్రణాళిక" : "Planning"}</option>
                    <option value="ACTIVE">{lang === "te" ? "జరుగుతోంది" : "Active"}</option>
                    <option value="FINAL_REVIEW">{lang === "te" ? "తుది సమీక్ష" : "Final Review"}</option>
                    <option value="CLOSED">{lang === "te" ? "ముగిసింది" : "Closed"}</option>
                    <option value="ARCHIVED">{lang === "te" ? "భద్రపరచబడింది" : "Archived"}</option>
                  </select>
                </div>
              </div>

              {/* Balances & Action row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                <div className="text-muted-foreground flex items-center gap-3">
                  <span>
                    {lang === "te" ? "ప్రారంభ నిల్వ:" : "Opening balance:"}{" "}
                    <b className="text-foreground">₹{f.openingBalanceGeneral.toLocaleString("en-IN")}</b>
                    {f.openingBalanceYouth > 0 && (
                      <span className="ml-1 text-[11px]">
                        ({lang === "te" ? "యువత:" : "Youth:"} ₹{f.openingBalanceYouth.toLocaleString("en-IN")})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {!f.isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold hover:border-primary hover:text-primary"
                      onClick={() => void onSetCurrent(f.id)}
                    >
                      ★ {lang === "te" ? "ప్రస్తుత ఉత్సవంగా చేయండి" : "Set as Current"}
                    </Button>
                  )}

                  <EditFestivalDialog festival={f} lang={lang} onSave={onUpdateFestival} />

                  {f.status !== "CLOSED" && f.status !== "ARCHIVED" && (
                    <CloseFestivalDialog
                      festival={f}
                      festivals={festivals}
                      lang={lang}
                      onClose={onCloseFestival}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS: Key[] = ["overview", "settings", "users", "highlights", "memories", "records", "auctions", "notifications", "auditLog", "reports"];
export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Vinayaka Chavithi Festival" }, { name: "description", content: "Festival administration." }, { property: "og:title", content: "Festival Admin" }, { property: "og:description", content: "Manage the village festival." }, { name: "robots", content: "noindex" }] }),
  component: Page,
});
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed");

function Page() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const a = useQuery(adminQ()).data;
  const d = useQuery(adminDataQ()).data;
  const [tab, setTab] = useState<Key>("overview");
  const [del, setDel] = useState<{ entity: "donation" | "expense"; id: string; label: string } | null>(null);
  const [ann, setAnn] = useState({ titleEn: "", titleTe: "", body: "" });
  if (!a || !d) return <PageSkeleton />;
  if (a.denied || d.denied) return <DeniedState />;
  const refresh = () => qc.invalidateQueries();
  const run = async (p: Promise<unknown>) => { try { await p; await refresh(); toast.success(lang === "te" ? "సేవ్ చేయబడింది" : "Saved"); } catch (e) { err(e); } };
  const readOnly = !["PLANNING", "ACTIVE", "FINAL_REVIEW"].includes(d.festival.status);
  const next = LIFECYCLE[LIFECYCLE.indexOf(d.festival.status) + 1];

  return (
    <div>
      <SectionHeader title={t("admin")} sub={`${pick(lang, d.branding.nameEn, d.branding.nameTe)} · ${t(d.festival.status)}`} />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist">
        {TABS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("h-10 shrink-0 rounded-md px-3 text-sm font-medium", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            {t(k)}
          </button>
        ))}
      </div>
      {readOnly && <p className="mb-4 rounded-lg border bg-muted p-3 text-sm">{t("readOnly")}</p>}

      {tab === "overview" && (
        <div className="space-y-6">
          <h3 className="font-semibold">{t("general")}</h3>
          <FundCards fund={d.summary.general} />
          <h3 className="font-semibold">{t("youthFund")}</h3>
          <FundCards fund={d.summary.youth} youth />
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-5">
          <BrandingManager
            branding={d.branding}
            festival={d.festival}
            lang={lang}
            onSave={(b) => run(updateBrandingFn({ data: b }))}
          />
          <FestivalEditionsManager
            festivals={a.festivals}
            lang={lang}
            onAddFestival={(item) => run(addFestivalFn({ data: item }))}
            onUpdateFestival={(item) => run(updateFestivalFn({ data: item }))}
            onSetCurrent={(id) => run(setCurrentFestivalFn({ data: { id } }))}
            onCloseFestival={(item) => run(closeFestivalFn({ data: item }))}
            onStatusChange={(id, to) => run(advanceFestivalFn({ data: { id, to } }))}
          />
          <CategoryManager categories={d.categories} onAdd={(c) => void run(addCategoryFn({ data: c }))} lang={lang} />
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {lang === "te"
              ? "కమిటీ సభ్యులకు యూత్ డాష్‌బోర్డ్, విరాళాల నమోదు మరియు ఖర్చుల నమోదు అనుమతులను నేరుగా కేటాయించండి:"
              : "Grant youth dashboard access, donation recording access, and expense recording permissions to committee members directly:"}
          </p>
          {a.users.map((u) => (
            <UserPermissionManager
              key={u.id}
              user={u}
              lang={lang}
              onSetPermission={(permission, enabled) => void run(setPermissionFn({ data: { userId: u.id, permission, enabled } }))}
            />
          ))}
        </div>
      )}

      {tab === "highlights" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{lang === "te" ? "ముఖ్యాంశాల నిర్వహణ" : "Festival Highlights"}</h3>
            <AddHighlightDialog onAdd={(item) => run(addHighlightFn({ data: item }))} lang={lang} />
          </div>
          <ul className="space-y-2">
            {a.highlights.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
                {h.image && (
                  <div className="h-12 w-16 rounded overflow-hidden border shrink-0">
                    <img src={h.image} alt={h.titleEn} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{pick(lang, h.titleEn, h.titleTe)}</div>
                  <div className="text-xs text-muted-foreground">{pick(lang, h.bodyEn, h.bodyTe)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => void run(toggleHighlightFn({ data: { id: h.id, move: "up" } }))}>↑</Button>
                  <Button size="sm" variant="outline" onClick={() => void run(toggleHighlightFn({ data: { id: h.id, move: "down" } }))}>↓</Button>
                  <Switch checked={h.enabled} onCheckedChange={(v) => void run(toggleHighlightFn({ data: { id: h.id, enabled: v } }))} aria-label="Enabled" />
                  <Button size="sm" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => void run(deleteHighlightFn({ data: { id: h.id } }))}>
                    {lang === "te" ? "తొలగించు" : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "memories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{lang === "te" ? "ఫోటోలు & జ్ఞాపకాల నిర్వహణ" : "Memories & Gallery Media"}</h3>
            <AddMemoryDialog onAdd={(item) => run(addMemoryPostFn({ data: item }))} lang={lang} />
          </div>
          <ul className="space-y-2">
            {d.posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
                {p.media[0] && (
                  <div className="h-14 w-20 rounded overflow-hidden border shrink-0">
                    <img src={p.media[0].url} alt={p.titleEn} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{pick(lang, p.titleEn, p.titleTe)}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{p.body}</div>
                  <span className="text-xs text-muted-foreground font-medium">({p.media.length} {lang === "te" ? "మీడియా" : "media"})</span>
                </div>
                <div className="flex items-center gap-2">
                  <select className="h-9 rounded-md border bg-background px-2 text-xs font-medium" value={p.visibility} onChange={(e) => void run(setPostVisibilityFn({ data: { id: p.id, visibility: e.target.value as "PUBLIC" | "YOUTH" | "ADMIN" } }))}>
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="YOUTH">YOUTH</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <Button size="sm" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => void run(deletePostFn({ data: { id: p.id } }))}>
                    {lang === "te" ? "తొలగించు" : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "records" && (
        <div className="space-y-6">
          {d.donations.filter((x) => x.status === "PENDING_APPROVAL" && !x.deletedAt).map((x) => {
            const donorName = lang === "te" ? (x.donorNameTe || x.donorName) : (x.donorName || x.donorNameTe);
            return (
              <div key={x.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <span className="flex-1">{donorName} · {formatINR(x.totalAmount)}</span>
                <Button size="sm" disabled={readOnly} onClick={() => void run(approveRecordFn({ data: { id: x.id } }))}>
                  {lang === "te" ? "ఆమోదించండి" : "Approve"}
                </Button>
              </div>
            );
          })}
          <h3 className="font-semibold">{t("donations")}</h3>
          <DonationList rows={d.donations.filter((x) => !x.deletedAt)} showSplit {...(readOnly ? {} : { onDelete: (x) => setDel({ entity: "donation", id: x.id, label: x.donorName }) })} />
          <h3 className="font-semibold">{t("expenses")}</h3>
          <ExpenseList rows={d.expenses.filter((x) => !x.deletedAt)} categories={d.categories} {...(readOnly ? {} : { onDelete: (x) => setDel({ entity: "expense", id: x.id, label: x.description }) })} />
        </div>
      )}

      {tab === "auctions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("auctions")}</h3>
            <AddAuctionDialog onAdd={(item) => run(addAuctionFn({ data: item }))} lang={lang} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {d.auctions.map((v) => (
              <div key={v.auction.id} className="space-y-2">
                <AuctionCard v={v} />
                <div className="flex items-center justify-between">
                  {!readOnly && v.remaining > 0 && <ContributionForm auctionId={v.auction.id} remaining={v.remaining} />}
                  <Button variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10 ml-auto" onClick={() => void run(deleteAuctionFn({ data: { id: v.auction.id } }))}>
                    {lang === "te" ? "వేలం తొలగించండి" : "Delete Auction"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <form className="max-w-lg space-y-3" onSubmit={(e) => { e.preventDefault(); void run(announceFn({ data: ann })).then(() => setAnn({ titleEn: "", titleTe: "", body: "" })); }}>
          <p className="text-sm text-muted-foreground">
            {lang === "te" ? `యాప్‌లో నోటిఫికేషన్లు మాత్రమే. పంపినవి: ${d.sentNotifications}` : `In-app notifications only. Sent so far: ${d.sentNotifications}`}
          </p>
          <Input required placeholder={lang === "te" ? "శీర్షిక (ఆంగ్లంలో)" : "Title"} value={ann.titleEn} onChange={(e) => setAnn({ ...ann, titleEn: e.target.value })} />
          <Input placeholder={lang === "te" ? "శీర్షిక (తెలుగులో)" : "Title (Telugu)"} value={ann.titleTe} onChange={(e) => setAnn({ ...ann, titleTe: e.target.value })} />
          <Input placeholder={lang === "te" ? "సందేశం" : "Message"} value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} />
          <Button type="submit">{lang === "te" ? "ప్రకటన పంపండి" : "Send announcement"}</Button>
        </form>
      )}

      {tab === "auditLog" && (
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {a.audit.map((l) => (
            <li key={l.id} className="p-3">
              <b>{l.action}</b> {l.entity} · {l.actor} · {formatDate(l.at)}
              {l.reason && <span className="text-muted-foreground"> — {l.reason}</span>}
            </li>
          ))}
        </ul>
      )}

      {tab === "reports" && (
        <div className="flex flex-wrap gap-3">
          {(["donations", "expenses", "auctions"] as const).map((k) => (
            <Button
              key={k}
              variant="outline"
              onClick={async () => {
                try {
                  const r = await exportReportFn({ data: { kind: k } });
                  const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv" }));
                  const el = document.createElement("a");
                  el.href = url;
                  el.download = r.filename;
                  el.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  err(e);
                }
              }}
            >
              {lang === "te" ? `${t(k)} CSV డౌన్‌లోడ్ చేయండి` : `Download ${t(k)} CSV`}
            </Button>
          ))}
        </div>
      )}

      {del && <DeleteRecordDialog {...del} onClose={() => setDel(null)} />}
    </div>
  );
}
