import { AlertDetail } from "@/components/base-station/alert-detail";

export function generateStaticParams() {
  return [{ id: "A1" }];
}

export default async function AlertPage({
  params,
}: PageProps<"/base-station/alerts/[id]">) {
  const { id } = await params;
  // Alerts live in the browser's mission state, so the lookup happens client-side.
  return <AlertDetail alertId={id} />;
}
