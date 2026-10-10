"use client";

import { useRouter } from "next/navigation";
import { NewEventForm } from "@/components/new-modal";

export default function TambahModal() {
  const router = useRouter();
  const close = () => router.back();
  return (
    <div
      className="x-modal-back"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="x-modal" role="dialog" aria-modal="true" aria-label="Tambah event">
        <div className="x-modal-head">
          <h2 className="x-h" style={{ flex: 1 }}>Tambah Event</h2>
          <button type="button" className="x-modal-x" aria-label="Tutup" onClick={close}>
            ✕
          </button>
        </div>
        <NewEventForm prefill={{}} onSaved={close} />
      </div>
    </div>
  );
}
