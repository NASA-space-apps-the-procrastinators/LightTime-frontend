import { Suspense } from "react";
import { AstronautDetail } from "@/components/base-station/astronaut-detail";
import { NotFoundMessage } from "@/components/shared/not-found-message";
import { CREW, getCrew } from "@/lib/crew";

export function generateStaticParams() {
  return CREW.map((c) => ({ id: c.id }));
}

export default async function CrewPage({
  params,
}: PageProps<"/base-station/crew/[id]">) {
  const { id } = await params;
  if (!getCrew(id)) return <NotFoundMessage title="Crewmember not found" />;
  return (
    // The selected region lives in ?region=, which is only known in the browser.
    <Suspense fallback={null}>
      <AstronautDetail crewId={id} />
    </Suspense>
  );
}
