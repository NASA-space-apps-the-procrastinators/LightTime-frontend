import { CheckinFlow } from "@/components/base-station/checkin-flow";
import { NotFoundMessage } from "@/components/shared/not-found-message";
import { CREW, getCrew } from "@/lib/crew";

export function generateStaticParams() {
  return CREW.map((c) => ({ id: c.id }));
}

export default async function CheckinPage({
  params,
}: PageProps<"/base-station/crew/[id]/check-in">) {
  const { id } = await params;
  if (!getCrew(id)) return <NotFoundMessage title="Crewmember not found" />;
  return <CheckinFlow crewId={id} />;
}
