"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  FileUp,
  Scan,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Compass,
  ChevronLeft,
  Database,
  X,
  Eye,
  Loader2,
} from "lucide-react";
import {
  cleanEmail,
  cleanContactNumber,
  cleanCustomerName,
  cleanDate,
  cleanTime,
  cleanAddress,
} from "@/services/autoCorrection";

export default function NewEnquiryPage() {
  const router = useRouter();

  // Hidden input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    enquiryDate: "",
    leadId: "",
    customerName: "",
    contactNumber: "",
    emailId: "",
    occupation: "",
    occupationOther: "",
    companyName: "",
    designation: "",
    address: "",
    leadSource: "",
    leadSourceOther: "",
    bookingTimeline: "",
    requiresBankFinance: "Unknown",
    hasClientSignature: false,
    signatureReference: "",
    officeDate: "",
    officeTime: "",
    allocatedTo: "",
    attendedBy: "",
    officeRemarks: "",
    reviewedBy: "Office Staff",
  });

  // Scanned Document info (if scanned)
  const [scannedEnquiryId, setScannedEnquiryId] = useState<string | null>(null);
  const [scannedDocInfo, setScannedDocInfo] = useState<{ name: string; url: string } | null>(null);

  // Scan Modal & Action States
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>("Uploading document...");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // WebCam desktop capture modal state
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Stop camera stream when webcam modal closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle direct input change
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

  // Smart onBlur Cleaners
  const handleEmailBlur = () => {
    if (!formData.emailId) return;
    const res = cleanEmail(formData.emailId);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, emailId: res.value }));
    }
  };

  const handlePhoneBlur = () => {
    if (!formData.contactNumber) return;
    const res = cleanContactNumber(formData.contactNumber);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, contactNumber: res.value }));
    }
  };

  const handleCustomerNameBlur = () => {
    if (!formData.customerName) return;
    const res = cleanCustomerName(formData.customerName);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, customerName: res.value }));
    }
  };

  const handleDateBlur = (field: "enquiryDate" | "officeDate") => {
    const val = formData[field];
    if (!val) return;
    const res = cleanDate(val);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, [field]: res.value }));
    }
  };

  const handleTimeBlur = () => {
    if (!formData.officeTime) return;
    const res = cleanTime(formData.officeTime);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, officeTime: res.value }));
    }
  };

  const handleAddressBlur = () => {
    if (!formData.address) return;
    const res = cleanAddress(formData.address);
    if (res.changed) {
      setFormData((prev) => ({ ...prev, address: res.value }));
    }
  };

  // 1. Core Automatic Scan & Autofill Pipeline
  const startAutoScan = async (file: File) => {
    setShowScanOptions(false);
    setIsScanning(true);
    setScanStep("Uploading paper document...");
    setFeedback(null);

    const stepTimer1 = setTimeout(() => {
      setScanStep("Sarvam DocAI scanning handwriting & layout...");
    }, 2000);

    const stepTimer2 = setTimeout(() => {
      setScanStep("Detecting languages & translating to English...");
    }, 6000);

    const stepTimer3 = setTimeout(() => {
      setScanStep("Applying intelligent form filling & cleanup rules...");
    }, 9000);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/scan-and-extract", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || err.error || "Document scan failed.");
      }

      const res = await response.json();

      // Populate form state automatically
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          enquiryDate: res.data.enquiryDate || prev.enquiryDate,
          leadId: res.data.leadId || prev.leadId,
          customerName: res.data.customerName || prev.customerName,
          contactNumber: res.data.contactNumber || prev.contactNumber,
          emailId: res.data.emailId || prev.emailId,
          occupation: res.data.occupation || prev.occupation,
          occupationOther: res.data.occupationOther || prev.occupationOther,
          companyName: res.data.companyName || prev.companyName,
          designation: res.data.designation || prev.designation,
          address: res.data.address || prev.address,
          leadSource: res.data.leadSource || prev.leadSource,
          leadSourceOther: res.data.leadSourceOther || prev.leadSourceOther,
          bookingTimeline: res.data.bookingTimeline || prev.bookingTimeline,
          requiresBankFinance: res.data.requiresBankFinance || prev.requiresBankFinance,
          hasClientSignature: res.data.hasClientSignature ?? prev.hasClientSignature,
          signatureReference: res.data.signatureReference || prev.signatureReference,
          officeDate: res.data.officeDate || prev.officeDate,
          officeTime: res.data.officeTime || prev.officeTime,
          allocatedTo: res.data.allocatedTo || prev.allocatedTo,
          attendedBy: res.data.attendedBy || prev.attendedBy,
          officeRemarks: res.data.officeRemarks || prev.officeRemarks,
        }));
      }

      if (res.enquiryId) {
        setScannedEnquiryId(res.enquiryId);
      }
      if (res.document) {
        setScannedDocInfo(res.document);
      }

      setFeedback({
        type: "success",
        text: "Document scanned and form autofilled in English successfully! Please review the fields and submit.",
      });
    } catch (error: any) {
      console.error("[Auto-scan error]", error);
      setFeedback({
        type: "error",
        text: `Scanning failed: ${error.message}. You can still fill the form manually or retry scanning.`,
      });
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsScanning(false);
    }
  };

  // Handle File Input Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startAutoScan(file);
    }
    // reset input
    e.target.value = "";
  };

  // Start Camera Stream for desktop capture
  const handleStartCamera = async () => {
    setShowScanOptions(false);
    // On mobile devices, triggering the native camera input is cleaner
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click();
      return;
    }

    // On desktop, open live camera view
    try {
      setShowWebcamModal(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setShowWebcamModal(false);
      // Fallback to camera file input
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  // Capture snapshot from webcam
  const handleCaptureWebcamSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const capturedFile = new File([blob], `camera-scan-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            // Stop stream & close modal
            if (cameraStream) {
              cameraStream.getTracks().forEach((t) => t.stop());
              setCameraStream(null);
            }
            setShowWebcamModal(false);
            // Immediately start scanning
            startAutoScan(capturedFile);
          }
        },
        "image/jpeg",
        0.95
      );
    }
  };

  const handleCloseWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowWebcamModal(false);
  };

  // 2. Submit & Confirm Enquiry
  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    setFieldErrors({});

    try {
      const payload = {
        ...formData,
        enquiryId: scannedEnquiryId || undefined,
      };

      const res = await fetch("/api/enquiries/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
          throw new Error("Please fill in the required fields highlighted in red.");
        }
        throw new Error(data.error || data.details || "Submission failed.");
      }

      setFeedback({
        type: "success",
        text: "Enquiry submitted and synced to CRM successfully! Redirecting to records...",
      });

      setTimeout(() => {
        router.push("/enquiries");
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Top Header / Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition py-1 px-2.5 rounded-md hover:bg-neutral-100"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <span className="text-neutral-300">/</span>
          <h1 className="text-base font-bold text-neutral-900">New Physical Form Enquiry</h1>
        </div>

        <Link
          href="/enquiries"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition py-1 px-3 rounded-md hover:bg-neutral-100"
        >
          <Database className="w-3.5 h-3.5 text-neutral-500" />
          <span>View Enquiry Records</span>
        </Link>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center gap-2.5 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : feedback.type === "error"
              ? "bg-red-50 text-red-900 border-red-200"
              : "bg-blue-50 text-blue-900 border-blue-200"
          }`}
        >
          {feedback.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
          {feedback.type === "error" && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          {feedback.type === "info" && <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />}
          <div className="flex-1 font-medium">{feedback.text}</div>
        </div>
      )}

      {/* Scanned Document Badge */}
      {scannedDocInfo && (
        <div className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-neutral-600">Autofilled from paper document:</span>
            <span className="font-semibold text-neutral-900">{scannedDocInfo.name}</span>
          </div>
          <a
            href={scannedDocInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Scanned File</span>
          </a>
        </div>
      )}

      {/* MAIN FORM */}
      <form onSubmit={handleSubmitEnquiry} className="space-y-6">
        {/* Section 1: Customer Identification & Contact */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
            <User className="w-4 h-4 text-neutral-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Customer Identification & Contact Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Enquiry Date */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Enquiry Date</label>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={formData.enquiryDate}
                onChange={(e) => handleChange("enquiryDate", e.target.value)}
                onBlur={() => handleDateBlur("enquiryDate")}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* Lead ID */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Lead ID <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Auto-generated if left blank"
                value={formData.leadId}
                onChange={(e) => handleChange("leadId", e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* 1. Customer Name (Required) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-900 mb-1">
                1. Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Full name (in English)"
                value={formData.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                onBlur={handleCustomerNameBlur}
                className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none transition ${
                  fieldErrors.customerName
                    ? "border-red-500 bg-red-50/50"
                    : "border-neutral-300 focus:border-neutral-900"
                }`}
              />
              {fieldErrors.customerName && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.customerName}</p>
              )}
            </div>

            {/* 2. Contact Number (Required) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-900 mb-1">
                2. Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="10-digit mobile number"
                value={formData.contactNumber}
                onChange={(e) => handleChange("contactNumber", e.target.value)}
                onBlur={handlePhoneBlur}
                className={`w-full px-3 py-2 text-xs font-mono border rounded-lg focus:outline-none transition ${
                  fieldErrors.contactNumber
                    ? "border-red-500 bg-red-50/50"
                    : "border-neutral-300 focus:border-neutral-900"
                }`}
              />
              {fieldErrors.contactNumber && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.contactNumber}</p>
              )}
            </div>

            {/* 3. Email ID */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">3. Email Id</label>
              <input
                type="text"
                placeholder="customer@gmail.com"
                value={formData.emailId}
                onChange={(e) => handleChange("emailId", e.target.value)}
                onBlur={handleEmailBlur}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* 4. Occupation */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">4. Occupation</label>
              <select
                value={formData.occupation}
                onChange={(e) => handleChange("occupation", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white transition"
              >
                <option value="">-- Select Occupation --</option>
                <option value="Self Employed">Self Employed</option>
                <option value="Salaried">Salaried</option>
                <option value="Professional">Professional</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 5. Company Name */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">5. Company Name</label>
              <input
                type="text"
                placeholder="Company name"
                value={formData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Designation</label>
              <input
                type="text"
                placeholder="e.g. Director, Manager"
                value={formData.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none transition"
              />
            </div>

            {/* 6. Client Address */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-neutral-700 mb-1">6. Client Address</label>
              <textarea
                rows={2}
                placeholder="Residential or office address (translated into English)"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                onBlur={handleAddressBlur}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Lead Source & Booking Intent */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
            <Compass className="w-4 h-4 text-neutral-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Lead Source & Booking Intent
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 7. Lead Source */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                7. How did you know about our project?
              </label>
              <select
                value={formData.leadSource}
                onChange={(e) => handleChange("leadSource", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white transition"
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

            {/* 8. Booking Timeline */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">8. I would like to book:</label>
              <select
                value={formData.bookingTimeline}
                onChange={(e) => handleChange("bookingTimeline", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white transition"
              >
                <option value="">-- Select Timeline --</option>
                <option value="Now">Now</option>
                <option value="Within a week">Within a week</option>
                <option value="Within a month">Within a month</option>
                <option value="After a month or more">After a month or more</option>
              </select>
            </div>

            {/* 9. Requires Bank Finance */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                9. Financial Assistance from Bank?
              </label>
              <select
                value={formData.requiresBankFinance}
                onChange={(e) => handleChange("requiresBankFinance", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none bg-white transition"
              >
                <option value="Yes">Yes (Looking for Bank Finance)</option>
                <option value="No">No (Self Financing)</option>
                <option value="Unknown">Unknown (Unchecked / Ambiguous)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Signature & Office Section */}
        <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-200">
            <Building className="w-4 h-4 text-neutral-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Client Signature & Office Section
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-neutral-900">
              <input
                type="checkbox"
                checked={formData.hasClientSignature}
                onChange={(e) => handleChange("hasClientSignature", e.target.checked)}
                className="w-4 h-4 rounded text-neutral-900 border-neutral-300 focus:ring-0"
              />
              <span>Client Signature Present on Physical Paper Document</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Office Date</label>
                <input
                  type="text"
                  placeholder="Office date"
                  value={formData.officeDate}
                  onChange={(e) => handleChange("officeDate", e.target.value)}
                  onBlur={() => handleDateBlur("officeDate")}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Office Time</label>
                <input
                  type="text"
                  placeholder="Office time"
                  value={formData.officeTime}
                  onChange={(e) => handleChange("officeTime", e.target.value)}
                  onBlur={handleTimeBlur}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Allocated to</label>
                <input
                  type="text"
                  placeholder="Sales executive"
                  value={formData.allocatedTo}
                  onChange={(e) => handleChange("allocatedTo", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Attended by</label>
                <input
                  type="text"
                  placeholder="Attending staff"
                  value={formData.attendedBy}
                  onChange={(e) => handleChange("attendedBy", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-medium text-neutral-600 mb-1">Office Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Staff remarks from office section (translated to English)"
                  value={formData.officeRemarks}
                  onChange={(e) => handleChange("officeRemarks", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:border-neutral-900 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/"
            className="px-5 py-2.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || isScanning}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Saving & Syncing to CRM...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Submit & Confirm Enquiry</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* FLOATING ACTION BUTTON (BOTTOM RIGHT CORNER) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setShowScanOptions(!showScanOptions)}
          disabled={isScanning}
          className="group flex items-center gap-2 px-5 py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-full shadow-2xl hover:shadow-emerald-950/20 border border-neutral-800 transition-all transform hover:scale-105 active:scale-95"
          title="Scan paper document to autofill form"
        >
          <Scan className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="font-semibold text-sm tracking-wide">Scan</span>
        </button>

        {/* Scan Options Popup */}
        {showScanOptions && (
          <div className="absolute bottom-16 right-0 w-72 bg-white border border-neutral-200 rounded-2xl shadow-2xl p-3 space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-800">Scan Paper Document</span>
              <button
                type="button"
                onClick={() => setShowScanOptions(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Option 1: Choose Document File */}
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-neutral-900">Choose Document File</span>
                <span className="block text-[11px] text-neutral-500">Upload paper form photo or PDF</span>
              </div>
            </button>

            {/* Option 2: Take Photo with Camera */}
            <button
              type="button"
              onClick={handleStartCamera}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-neutral-900">Take Photo with Camera</span>
                <span className="block text-[11px] text-neutral-500">Snap directly with device camera</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* FULLSCREEN AUTOMATIC SCANNING & PROCESSING ANIMATION OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Top scanning laser animation graphic */}
            <div className="w-32 h-44 mx-auto border-2 border-neutral-300 rounded-xl relative overflow-hidden bg-neutral-50 flex flex-col items-center justify-center p-3 shadow-inner">
              {/* Document silhouette lines */}
              <div className="w-full space-y-2 opacity-30">
                <div className="h-2 w-3/4 bg-neutral-600 rounded"></div>
                <div className="h-1.5 w-full bg-neutral-500 rounded"></div>
                <div className="h-1.5 w-5/6 bg-neutral-500 rounded"></div>
                <div className="h-1.5 w-4/6 bg-neutral-500 rounded"></div>
                <div className="h-1.5 w-full bg-neutral-500 rounded"></div>
                <div className="h-1.5 w-2/3 bg-neutral-500 rounded"></div>
              </div>

              {/* Glowing Laser Beam traveling up and down */}
              <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_3px_rgba(52,211,153,0.8)] animate-[bounce_2s_infinite]"></div>
            </div>

            {/* Spinner & Progress text */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>Sarvam DocAI Scanning Active</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900">Analyzing Physical Form</h3>
              <p className="text-xs text-neutral-500 min-h-[1.5rem] transition-all">
                {scanStep}
              </p>
            </div>

            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-neutral-900 rounded-full animate-pulse w-3/4"></div>
            </div>

            <p className="text-[11px] text-neutral-400">
              Translating text to English & auto-filling form fields...
            </p>
          </div>
        </div>
      )}

      {/* WEBCAM CAMERA MODAL (DESKTOP) */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative max-w-xl w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex items-center justify-between p-4 bg-neutral-800 text-white">
              <span className="text-xs font-semibold">Position paper enquiry form inside frame</span>
              <button
                type="button"
                onClick={handleCloseWebcam}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Video Preview */}
            <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Corner guide overlay */}
              <div className="absolute inset-8 border-2 border-white/40 border-dashed rounded-xl pointer-events-none"></div>
            </div>

            {/* Shutter Button */}
            <div className="p-4 bg-neutral-800 w-full flex justify-center">
              <button
                type="button"
                onClick={handleCaptureWebcamSnapshot}
                className="w-14 h-14 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg transition transform hover:scale-105 active:scale-95"
                title="Capture & Scan Document"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
