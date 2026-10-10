import { Suspense } from "react";
import { connection } from "next/server";
import EventDetail from "./detail";
import { LoadingSkeleton } from "@/components/ui";

export default function EventPage({ params }: PageProps<"/event/[id]">) {
  return (
    <Suspense fallback={<div className="r-screen"><LoadingSkeleton /></div>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  return <EventDetail id={id} />;
}
