import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { expensesQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { ExpenseList } from "@/components/app/Finance";
import { FilterBar, Pager, SectionHeader, PageSkeleton } from "@/components/app/bits";
import { formatINR } from "@/lib/format";
import { ExpenseForm } from "@/components/app/Forms";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Vinayaka Chavithi 2026" }, { name: "description", content: "Where every festival rupee was spent." }, { property: "og:title", content: "Festival Expenses" }, { property: "og:description", content: "Open list of festival expenses by category." }] }),
  component: Page,
});
function Page() {
  const { t } = useI18n();
  const [q, setQ] = useState(""); const [scope, setScope] = useState<"ALL" | "GENERAL" | "YOUTH">("ALL"); const [page, setPage] = useState(1);
  const { data } = useQuery({ ...expensesQ({ q, scope, page }), placeholderData: keepPreviousData });
  if (!data) return <PageSkeleton />;
  return (<div>
    <SectionHeader title={t("expenses")} sub={`${t("total")}: ${formatINR(data.sum)}`} action={data.canAdd ? <ExpenseForm canYouth={data.canSeeYouth} categories={data.categories} /> : null} />
    <FilterBar q={q} onQ={(v) => { setQ(v); setPage(1); }} scope={scope} onScope={setScope} showYouth={data.canSeeYouth} />
    <ExpenseList rows={data.rows} categories={data.categories} />
    <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
  </div>);
}
