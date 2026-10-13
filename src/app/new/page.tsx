"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Camera,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck2,
} from "lucide-react";

export default function NewEnquiryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Upload & Extraction States
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [createdEnquiry, setCreatedEnquiry] = useState<any | null>(null);

  const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".pdf"];
  const MAX_FILE_SIZE_MB = 50;

  const validateFile = (file: File): boolean => {
    setValidationError(null);

    // Format check
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const isValidMime =
      file.type.startsWith("image/") || file.type === "application/pdf";

    if (!hasValidExt && !isValidMime) {
      setValidationError(
        `Invalid file format. Please upload a PNG, JPEG, or PDF file supported by Sarvam DocAI.`
      );
      return false;
    }

    // Size check
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setValidationError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds Sarvam DocAI's 50MB limit.`
      );
      return false;
    }

    return true;
  };

  const handleFileChange = (file: File) => {
    if (!validateFile(file)) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setCreatedEnquiry(null);

    // Create preview URL if image
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Quick Test: Load Vishal Chugera Enquiry Form bundled sample
  const handleLoadSampleForm = async () => {
    setIsUploading(true);
    setStatusMessage("Loading sample Vishal Chugera Properties enquiry form...");
    setValidationError(null);

    try {
      const res = await fetch("/api/sample-form", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Failed to load sample form.");
      }

      const data = await res.json();
      setCreatedEnquiry(data.enquiry);
      setPreviewUrl(`/api/documents/${data.enquiry.id}`);
      setStatusMessage("Sample form loaded! Click 'Extract Fields with Sarvam DocAI' below to begin.");
    } catch (err: any) {
      setValidationError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Explicit Extract Fields trigger
  const handleExtractFields = async () => {
    let enquiryId = createdEnquiry?.id;

    // If file is selected but not yet uploaded to server, upload it first
    if (!enquiryId && selectedFile) {
      setIsUploading(true);
      setStatusMessage("Uploading document to secure storage...");

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/enquiries", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.details || err.error || "Upload failed.");
        }

        const uploadData = await uploadRes.json();
        enquiryId = uploadData.enquiry.id;
        setCreatedEnquiry(uploadData.enquiry);
      } catch (err: any) {
        setValidationError(err.message);
        setIsUploading(false);
        return;
      }
    }

    if (!enquiryId) {
      setValidationError("Please select or capture an enquiry form photograph before extracting.");
      return;
    }

    // Now trigger Sarvam extraction
    setIsUploading(false);
    setIsExtracting(true);
    setStatusMessage("Submitting to Sarvam DocAI & extracting structured fields...");

    try {
      const extractRes = await fetch(`/api/enquiries/${enquiryId}/extract`, {
        method: "POST",
      });

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.details || err.error || "Extraction failed.");
      }

      // Route immediately to Extraction Review screen
      router.push(`/enquiries/${enquiryId}/review`);
    } catch (err: any) {
      setValidationError(`Extraction failed: ${err.message}. You can still proceed to manual review.`);
      setIsExtracting(false);
      // Give employee option to review anyway
      setCreatedEnquiry((prev: any) => ({ ...prev, id: enquiryId }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="pb-3 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Upload Enquiry Form
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Photograph or scan physical forms for Vishal Chugera Properties India Pvt. Ltd.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleForm}
          disabled={isUploading || isExtracting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-50 transition"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-neutral-600" />
          <span>Quick Test with Sample Form</span>
        </button>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">{validationError}</div>
        </div>
      )}

      {/* Status Progress Banner */}
      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <div>{statusMessage}</div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-10 text-center transition-colors bg-white ${
          isDragOver
            ? "border-neutral-900 bg-neutral-50"
            : "border-neutral-300 hover:border-neutral-400"
        }`}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Drag and drop physical enquiry form photo or PDF
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports PNG, JPEG, PDF up to 50MB (Sarvam DocAI specifications)
            </p>
          </div>

          {/* Action Buttons for File Picker and Camera */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {/* Standard File Picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isExtracting}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-50 disabled:opacity-50 transition shadow-sm"
            >
              <FileText className="w-4 h-4 text-neutral-500" />
              <span>Choose Document File</span>
            </button>

            {/* Mobile Device Camera Capture */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading || isExtracting}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-50 disabled:opacity-50 transition shadow-sm"
            >
              <Camera className="w-4 h-4 text-neutral-500" />
              <span>Take Photo with Camera</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview & Explicit Extract Trigger */}
      {(selectedFile || createdEnquiry) && (
        <div className="border border-neutral-200 rounded-md bg-white p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-neutral-900">
                Ready for Extraction: {selectedFile?.name || createdEnquiry?.originalDocumentName}
              </span>
              {selectedFile && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>

            {/* Clear selection */}
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setCreatedEnquiry(null);
                setValidationError(null);
                setStatusMessage(null);
              }}
              disabled={isUploading || isExtracting}
              className="text-xs text-neutral-500 hover:text-neutral-800 underline"
            >
              Change file
            </button>
          </div>

          {/* Document Preview Thumbnail / Box */}
          {previewUrl && (
            <div className="max-h-72 overflow-hidden rounded border border-neutral-200 bg-neutral-100 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Document preview"
                className="max-h-64 object-contain rounded shadow-sm bg-white"
              />
            </div>
          )}

          {/* Explicit Extract Fields Action - strictly initiated by user */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-neutral-500">
              Sarvam DocAI will analyze the photograph and extract all 20 enquiry fields.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {createdEnquiry && (
                <button
                  type="button"
                  onClick={() => router.push(`/enquiries/${createdEnquiry.id}/review`)}
                  disabled={isUploading || isExtracting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-300 rounded text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Manual Review Without OCR</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExtractFields}
                disabled={isUploading || isExtracting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition shadow-sm"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-300" />
                    <span>Extracting Fields with Sarvam...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Extract Fields with Sarvam DocAI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
