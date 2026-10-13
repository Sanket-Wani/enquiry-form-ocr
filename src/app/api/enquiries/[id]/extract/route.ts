import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDocumentFile } from "@/lib/storage";
import {
  isSarvamConfigured,
  normalizeExtractionResponse,
  pollJobUntilComplete,
  submitExtractionJob,
} from "@/services/sarvam";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry record not found." }, { status: 404 });
    }

    // Set status to PROCESSING
    await prisma.enquiry.update({
      where: { id },
      data: { status: "PROCESSING" },
    });

    // Read original document from storage
    const fileBuffer = await readDocumentFile(enquiry.originalDocumentPath);

    let extractResult;
    try {
      // 1. Submit extraction job to Sarvam DocAI
      const submission = await submitExtractionJob(
        fileBuffer,
        enquiry.originalDocumentName,
        enquiry.originalDocumentMime
      );

      // Persist job tracking info
      await prisma.enquiry.update({
        where: { id },
        data: {
          sarvamJobId: submission.job_id,
          sarvamRunId: submission.run_id,
        },
      });

      // 2. Poll job until completion
      extractResult = await pollJobUntilComplete(submission.job_id);
    } catch (extractError: any) {
      console.error("[Sarvam Extraction Error]", extractError);
      // Mark as EXTRACTION_FAILED
      await prisma.enquiry.update({
        where: { id },
        data: { status: "EXTRACTION_FAILED" },
      });

      return NextResponse.json(
        {
          error: "Document extraction failed",
          details: extractError.message || "Sarvam DocAI processing encountered an error.",
        },
        { status: 502 }
      );
    }

    // 3. Normalize extraction results
    const isMock = !isSarvamConfigured() || extractResult.job_id.startsWith("fixture_job_");
    const normalized = normalizeExtractionResponse(extractResult, isMock);

    // 4. Update Enquiry record with extracted values and separate raw extraction persistence
    // Rule: Preserve raw extraction separately from reviewed values!
    const updated = await prisma.enquiry.update({
      where: { id },
      data: {
        status: "AWAITING_REVIEW",
        rawExtraction: JSON.stringify(extractResult),
        confidenceScores: JSON.stringify(normalized.confidenceMap),
        sourceAnnotations: JSON.stringify(normalized.sourceMap),

        // Populate digital form fields if they are currently blank/unmodified
        enquiryDate: enquiry.enquiryDate || normalized.enquiryDate || "",
        leadId: enquiry.leadId || normalized.leadId || "",
        customerName: enquiry.customerName || normalized.customerName || "",
        contactNumber: enquiry.contactNumber || normalized.contactNumber || "",
        emailId: enquiry.emailId || normalized.emailId || "",
        occupation: enquiry.occupation || normalized.occupation || "",
        occupationOther: enquiry.occupationOther || normalized.occupationOther || "",
        companyName: enquiry.companyName || normalized.companyName || "",
        designation: enquiry.designation || normalized.designation || "",
        address: enquiry.address || normalized.address || "",
        leadSource: enquiry.leadSource || normalized.leadSource || "",
        leadSourceOther: enquiry.leadSourceOther || normalized.leadSourceOther || "",
        bookingTimeline: enquiry.bookingTimeline || normalized.bookingTimeline || "",
        requiresBankFinance:
          enquiry.requiresBankFinance !== "Unknown"
            ? enquiry.requiresBankFinance
            : normalized.requiresBankFinance,
        hasClientSignature: enquiry.hasClientSignature || normalized.hasClientSignature,
        signatureReference: enquiry.signatureReference || normalized.signatureReference || "",
        officeDate: enquiry.officeDate || normalized.officeDate || "",
        officeTime: enquiry.officeTime || normalized.officeTime || "",
        allocatedTo: enquiry.allocatedTo || normalized.allocatedTo || "",
        attendedBy: enquiry.attendedBy || normalized.attendedBy || "",
        officeRemarks: enquiry.officeRemarks || normalized.officeRemarks || "",
      },
    });

    return NextResponse.json({
      message: "Sarvam extraction completed successfully.",
      enquiry: updated,
      normalized,
      isMockMode: isMock,
    });
  } catch (error: any) {
    console.error("[API POST /api/enquiries/[id]/extract error]", error);
    return NextResponse.json(
      { error: "Extraction pipeline error", details: error.message },
      { status: 500 }
    );
  }
}
