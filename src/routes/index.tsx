import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { overviewQ, donationsQ, auctionsQ, galleryQ, festivalsQ, expensesQ } from "@/lib/queries";
import { FestivalHome } from "@/components/app/FestivalHome";
import { ErrorState, PageSkeleton } from "@/components/app/bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vinayaka Chavithi 2026 — Village Festival & Accounts" },
      { name: "description", content: "Our village Vinayaka Chavithi festival: open donations, expenses, auction results, highlights and memories in English and Telugu." },
      { property: "og:title", content: "Vinayaka Chavithi 2026 — Village Festival & Accounts" },
      { property: "og:description", content: "Every rupee accounted. Donations, expenses, auctions and gallery for our village festival." },
    ],
  }),
  loader: async ({ context: { queryClient: qc } }) => {
    await Promise.all([
      qc.ensureQueryData(overviewQ()), qc.ensureQueryData(donationsQ({})), qc.ensureQueryData(expensesQ({})),
      qc.ensureQueryData(auctionsQ()), qc.ensureQueryData(galleryQ()), qc.ensureQueryData(festivalsQ()),
    ]);
  },
  pendingComponent: PageSkeleton,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  notFoundComponent: () => <Link to="/">Home</Link>,
  component: () => {
    const { data } = useSuspenseQuery(overviewQ());
    return <FestivalHome year={undefined} overview={data} />;
  },
});
