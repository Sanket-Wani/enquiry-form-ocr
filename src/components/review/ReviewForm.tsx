"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Clock,
  Compass,
  FileCheck,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import {
  applyAutoCorrectionRules,
  cleanEmail,
  cleanContactNumber,
  cleanCustomerName,
  cleanDate,
  cleanTime,
  cleanAddress,
  FieldCorrection,
} from "@/services/autoCorrection";

interface ReviewFormProps {
  enquiry: any;
  confidenceScores?: Record<string, number>;
  isMockMode?: boolean;
}

export default function ReviewForm({
  enquiry: initialEnquiry,
  confidenceScores = {},
  isMockMode = false,
}: ReviewFormProps) {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    enquiryDate: initialEnquiry.enquiryDate || "",
    leadId: initialEnquiry.leadId || "",
    customerName: initialEnquiry.customerName || "",
    contactNumber: initialEnquiry.contactNumber || "",
    emailId: initialEnquiry.emailId || "",
    occupation: initialEnquiry.occupation || "",
    occupationOther: initialEnquiry.occupationOther || "",
    companyName: initialEnquiry.companyName || "",
    designation: initialEnquiry.designation || "",
    address: initialEnquiry.address || "",
    leadSource: initialEnquiry.leadSource || "",
    leadSourceOther: initialEnquiry.leadSourceOther || "",
    bookingTimeline: initialEnquiry.bookingTimeline || "",
    requiresBankFinance: initialEnquiry.requiresBankFinance || "Unknown",
    hasClientSignature: Boolean(initialEnquiry.hasClientSignature),
    signatureReference: initialEnquiry.signatureReference || "",
    officeDate: initialEnquiry.officeDate || "",
    officeTime: initialEnquiry.officeTime || "",
    allocatedTo: initialEnquiry.allocatedTo || "",
    attendedBy: initialEnquiry.attendedBy || "",
    officeRemarks: initialEnquiry.officeRemarks || "",
    reviewedBy: initialEnquiry.reviewedBy || "Office Staff",
  });

  const [currentStatus, setCurrentStatus] = useState<string>(initialEnquiry.status || "DRAFT");
  const [crmStatus, setCrmStatus] = useState<string>(initialEnquiry.crmSyncStatus || "NOT_SYNCED");
  const [crmRecordId, setCrmRecordId] = useState<string | null>(initialEnquiry.crmRecordId || null);

  // UI state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);

  // Auto-Correction State
  const [appliedCorrections, setAppliedCorrections] = useState<FieldCorrection[]>([]);
  const [showCorrectionsDetails, setShowCorrectionsDetails] = useState(false);
  const [fieldHints, setFieldHints] = useState<Record<string, string>>({});

  // Detect auto-corrections from initial raw extraction
  useEffect(() => {
    try {
      if (initialEnquiry.rawExtraction) {
        const rawJson = JSON.parse(initialEnquiry.rawExtraction);
        const r = rawJson.result || {};
        const rawValues = {
          enquiryDate: r.enquiry_date || "",
          leadId: r.lead_id || "",
          customerName: r.customer_name || "",
          contactNumber: r.contact_number || "",
          emailId: r.email_id || "",
          occupation: r.occupation || "",
          occupationOther: r.occupation_other || "",
          companyName: r.company_name || "",
          designation: r.designation || "",
          address: r.address || "",
          leadSource: r.lead_source || "",
          leadSourceOther: r.lead_source_other || "",
          bookingTimeline: r.booking_timeline || "",
          requiresBankFinance: r.requires_bank_finance || "Unknown",
          hasClientSignature: Boolean(r.has_client_signature),
          signatureReference: r.signature_reference || "",
          officeDate: r.office_date || "",
          officeTime: r.office_time || "",
          allocatedTo: r.allocated_to || "",
          attendedBy: r.attended_by || "",
          officeRemarks: r.office_remarks || "",
        };
        const detected = applyAutoCorrectionRules(rawValues);
        if (detected.corrections.length > 0) {
          setAppliedCorrections(detected.corrections);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [initialEnquiry.rawExtraction]);

  // Duplicate warning detection
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.contactNumber && formData.contactNumber.length >= 8) {
        try {
          const res = await fetch(
            `/api/enquiries/${initialEnquiry.id}/duplicates?contactNumber=${encodeURIComponent(
              formData.contactNumber
            )}&leadId=${encodeURIComponent(formData.leadId)}&emailId=${encodeURIComponent(formData.emailId)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.hasDuplicates) {
              setDuplicateMatches(data.duplicates);
            } else {
              setDuplicateMatches([]);
            }
          }
        } catch {
          // Ignore network errors on background duplicate check
        }
      } else {
        setDuplicateMatches([]);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.contactNumber, formData.leadId, formData.emailId, initialEnquiry.id]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // 1. Save Progress as Draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/enquiries/${initialEnquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Failed to save draft.");
      }

      setFeedbackMessage({
        type: "success",
        text: "Draft progress saved locally. This enquiry has not been confirmed or synced to CRM.",
      });
      router.refresh();
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 2. Re-run Extraction
  const handleReExtract = async () => {
    if (!confirm("Re-run Sarvam DocAI extraction? Any unverified fields will be re-analyzed.")) {
      return;
    }

    setIsReExtracting(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/enquiries/${initialEnquiry.id}/extract`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Extraction failed.");
      }

      const data = await res.json();
      setCurrentStatus(data.enquiry.status);
      setFeedbackMessage({
        type: "success",
        text: "Extraction re-run successfully completed. Digital form updated with fresh results.",
      });
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message });
    } finally {
      setIsReExtracting(false);
    }
  };

  // 3. Explicit Employee Confirmation
  const handleConfirmAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
    setFeedbackMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch(`/api/enquiries/${initialEnquiry.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
          throw new Error("Please correct the highlighted validation errors before confirming.");
        }
        throw new Error(data.details || data.error || "Confirmation failed.");
      }

      setCurrentStatus("CONFIRMED");
      setCrmStatus(data.enquiry?.crmSyncStatus || "SYNCED");
      setCrmRecordId(data.enquiry?.crmRecordId || null);

      if (data.crmSyncResult?.success) {
        setFeedbackMessage({
          type: "success",
          text: `Enquiry confirmed and synced to CRM successfully! (CRM Record ID: ${data.crmSyncResult.crmRecordId})`,
        });
      } else {
        setFeedbackMessage({
          type: "info",
          text: `Enquiry confirmed in local database, but CRM synchronization encountered an issue: ${data.crmSyncResult?.error || "CRM unavailable"}. You can retry CRM sync anytime from Records.`,
        });
      }

      router.refresh();
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message });
    } finally {
      setIsConfirming(false);
    }
  };

  // 4. Auto-Clean All Fields using business rules
  const handleAutoCleanAll = () => {
    const result = applyAutoCorrectionRules(formData);
    setFormData((prev) => ({
      ...prev,
      ...result.data,
    }));
    setAppliedCorrections(result.corrections);
    if (result.corrections.length > 0) {
      setFeedbackMessage({
        type: "success",
        text: `⚡ Form rules applied! ${result.corrections.length} field(s) automatically corrected (spaces removed in emails, suffixes standardized, phone numbers formatted, names title-cased).`,
      });
      setShowCorrectionsDetails(true);
    } else {
      setFeedbackMessage({
        type: "info",
        text: "All fields are already fully clean and standardized according to business rules.",
      });
    }
  };

  // Field onBlur Cleaners
  const handleEmailBlur = () => {
    if (!formData.emailId) return;
    const res = cleanEmail(formData.emailId);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, emailId: res.value }));
      setFieldHints((prev) => ({ ...prev, emailId: "Auto-cleaned: spaces removed & suffix standardized" }));
      setTimeout(() => setFieldHints((prev) => { const n = { ...prev }; delete n.emailId; return n; }), 4000);
    }
  };

  const handlePhoneBlur = () => {
    if (!formData.contactNumber) return;
    const res = cleanContactNumber(formData.contactNumber);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, contactNumber: res.value }));
      setFieldHints((prev) => ({ ...prev, contactNumber: "Auto-cleaned: standard 10-digit format" }));
      setTimeout(() => setFieldHints((prev) => { const n = { ...prev }; delete n.contactNumber; return n; }), 4000);
    }
  };

  const handleCustomerNameBlur = () => {
    if (!formData.customerName) return;
    const res = cleanCustomerName(formData.customerName);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, customerName: res.value }));
      setFieldHints((prev) => ({ ...prev, customerName: "Auto-formatted: Title Case" }));
      setTimeout(() => setFieldHints((prev) => { const n = { ...prev }; delete n.customerName; return n; }), 4000);
    }
  };

  const handleDateBlur = (field: "enquiryDate" | "officeDate") => {
    const val = formData[field];
    if (!val) return;
    const res = cleanDate(val);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, [field]: res.value }));
      setFieldHints((prev) => ({ ...prev, [field]: "Auto-formatted: DD/MM/YYYY" }));
      setTimeout(() => setFieldHints((prev) => { const n = { ...prev }; delete n[field]; return n; }), 4000);
    }
  };

  const handleTimeBlur = () => {
    if (!formData.officeTime) return;
    const res = cleanTime(formData.officeTime);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, officeTime: res.value }));
      setFieldHints((prev) => ({ ...prev, officeTime: "Auto-formatted: HH:MM AM/PM" }));
      setTimeout(() => setFieldHints((prev) => { const n = { ...prev }; delete n.officeTime; return n; }), 4000);
    }
  };

  const handleAddressBlur = () => {
    if (!formData.address) return;
    const res = cleanAddress(formData.address);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, address: res.value }));
      setFieldHints((prev) => ({ ...prev, address: "Auto-formatted address" }));
      setTimeout(() => setFieldHints((prev) => { const n = { ...prev }; delete n.address; return n; }), 4000);
    }
  };

  // Helper for rendering Auto-Correction badge
  const renderCorrectionBadge = (fieldName: string) => {
    const correction = appliedCorrections.find((c) => c.field === fieldName);
    const hint = fieldHints[fieldName];

    if (!correction && !hint) return null;

    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
        title={correction ? `Auto-corrected from "${correction.original}": ${correction.reason}` : hint}
      >
        <Sparkles className="w-2.5 h-2.5 text-blue-600" />
        <span>{hint || "Auto-Corrected"}</span>
      </span>
    );
  };

  // Helper for rendering confidence score badge
  const renderConfidenceBadge = (fieldName: string) => {
    const score = confidenceScores[fieldName];
    if (score === undefined || score === null) return null;

    const percent = Math.round(score * 100);
    const isLow = percent < 75;

    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
          isLow
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-emerald-50 text-emerald-800 border-emerald-200"
        }`}
        title={`Sarvam DocAI confidence: ${percent}%. ${isLow ? "Low confidence - please verify." : "High confidence."}`}
      >
        {isLow && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
        {percent}% conf
      </span>
    );
  };

  return (
    <form onSubmit={handleConfirmAndSave} className="flex flex-col h-full bg-white">
      {/* Top Notification / Banner */}
      {isMockMode && (
        <div className="mb-4 p-2.5 bg-neutral-100 border border-neutral-300 rounded text-xs text-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200 text-[11px]">
              Development Fixture Mode
            </span>
            <span>
              Sarvam API Key is not set in <code className="bg-white px-1 py-0.5 rounded border border-neutral-200 text-[11px]">.env</code>. Displaying realistic extraction fixture matching Vishal Chugera Enquiry Form.
            </span>
          </div>
        </div>
      )}

      {/* Duplicate Warning Banner */}
      {duplicateMatches.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold block text-amber-950">
                Duplicate Warning: {duplicateMatches.length} existing record(s) found with matching contact details
              </span>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-800">
                {duplicateMatches.map((m) => (
                  <li key={m.id}>
                    <span className="font-medium">{m.customerName || "Unnamed"}</span> ({m.contactNumber}) &bull; Status: {m.status} &bull; Created: {new Date(m.createdAt).toLocaleDateString()} &mdash; {m.matchReasons.join(", ")}
                  </li>
                ))}
              </ul>
              <span className="text-[11px] text-amber-700 block mt-1">
                Records are never silently merged or overwritten. Please confirm whether this is a returning customer enquiry before proceeding.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status & Action Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Review Status:</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium border ${
              currentStatus === "CONFIRMED"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : currentStatus === "AWAITING_REVIEW"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : currentStatus === "EXTRACTION_FAILED"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-neutral-100 text-neutral-800 border-neutral-200"
            }`}
          >
            {currentStatus.replace("_", " ")}
          </span>

          <span className="text-neutral-300 mx-1">|</span>

          <span className="text-xs font-medium text-neutral-500">CRM Sync:</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium border ${
              crmStatus === "SYNCED"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : crmStatus === "FAILED"
                ? "bg-red-50 text-red-800 border-red-200"
                : crmStatus === "PENDING"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-neutral-100 text-neutral-600 border-neutral-200"
            }`}
          >
            {crmStatus}
          </span>
          {crmRecordId && (
            <span className="text-[11px] font-mono text-neutral-600" title="CRM External ID">
              ({crmRecordId})
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoCleanAll}
            disabled={isConfirming || isSavingDraft || isReExtracting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50 transition shadow-sm"
            title="Auto-clean all fields using common-sense rules: strips spaces from email, standardizes suffix, formats phone digits, and title-cases names"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Auto-Clean All</span>
          </button>

          <button
            type="button"
            onClick={handleReExtract}
            disabled={isReExtracting || isConfirming || isSavingDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 transition"
            title="Retry Sarvam extraction without losing human corrections"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReExtracting ? "animate-spin" : ""}`} />
            <span>Re-extract</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isConfirming || isReExtracting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 transition"
            title="Save draft progress locally without confirming or syncing to CRM"
          >
            <Save className="w-3.5 h-3.5 text-neutral-500" />
            <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            type="submit"
            disabled={isConfirming || isSavingDraft || isReExtracting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 border border-neutral-900 rounded text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isConfirming ? "Confirming & Syncing..." : "Confirm & Save Enquiry"}</span>
          </button>
        </div>
      </div>

      {/* Auto-Form Rules Summary Drawer */}
      {appliedCorrections.length > 0 && (
        <div className="mb-4 bg-blue-50/70 border border-blue-200 rounded-md p-3 text-xs text-blue-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-blue-900">
                Auto-Form Rules Active: {appliedCorrections.length} field(s) automatically standardized
              </span>
              <span className="text-[11px] text-blue-700 hidden sm:inline">
                (spaces removed from emails, @domain suffixes repaired, phone digits cleaned, names formatted)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCorrectionsDetails(!showCorrectionsDetails)}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1 underline underline-offset-2 ml-2"
            >
              <span>{showCorrectionsDetails ? "Hide Details" : "View Corrections"}</span>
              {showCorrectionsDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showCorrectionsDetails && (
            <div className="mt-3 pt-2.5 border-t border-blue-200/80 space-y-1.5">
              <div className="grid grid-cols-12 font-medium text-[11px] text-blue-800 pb-1">
                <span className="col-span-3">Field</span>
                <span className="col-span-4">Raw Transcribed</span>
                <span className="col-span-5">Auto-Cleaned Value</span>
              </div>
              {appliedCorrections.map((corr, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 text-[11px] items-center bg-white/80 p-1.5 rounded border border-blue-100"
                >
                  <span className="col-span-3 font-semibold text-neutral-800">{corr.fieldLabel}</span>
                  <span className="col-span-4 font-mono text-neutral-500 line-through truncate pr-2">
                    {corr.original || "(blank)"}
                  </span>
                  <div className="col-span-5 flex items-center gap-1.5 truncate">
                    <span className="font-mono text-blue-900 font-medium truncate">{corr.corrected}</span>
                    <span className="text-[10px] text-neutral-400 italic truncate">({corr.reason})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`mb-4 p-3 rounded text-xs flex items-center gap-2 border ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : feedbackMessage.type === "error"
              ? "bg-red-50 text-red-900 border-red-200"
              : "bg-blue-50 text-blue-900 border-blue-200"
          }`}
        >
          {feedbackMessage.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
          {feedbackMessage.type === "error" && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          {feedbackMessage.type === "info" && <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />}
          <div className="flex-1">{feedbackMessage.text}</div>
        </div>
      )}

      {/* Form Body - Clean Compact 4 Section Layout */}
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Section 1: Customer & Identification Fields */}
        <div className="border border-neutral-200 rounded-md p-4 bg-white">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100">
            <User className="w-4 h-4 text-neutral-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Customer Identification & Contact Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Enquiry Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">Enquiry Date</label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("enquiryDate")}
                  {renderConfidenceBadge("enquiry_date")}
                </div>
              </div>
              <input
                type="text"
                placeholder="DD/MM/YYYY or YYYY-MM-DD"
                value={formData.enquiryDate}
                onChange={(e) => handleChange("enquiryDate", e.target.value)}
                onBlur={() => handleDateBlur("enquiryDate")}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* 2. Lead ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">
                  Lead ID <span className="text-neutral-400 font-normal">(Preserved if on form)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("leadId")}
                  {renderConfidenceBadge("lead_id")}
                </div>
              </div>
              <input
                type="text"
                placeholder="Leave blank to auto-generate"
                value={formData.leadId}
                onChange={(e) => handleChange("leadId", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* 3. Customer Name (Required) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-900">
                  1. Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("customerName")}
                  {renderConfidenceBadge("customer_name")}
                </div>
              </div>
              <input
                type="text"
                required
                placeholder="Full name as written on paper"
                value={formData.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                onBlur={handleCustomerNameBlur}
                className={`w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none transition ${
                  fieldErrors.customerName
                    ? "border-red-500 bg-red-50/50"
                    : "border-neutral-300 focus:border-neutral-900"
                }`}
              />
              {fieldErrors.customerName && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.customerName}</p>
              )}
            </div>

            {/* 4. Contact Number (Required) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-900">
                  2. Contact Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("contactNumber")}
                  {renderConfidenceBadge("contact_number")}
                </div>
              </div>
              <input
                type="text"
                required
                placeholder="Phone digits (e.g. 9822012345)"
                value={formData.contactNumber}
                onChange={(e) => handleChange("contactNumber", e.target.value)}
                onBlur={handlePhoneBlur}
                className={`w-full px-2.5 py-1.5 text-xs font-mono border rounded focus:outline-none transition ${
                  fieldErrors.contactNumber
                    ? "border-red-500 bg-red-50/50"
                    : "border-neutral-300 focus:border-neutral-900"
                }`}
              />
              {fieldErrors.contactNumber && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.contactNumber}</p>
              )}
            </div>

            {/* 5. Email ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">3. Email Id</label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("emailId")}
                  {renderConfidenceBadge("email_id")}
                </div>
              </div>
              <input
                type="text"
                placeholder="customer@gmail.com"
                value={formData.emailId}
                onChange={(e) => handleChange("emailId", e.target.value)}
                onBlur={handleEmailBlur}
                className={`w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none transition ${
                  fieldErrors.emailId
                    ? "border-red-500 bg-red-50/50"
                    : "border-neutral-300 focus:border-neutral-900"
                }`}
              />
              {fieldErrors.emailId && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.emailId}</p>
              )}
            </div>

            {/* 6. Occupation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">4. Occupation</label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("occupation")}
                  {renderConfidenceBadge("occupation")}
                </div>
              </div>
              <select
                value={formData.occupation}
                onChange={(e) => handleChange("occupation", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              >
                <option value="">-- Select Occupation --</option>
                <option value="Self Employed">Self Employed</option>
                <option value="Salaried">Salaried</option>
                <option value="Professional">Professional</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 7. Occupation Other */}
            {formData.occupation === "Other" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700">Occupation (Other details)</label>
                  {renderConfidenceBadge("occupation_other")}
                </div>
                <input
                  type="text"
                  placeholder="Specify other occupation"
                  value={formData.occupationOther}
                  onChange={(e) => handleChange("occupationOther", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
                />
              </div>
            )}

            {/* 8. Company Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">5. Company Name</label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("companyName")}
                  {renderConfidenceBadge("company_name")}
                </div>
              </div>
              <input
                type="text"
                placeholder="Company name"
                value={formData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* 9. Designation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">Designation</label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("designation")}
                  {renderConfidenceBadge("designation")}
                </div>
              </div>
              <input
                type="text"
                placeholder="e.g. Director, Manager"
                value={formData.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* 10. Client Address */}
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">6. Client Address</label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("address")}
                  {renderConfidenceBadge("address")}
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="Residential or office address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                onBlur={handleAddressBlur}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Lead Source & Booking Intent */}
        <div className="border border-neutral-200 rounded-md p-4 bg-white">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100">
            <Compass className="w-4 h-4 text-neutral-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Lead Source & Booking Intent
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 11. Lead Source */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">
                  7. How did you know about our project?
                </label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("leadSource")}
                  {renderConfidenceBadge("lead_source")}
                </div>
              </div>
              <select
                value={formData.leadSource}
                onChange={(e) => handleChange("leadSource", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              >
                <option value="">-- Select Source --</option>
                <option value="Newspaper">A) Newspaper</option>
                <option value="Website">B) Website</option>
                <option value="Referral">C) Referral</option>
                <option value="Hoardings">D) Hoardings</option>
                <option value="Channel Partner">E) Channel Partner</option>
                <option value="Other">F) Others</option>
              </select>
            </div>

            {/* 12. Lead Source Other */}
            {formData.leadSource === "Other" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700">Lead Source (Other details)</label>
                  {renderConfidenceBadge("lead_source_other")}
                </div>
                <input
                  type="text"
                  placeholder="Specify source"
                  value={formData.leadSourceOther}
                  onChange={(e) => handleChange("leadSourceOther", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none transition"
                />
              </div>
            )}

            {/* 13. Booking Timeline */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">8. I would like to book:</label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("bookingTimeline")}
                  {renderConfidenceBadge("booking_timeline")}
                </div>
              </div>
              <select
                value={formData.bookingTimeline}
                onChange={(e) => handleChange("bookingTimeline", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              >
                <option value="">-- Select Timeline --</option>
                <option value="Now">Now</option>
                <option value="Within a week">Within a week</option>
                <option value="Within a month">Within a month</option>
                <option value="After a month or more">After a month or more</option>
              </select>
            </div>

            {/* 14. Requires Bank Finance */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">
                  9. Financial Assistance from Bank?
                </label>
                <div className="flex items-center gap-1.5">
                  {renderCorrectionBadge("requiresBankFinance")}
                  {renderConfidenceBadge("requires_bank_finance")}
                </div>
              </div>
              <select
                value={formData.requiresBankFinance}
                onChange={(e) => handleChange("requiresBankFinance", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              >
                <option value="Yes">Yes (Looking for Bank Finance)</option>
                <option value="No">No (Self Financing)</option>
                <option value="Unknown">Unknown (Unchecked / Ambiguous)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Client Acknowledgement / Signature */}
        <div className="border border-neutral-200 rounded-md p-4 bg-white">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100">
            <FileCheck className="w-4 h-4 text-neutral-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Client Acknowledgement & Signature
            </h3>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-neutral-900">
              <input
                type="checkbox"
                checked={formData.hasClientSignature}
                onChange={(e) => handleChange("hasClientSignature", e.target.checked)}
                className="w-4 h-4 rounded text-neutral-900 border-neutral-300 focus:ring-0"
              />
              <span>15. Client Signature Present on Physical Document</span>
            </label>
            {renderConfidenceBadge("has_client_signature")}

            {formData.hasClientSignature && (
              <span className="text-[11px] text-neutral-500 italic">
                Signature marked as verified on Client Signature line.
              </span>
            )}
          </div>
        </div>

        {/* Section 4: Office Use Only Fields */}
        <div className="border border-neutral-200 rounded-md p-4 bg-neutral-50/60">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-neutral-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                OFFICE USE ONLY (Staff Section)
              </h3>
            </div>
            <span className="text-[11px] text-neutral-400">
              Keep empty if not filled on physical form. Do not substitute system time.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 16. Office Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-neutral-600">Office Date</label>
                {renderCorrectionBadge("officeDate")}
              </div>
              <input
                type="text"
                placeholder="Date on office section"
                value={formData.officeDate}
                onChange={(e) => handleChange("officeDate", e.target.value)}
                onBlur={() => handleDateBlur("officeDate")}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              />
            </div>

            {/* 17. Office Time */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-neutral-600">Office Time</label>
                {renderCorrectionBadge("officeTime")}
              </div>
              <input
                type="text"
                placeholder="Time on office section"
                value={formData.officeTime}
                onChange={(e) => handleChange("officeTime", e.target.value)}
                onBlur={handleTimeBlur}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              />
            </div>

            {/* 18. Allocated To */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-neutral-600">Allocated to</label>
                {renderCorrectionBadge("allocatedTo")}
              </div>
              <input
                type="text"
                placeholder="Sales executive name"
                value={formData.allocatedTo}
                onChange={(e) => handleChange("allocatedTo", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              />
            </div>

            {/* 19. Attended By */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-neutral-600">Attended by</label>
                {renderCorrectionBadge("attendedBy")}
              </div>
              <input
                type="text"
                placeholder="Staff name"
                value={formData.attendedBy}
                onChange={(e) => handleChange("attendedBy", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition"
              />
            </div>

            {/* 20. Remarks */}
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-neutral-600">Office Remarks</label>
                {renderCorrectionBadge("officeRemarks")}
              </div>
              <textarea
                rows={2}
                placeholder="Staff remarks from office section"
                value={formData.officeRemarks}
                onChange={(e) => handleChange("officeRemarks", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Reviewer Stamp */}
        <div className="pt-2 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>Verified by Reviewer:</span>
            <input
              type="text"
              value={formData.reviewedBy}
              onChange={(e) => handleChange("reviewedBy", e.target.value)}
              className="px-2 py-1 text-xs border border-neutral-300 rounded w-44 focus:border-neutral-900 focus:outline-none"
            />
          </div>
          {initialEnquiry.confirmedAt && (
            <span className="text-[11px] text-neutral-400">
              Confirmed on {new Date(initialEnquiry.confirmedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
