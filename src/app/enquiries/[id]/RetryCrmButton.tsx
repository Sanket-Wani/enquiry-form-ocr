"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function RetryCrmButton({ enquiryId }: { enquiryId: string }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/enquiries/${enquiryId}/crm-retry`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Retry failed: ${err.details || err.error}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(`Error during CRM retry: ${err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRetry}
      disabled={retrying}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 rounded text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition"
      title="Retry synchronization to CRM"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
      <span>{retrying ? "Retrying CRM..." : "Retry CRM Sync"}</span>
    </button>
  );
}
