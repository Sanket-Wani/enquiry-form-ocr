import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DocumentViewer from "@/components/document-viewer/DocumentViewer";
import ReviewForm from "@/components/review/ReviewForm";
import Link from "next/link";
import { ChevronLeft, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import ClientReviewLayout from "./ClientReviewLayout";


interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;

  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
  });

  if (!enquiry) {
    notFound();
  }

  let confidenceScores: Record<string, number> = {};
  if (enquiry.confidenceScores) {
    try {
      confidenceScores = JSON.parse(enquiry.confidenceScores);
    } catch {
      confidenceScores = {};
    }
  }

  const isMockMode =
    !process.env.SARVAM_API_KEY ||
    process.env.SARVAM_API_KEY === "your_sarvam_api_subscription_key_here" ||
    (enquiry.sarvamJobId && enquiry.sarvamJobId.startsWith("fixture_job_"));

  return (
    <div className="space-y-4">
      {/* Back & Breadcrumb Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-neutral-900 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <Link href="/enquiries" className="hover:text-neutral-900 transition">
            Enquiries
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium font-mono text-[11px]">
            {enquiry.id.slice(0, 8)}... (Review & Verification)
          </span>
        </div>

        <div className="text-xs text-neutral-500 flex items-center gap-2">
          <span>Document:</span>
          <span className="font-medium text-neutral-800">{enquiry.originalDocumentName}</span>
        </div>
      </div>

      {/* Responsive Client Review Layout */}
      <ClientReviewLayout
        enquiry={enquiry}
        confidenceScores={confidenceScores}
        isMockMode={Boolean(isMockMode)}
        documentUrl={`/api/documents/${enquiry.id}`}
        documentName={enquiry.originalDocumentName}
        mimeType={enquiry.originalDocumentMime}
      />
    </div>
  );
}
