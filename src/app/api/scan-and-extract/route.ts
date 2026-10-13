import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveDocumentFile } from "@/lib/storage";
import {
  isSarvamConfigured,
  normalizeExtractionResponse,
  pollJobUntilComplete,
  submitExtractionJob,
} from "@/services/sarvam";
import { translateEnquiryDataToEnglish } from "@/services/translate";
import { applyAutoCorrectionRules } from "@/services/autoCorrection";

export const maxDuration = 60; // 60 seconds max timeout for OCR polling

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No document file provided for scanning." },
        { status: 400 }
      );
    }

    const mime = file.type || "image/jpeg";
    const name = file.name || "scanned-enquiry-form.jpg";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Store document in secure storage
    const storageResult = await saveDocumentFile(buffer, name, mime);

    // 2. Submit to Sarvam DocAI & poll for structured result
    let extractResult;
    try {
      const submission = await submitExtractionJob(buffer, name, mime);
      extractResult = await pollJobUntilComplete(submission.job_id);
    } catch (extractError: any) {
      console.error("[Sarvam Extraction Error in scan-and-extract]", extractError);
      return NextResponse.json(
        {
          error: "Document scanning & extraction failed",
          details: extractError.message || "Sarvam DocAI processing encountered an error.",
        },
        { status: 502 }
      );
    }

    // 3. Normalize raw extraction results
    const isMock = !isSarvamConfigured() || extractResult.job_id.startsWith("fixture_job_");
    const normalized = normalizeExtractionResponse(extractResult, isMock);

    // 4. Translate any non-English text (Marathi, Hindi, Gujarati, etc.) to English
    const translatedData = await translateEnquiryDataToEnglish(normalized);

    // 5. Apply auto-form filling and business cleanup rules
    const autoCorrected = applyAutoCorrectionRules(translatedData);

    // 6. Create initial enquiry record in database
    const enquiry = await prisma.enquiry.create({
      data: {
        originalDocumentPath: storageResult.relativePath,
        originalDocumentName: storageResult.filename,
        originalDocumentMime: mime,
        originalDocumentSize: storageResult.sizeBytes,
        status: "DRAFT",
        crmSyncStatus: "NOT_SYNCED",
        sarvamJobId: extractResult.job_id,
        rawExtraction: JSON.stringify(extractResult),
        confidenceScores: JSON.stringify(normalized.confidenceMap || {}),
        sourceAnnotations: JSON.stringify(normalized.sourceMap || {}),

        // Populated English Autofill Fields
        enquiryDate: autoCorrected.data.enquiryDate || "",
        leadId: autoCorrected.data.leadId || "",
        customerName: autoCorrected.data.customerName || "",
        contactNumber: autoCorrected.data.contactNumber || "",
        emailId: autoCorrected.data.emailId || "",
        occupation: autoCorrected.data.occupation || "",
        occupationOther: autoCorrected.data.occupationOther || "",
        companyName: autoCorrected.data.companyName || "",
        designation: autoCorrected.data.designation || "",
        address: autoCorrected.data.address || "",
        leadSource: autoCorrected.data.leadSource || "",
        leadSourceOther: autoCorrected.data.leadSourceOther || "",
        bookingTimeline: autoCorrected.data.bookingTimeline || "",
        requiresBankFinance: autoCorrected.data.requiresBankFinance || "Unknown",
        hasClientSignature: autoCorrected.data.hasClientSignature || false,
        signatureReference: autoCorrected.data.signatureReference || "",
        officeDate: autoCorrected.data.officeDate || "",
        officeTime: autoCorrected.data.officeTime || "",
        allocatedTo: autoCorrected.data.allocatedTo || "",
        attendedBy: autoCorrected.data.attendedBy || "",
        officeRemarks: autoCorrected.data.officeRemarks || "",
      },
    });

    return NextResponse.json({
      success: true,
      enquiryId: enquiry.id,
      data: autoCorrected.data,
      corrections: autoCorrected.corrections,
      document: {
        id: enquiry.id,
        name: storageResult.filename,
        url: `/api/documents/${enquiry.id}`,
      },
    });
  } catch (error: any) {
    console.error("[API POST /api/scan-and-extract error]", error);
    return NextResponse.json(
      { error: "Scanning pipeline error", details: error.message },
      { status: 500 }
    );
  }
}
