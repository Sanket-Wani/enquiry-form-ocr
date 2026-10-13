import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import DocumentViewer from "@/components/document-viewer/DocumentViewer";
import {
  ChevronLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  Building,
  User,
  Clock,
  ShieldCheck,
  Edit,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import RetryCrmButton from "./RetryCrmButton";


interface Props {
  params: Promise<{ id: string }>;
}

export default async function EnquiryDetailPage({ params }: Props) {
  const { id } = await params;

  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      syncLogs: {
        orderBy: { attemptedAt: "desc" },
      },
    },
  });

  if (!enquiry) {
    notFound();
  }

  let confidenceScores: Record<string, number> = {};
  let rawExtractionObj: any = null;

  try {
    if (enquiry.confidenceScores) {
      confidenceScores = JSON.parse(enquiry.confidenceScores);
    }
    if (enquiry.rawExtraction) {
      rawExtractionObj = JSON.parse(enquiry.rawExtraction);
    }
  } catch (e) {
    console.warn("Failed to parse JSON for enquiry", id, e);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 transition flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <Link href="/enquiries" className="hover:text-neutral-900 transition">
            Enquiries
          </Link>
          <span>/</span>
          <span className="font-mono text-neutral-900 font-medium">{enquiry.leadId || enquiry.id.slice(0, 8)}</span>
        </div>

        <div className="flex items-center gap-2">
          {enquiry.crmSyncStatus === "FAILED" && (
            <RetryCrmButton enquiryId={enquiry.id} />
          )}

          <Link
            href={`/enquiries/${enquiry.id}/review`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 transition shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Open in Review Workspace</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Details + Document */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Comprehensive Field Audit & Comparison */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Summary Card */}
          <div className="p-4 bg-white border border-neutral-200 rounded-md">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  {enquiry.customerName || "Enquiry (Unreviewed)"}
                </h2>
                <div className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                  <span>Lead ID: <strong className="text-neutral-800 font-mono">{enquiry.leadId || "Not assigned"}</strong></span>
                  <span>&bull;</span>
                  <span>Created: {new Date(enquiry.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    enquiry.status === "CONFIRMED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {enquiry.status.replace("_", " ")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    enquiry.crmSyncStatus === "SYNCED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : enquiry.crmSyncStatus === "FAILED"
                      ? "bg-red-50 text-red-800 border-red-200"
                      : "bg-neutral-100 text-neutral-600 border-neutral-200"
                  }`}
                >
                  CRM: {enquiry.crmSyncStatus}
                </span>
              </div>
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Contact Phone:</span>
                <span className="font-mono font-medium text-neutral-900">{enquiry.contactNumber || "—"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Email Address:</span>
                <span className="text-neutral-900">{enquiry.emailId || "—"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Occupation:</span>
                <span className="text-neutral-900">{enquiry.occupation || "—"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Company:</span>
                <span className="text-neutral-900">{enquiry.companyName || "—"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Lead Source:</span>
                <span className="text-neutral-900">{enquiry.leadSource || "—"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Booking Timeline:</span>
                <span className="text-neutral-900">{enquiry.bookingTimeline || "—"}</span>
              </div>
            </div>
          </div>

          {/* Form Fields Detail Table */}
          <div className="border border-neutral-200 rounded-md bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Verified Form Fields (20 Fields)
              </span>
              <span className="text-[11px] text-neutral-500">
                System of Record: Application DB
              </span>
            </div>

            <table className="w-full text-left text-xs divide-y divide-neutral-100">
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600 w-1/3">1. Enquiry Date</td>
                  <td className="py-2 px-4 text-neutral-900">{enquiry.enquiryDate || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">2. Customer Name</td>
                  <td className="py-2 px-4 font-semibold text-neutral-900">{enquiry.customerName || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">3. Contact Number</td>
                  <td className="py-2 px-4 font-mono font-medium text-neutral-900">{enquiry.contactNumber || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">4. Email ID</td>
                  <td className="py-2 px-4 text-neutral-900">{enquiry.emailId || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">5. Occupation</td>
                  <td className="py-2 px-4 text-neutral-900">
                    {enquiry.occupation} {enquiry.occupationOther && `(${enquiry.occupationOther})`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">6. Company Name</td>
                  <td className="py-2 px-4 text-neutral-900">{enquiry.companyName || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">7. Designation</td>
                  <td className="py-2 px-4 text-neutral-900">{enquiry.designation || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">8. Address</td>
                  <td className="py-2 px-4 text-neutral-900 whitespace-pre-wrap">{enquiry.address || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">9. Lead Source</td>
                  <td className="py-2 px-4 text-neutral-900">
                    {enquiry.leadSource} {enquiry.leadSourceOther && `(${enquiry.leadSourceOther})`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">10. Booking Timeline</td>
                  <td className="py-2 px-4 text-neutral-900">{enquiry.bookingTimeline || "—"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">11. Bank Finance Assistance</td>
                  <td className="py-2 px-4 text-neutral-900">{enquiry.requiresBankFinance || "Unknown"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-neutral-600">12. Client Signature</td>
                  <td className="py-2 px-4 text-neutral-900">
                    {enquiry.hasClientSignature ? (
                      <span className="text-emerald-700 font-medium">Verified Signature on paper</span>
                    ) : (
                      <span className="text-neutral-400">Blank / No signature mark</span>
                    )}
                  </td>
                </tr>
                <tr className="bg-neutral-50/50">
                  <td className="py-2 px-4 font-medium text-neutral-500">13. Office Date</td>
                  <td className="py-2 px-4 text-neutral-800">{enquiry.officeDate || "—"}</td>
                </tr>
                <tr className="bg-neutral-50/50">
                  <td className="py-2 px-4 font-medium text-neutral-500">14. Office Time</td>
                  <td className="py-2 px-4 text-neutral-800">{enquiry.officeTime || "—"}</td>
                </tr>
                <tr className="bg-neutral-50/50">
                  <td className="py-2 px-4 font-medium text-neutral-500">15. Allocated To</td>
                  <td className="py-2 px-4 text-neutral-800">{enquiry.allocatedTo || "—"}</td>
                </tr>
                <tr className="bg-neutral-50/50">
                  <td className="py-2 px-4 font-medium text-neutral-500">16. Attended By</td>
                  <td className="py-2 px-4 text-neutral-800">{enquiry.attendedBy || "—"}</td>
                </tr>
                <tr className="bg-neutral-50/50">
                  <td className="py-2 px-4 font-medium text-neutral-500">17. Office Remarks</td>
                  <td className="py-2 px-4 text-neutral-800 whitespace-pre-wrap">{enquiry.officeRemarks || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CRM Synchronization Audit Log */}
          <div className="border border-neutral-200 rounded-md bg-white p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-neutral-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  CRM Synchronization History & Outbox Log
                </h3>
              </div>
              {enquiry.crmRecordId && (
                <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  CRM ID: {enquiry.crmRecordId}
                </span>
              )}
            </div>

            {enquiry.syncLogs.length === 0 ? (
              <div className="text-xs text-neutral-400 py-3 text-center italic">
                No CRM sync attempts logged yet. Form will sync upon explicit confirmation.
              </div>
            ) : (
              <div className="space-y-2">
                {enquiry.syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 border border-neutral-200 rounded bg-neutral-50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="text-neutral-500 font-mono text-[11px]">
                          Attempt #{log.attemptNumber}
                        </span>
                      </div>
                      <span className="text-neutral-400 text-[11px]">
                        {new Date(log.attemptedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="font-mono text-[10px] text-neutral-400 truncate">
                      Idempotency Key: {log.idempotencyKey}
                    </div>

                    {log.errorMessage && (
                      <div className="text-red-700 font-medium text-[11px] bg-red-50 p-1.5 rounded border border-red-200">
                        Error: {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Original Document Viewer */}
        <div className="lg:col-span-5 sticky top-20">
          <DocumentViewer
            documentUrl={`/api/documents/${enquiry.id}`}
            documentName={enquiry.originalDocumentName}
            mimeType={enquiry.originalDocumentMime}
            className="h-[calc(100vh-6rem)]"
          />
        </div>
      </div>
    </div>
  );
}
