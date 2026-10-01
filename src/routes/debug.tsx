import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { debugSessionFn } from "@/lib/api.functions";

export const Route = createFileRoute("/debug")({
  component: DebugPage,
});

function DebugPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["debug-session"],
    queryFn: () => debugSessionFn(),
  });

  return (
    <div style={{ padding: 20, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>Session Debug</h1>
      <p>Cookie in browser: {typeof document !== "undefined" ? document.cookie : "N/A"}</p>
      <hr />
      {isLoading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {String(error)}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
