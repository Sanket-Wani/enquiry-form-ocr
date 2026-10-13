"use client";

import { useState } from "react";
import DocumentViewer from "@/components/document-viewer/DocumentViewer";
import ReviewForm from "@/components/review/ReviewForm";
import { FileText, Edit3, Columns } from "lucide-react";

interface ClientReviewLayoutProps {
  enquiry: any;
  confidenceScores: Record<string, number>;
  isMockMode: boolean;
  documentUrl: string;
  documentName: string;
  mimeType: string;
}

export default function ClientReviewLayout({
  enquiry,
  confidenceScores,
  isMockMode,
  documentUrl,
  documentName,
  mimeType,
}: ClientReviewLayoutProps) {
  // Mobile/Tablet view tab state: 'document' | 'form' | 'split'
  const [mobileTab, setMobileTab] = useState<"document" | "form" | "split">("form");

  return (
    <div className="space-y-3">
      {/* Mobile/Tablet Segmented Switcher (Visible on < lg screens) */}
      <div className="lg:hidden flex items-center justify-center p-1 bg-neutral-100 rounded-md border border-neutral-200">
        <button
          type="button"
          onClick={() => setMobileTab("document")}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition flex items-center justify-center gap-1.5 ${
            mobileTab === "document"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Original Document</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("form")}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition flex items-center justify-center gap-1.5 ${
            mobileTab === "form"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Digital Form (20 Fields)</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("split")}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition flex items-center justify-center gap-1.5 ${
            mobileTab === "split"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Stacked View</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full">
        {/* Desktop View: Side-by-side 2-column grid */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Original Document Viewer (Sticky) */}
          <div className="lg:col-span-5 sticky top-20 max-h-[calc(100vh-6rem)]">
            <DocumentViewer
              documentUrl={documentUrl}
              documentName={documentName}
              mimeType={mimeType}
              className="h-[calc(100vh-6.5rem)]"
            />
          </div>

          {/* Right Column: Editable Digital Review Form */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-md p-5 shadow-sm">
            <ReviewForm
              enquiry={enquiry}
              confidenceScores={confidenceScores}
              isMockMode={isMockMode}
            />
          </div>
        </div>

        {/* Mobile / Tablet View: Displayed according to selected tab */}
        <div className="lg:hidden space-y-4">
          {mobileTab === "document" && (
            <div className="h-[75vh]">
              <DocumentViewer
                documentUrl={documentUrl}
                documentName={documentName}
                mimeType={mimeType}
                className="h-full"
              />
            </div>
          )}

          {mobileTab === "form" && (
            <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm">
              <ReviewForm
                enquiry={enquiry}
                confidenceScores={confidenceScores}
                isMockMode={isMockMode}
              />
            </div>
          )}

          {mobileTab === "split" && (
            <div className="space-y-4">
              <div className="h-[50vh]">
                <DocumentViewer
                  documentUrl={documentUrl}
                  documentName={documentName}
                  mimeType={mimeType}
                  className="h-full"
                />
              </div>
              <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm">
                <ReviewForm
                  enquiry={enquiry}
                  confidenceScores={confidenceScores}
                  isMockMode={isMockMode}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
