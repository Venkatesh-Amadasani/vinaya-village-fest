import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addContributionFn, addDonationFn, addExpenseFn, softDeleteFn, updateDonationFn, updateExpenseFn } from "@/lib/api.functions";
import { validateDonationSplit, round2 } from "@/domain/rules";
import type { Donation, DonationScope, Expense, ExpenseCategory, PaymentMethod } from "@/domain/types";
import { formatINR, METHOD_LABEL } from "@/lib/format";
import { pick, useI18n } from "@/lib/i18n";

const METHODS = Object.keys(METHOD_LABEL) as PaymentMethod[];
const today = () => new Date().toISOString().slice(0, 10);
const selectCls = "h-11 w-full rounded-md border bg-background px-3 text-base";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
const msg = (e: unknown) => (e instanceof Error ? e.message : "Failed");

function FormDialog({ trigger, title, open, setOpen, children, outline }: { trigger: string; title: string; open: boolean; setOpen: (o: boolean) => void; children: ReactNode; outline?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={outline ? "outline" : "default"}>{trigger}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Demo mode — saved in memory only until the app restarts.</DialogDescription></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function DonationForm({ canYouth, edit }: { canYouth: boolean; edit?: Donation }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [f, setF] = useState(edit
    ? { donorName: edit.donorName, village: edit.village ?? "", scope: edit.scope, total: String(edit.totalAmount), general: String(edit.generalAmount), youth: String(edit.youthAmount), method: edit.method, date: edit.date.slice(0, 10) }
    : { donorName: "", village: "", scope: "GENERAL" as DonationScope, total: "", general: "", youth: "", method: "CASH" as PaymentMethod, date: today() });
  const total = Number(f.total) || 0;
  const generalAmount = f.scope === "GENERAL" ? total : f.scope === "YOUTH" ? 0 : Number(f.general) || 0;
  const youthAmount = f.scope === "YOUTH" ? total : f.scope === "GENERAL" ? 0 : Number(f.youth) || 0;
  const splitError = total > 0 ? validateDonationSplit({ scope: f.scope, totalAmount: total, generalAmount, youthAmount }) : null;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (splitError || !f.donorName.trim()) return;
    setBusy(true);
    try {
      const payload = { donorName: f.donorName, village: f.village.trim() || null, scope: f.scope, totalAmount: total, generalAmount, youthAmount, method: f.method, date: f.date };
      if (edit) await updateDonationFn({ data: { ...payload, id: edit.id, reason } });
      else await addDonationFn({ data: payload });
      toast.success(edit ? "Donation updated" : "Donation recorded");
      setOpen(false); await refresh();
    } catch (err) { toast.error(msg(err)); } finally { setBusy(false); }
  }
  return (
    <FormDialog trigger={edit ? t("edit") : t("addDonation")} title={edit ? t("edit") : t("addDonation")} open={open} setOpen={setOpen} outline={!!edit}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("donor")}><Input required maxLength={120} value={f.donorName} onChange={(e) => setF({ ...f, donorName: e.target.value })} /></Field>
        <Field label={t("village")}><Input maxLength={80} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })} /></Field>
        {canYouth && (
          <Field label={t("split")}>
            <select className={selectCls} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as DonationScope })}>
              <option value="GENERAL">{t("general")}</option><option value="YOUTH">{t("youth")}</option><option value="BOTH">{t("both")}</option>
            </select>
          </Field>
        )}
        <Field label={`${t("total")} (₹)`}><Input required type="number" inputMode="decimal" min={1} value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></Field>
        {f.scope === "BOTH" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("general")} (₹)`}><Input type="number" min={0} value={f.general} onChange={(e) => setF({ ...f, general: e.target.value, youth: total ? String(round2(total - (Number(e.target.value) || 0))) : f.youth })} /></Field>
            <Field label={`${t("youth")} (₹)`}><Input type="number" min={0} value={f.youth} onChange={(e) => setF({ ...f, youth: e.target.value })} /></Field>
          </div>
        )}
        {splitError && <p role="alert" className="text-sm text-destructive">{splitError}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("method")}><select className={selectCls} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })}>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></Field>
          <Field label={t("date")}><Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        {edit && <Field label="Reason for change (required)"><Input required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
        <Button type="submit" className="h-11 w-full" disabled={busy || !!splitError}>{t("save")} {total > 0 && `· ${formatINR(total)}`}</Button>
      </form>
    </FormDialog>
  );
}

export function ExpenseForm({ canYouth, categories, edit }: { canYouth: boolean; categories: ExpenseCategory[]; edit?: Expense }) {
  const { t, lang } = useI18n();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [f, setF] = useState(edit
    ? { scope: edit.scope, categoryId: edit.categoryId, description: edit.description, amount: String(edit.amount), paidTo: edit.paidTo ?? "", date: edit.date.slice(0, 10) }
    : { scope: "GENERAL" as "GENERAL" | "YOUTH", categoryId: categories[0]?.id ?? "", description: "", amount: "", paidTo: "", date: today() });
  const cats = categories.filter((c) => c.scope === "ANY" || c.scope === f.scope);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { scope: f.scope, categoryId: f.categoryId, description: f.description, amount: Number(f.amount), paidTo: f.paidTo.trim() || null, date: f.date };
      if (edit) await updateExpenseFn({ data: { ...payload, id: edit.id, reason } });
      else await addExpenseFn({ data: payload });
      toast.success(edit ? "Expense updated" : "Expense recorded"); setOpen(false); await refresh();
    } catch (err) { toast.error(msg(err)); } finally { setBusy(false); }
  }
  return (
    <FormDialog trigger={edit ? t("edit") : t("addExpense")} title={edit ? t("edit") : t("addExpense")} open={open} setOpen={setOpen} outline={!!edit}>
      <form onSubmit={submit} className="space-y-4">
        {canYouth && <Field label={t("split")}><select className={selectCls} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as "GENERAL" | "YOUTH" })}><option value="GENERAL">{t("general")}</option><option value="YOUTH">{t("youth")}</option></select></Field>}
        <Field label={t("category")}><select className={selectCls} value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{pick(lang, c.nameEn, c.nameTe)}</option>)}</select></Field>
        <Field label={t("description")}><Input required maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t("amount")} (₹)`}><Input required type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label={t("date")}><Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label={t("paidTo")}><Input maxLength={120} value={f.paidTo} onChange={(e) => setF({ ...f, paidTo: e.target.value })} /></Field>
        {edit && <Field label="Reason for change (required)"><Input required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
        <Button type="submit" className="h-11 w-full" disabled={busy}>{t("save")}</Button>
      </form>
    </FormDialog>
  );
}

