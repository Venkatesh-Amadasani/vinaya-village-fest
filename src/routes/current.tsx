import { createFileRoute, redirect } from "@tanstack/react-router";
// Permanent QR target: always resolves to the active festival.
export const Route = createFileRoute("/current")({ beforeLoad: () => { throw redirect({ to: "/" }); } });
