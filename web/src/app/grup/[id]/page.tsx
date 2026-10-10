import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import GrupDetailClient from "./detail";
import { LoadingSkeleton } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default function GrupDetailPage({ params }: PageProps<"/grup/[id]">) {
  return (
    <Suspense fallback={<div className="r-screen"><LoadingSkeleton /></div>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("id,name,color").eq("id", id).maybeSingle();
  if (!data) {
    return (
      <div className="r-mobile">
        <div className="r-screen">
          <p className="x-sub">
            <Link href="/grup">‹ Kembali ke Grup</Link>
          </p>
          <div className="x-empty" role="status" style={{ marginTop: 16 }}>
            Grup tidak ditemukan di Supabase.
          </div>
        </div>
      </div>
    );
  }
  const g = data as { id: string; name: string; color: string };
  const short = g.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return <GrupDetailClient group={{ id: g.id, name: g.name, short, members: 0, myRole: "viewer", color: g.color }} />;
}