export function ContributionForm({ auctionId, remaining }: { auctionId: string; remaining: number }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [method, setMethod] = useState<PaymentMethod>("CASH");
  const amt = Number(amount) || 0;
  const err = amt > remaining ? "Contribution exceeds remaining amount" : null;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (err) return;
    setBusy(true);
    try {
      await addContributionFn({ data: { auctionId, contributorName: name, amount: amt, method } });
      toast.success("Payment recorded"); setOpen(false); setName(""); setAmount(""); await refresh();
    } catch (e2) { toast.error(msg(e2)); } finally { setBusy(false); }
  }
  return (
    <FormDialog trigger={t("addContribution")} title={t("addContribution")} open={open} setOpen={setOpen}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm">{t("remaining")}: <b className="tabular">{formatINR(remaining)}</b></p>
        <Field label="Contributor"><Input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={`${t("amount")} (₹)`}><Input required type="number" min={1} max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label={t("method")}><select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></Field>
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy || !!err}>{t("save")}</Button>
      </form>
    </FormDialog>
  );
}

export function DeleteRecordDialog({ entity, id, label, onClose }: { entity: "donation" | "expense"; id: string; label: string; onClose: () => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await softDeleteFn({ data: { entity, id, reason } }); toast.success("Removed (kept in audit log)"); onClose(); await refresh(); }
    catch (err) { toast.error(msg(err)); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("delete")}: {label}</DialogTitle><DialogDescription>Records are never erased — they are hidden and the reason is kept in the audit log.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("reason")}><Input required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <Button type="submit" variant="destructive" className="h-11 w-full" disabled={busy || reason.trim().length < 3}>{t("delete")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
