"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSkeleton } from "@/components/ui";
import { DesktopShell, MobileShell } from "@/components/shell";
import { NewEventForm } from "@/components/new-modal";

function TambahForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefill = { groupId: params.get("grup") };
  const form = (
    <>
      <h2 className="x-h">Tambah Event</h2>
      <p className="x-sub">Simpan langsung atau ajukan ke admin grup.</p>
      <div style={{ marginTop: 12 }}>
        <NewEventForm prefill={prefill} onSaved={() => router.push("/kalender")} />
      </div>
    </>
  );
  return (
    <>
      <MobileShell>
        <div className="r-screen">{form}</div>
      </MobileShell>
      <DesktopShell>
        <div className="r-dcenter">{form}</div>
      </DesktopShell>
    </>
  );
}

export default function TambahPage() {
  return (
    <Suspense fallback={<div className="r-screen"><LoadingSkeleton /></div>}>
      <TambahForm />
    </Suspense>
  );
}
