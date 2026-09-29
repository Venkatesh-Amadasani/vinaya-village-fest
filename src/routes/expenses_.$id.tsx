import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { expenseQ } from "@/lib/queries";
import { pick, useI18n } from "@/lib/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { DetailShell, Facts, History } from "@/components/app/Detail";
import { ExpenseForm } from "@/components/app/Forms";
import { ErrorState, PageSkeleton } from "@/components/app/bits";

export const Route = createFileRoute("/expenses_/$id")({
  head: () => ({ meta: [{ title: "Expense details — Vinayaka Chavithi" }, { name: "description", content: "Details of a festival expense." }, { property: "og:title", content: "Expense details" }, { property: "og:description", content: "Openly recorded festival expense." }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(expenseQ(params.id)).then(() => undefined),
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(expenseQ(id));
  const e = data.expense;
  const rows: [string, ReactNode][] = [
    [t("amount"), <span className="tabular text-lg font-bold">{formatINR(e.amount)}</span>],
    [t("date"), formatDate(e.date)],
    [t("category"), data.category ? pick(lang, data.category.nameEn, data.category.nameTe) : "—"],
    [t("festival"), String(data.festival.year)],
  ];
  if (e.paidTo) rows.push([t("paidTo"), e.paidTo]);
  if (e.scope === "YOUTH") rows.push([t("youth"), t("youth")]);
  return (
    <DetailShell back="/expenses" title={e.description} action={data.canEdit ? <ExpenseForm canYouth={data.canSeeYouth} categories={data.categories} edit={e} /> : null}>
      <Facts rows={rows} />
      <History rows={data.history} />
    </DetailShell>
  );
}
