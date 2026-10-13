import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyAutoCorrectionRules } from "@/services/autoCorrection";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/enquiries/[id] - Fetch single enquiry with full details & sync logs
export async function GET(request: NextRequest, { params }: Params) {
  try {
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
      return NextResponse.json({ error: "Enquiry record not found." }, { status: 404 });
    }

    // Parse confidenceScores and sourceAnnotations if present
    let confidenceScores: Record<string, number> = {};
    let sourceAnnotations: Record<string, any[]> = {};
    let rawExtractionObj: any = null;

    try {
      if (enquiry.confidenceScores) {
        confidenceScores = JSON.parse(enquiry.confidenceScores);
      }
      if (enquiry.sourceAnnotations) {
        sourceAnnotations = JSON.parse(enquiry.sourceAnnotations);
      }
      if (enquiry.rawExtraction) {
        rawExtractionObj = JSON.parse(enquiry.rawExtraction);
      }
    } catch (e) {
      console.warn("Failed to parse JSON metadata for enquiry", id, e);
    }

    return NextResponse.json({
      enquiry,
      confidenceScores,
      sourceAnnotations,
      rawExtraction: rawExtractionObj,
    });
  } catch (error: any) {
    console.error("[API GET /api/enquiries/[id] error]", error);
    return NextResponse.json(
      { error: "Failed to fetch enquiry record", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/enquiries/[id] - Update enquiry fields (Save draft progress)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.enquiry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Enquiry record not found." }, { status: 404 });
    }

    // Apply auto-correction rules to any submitted form fields
    const { data: cleanedData } = applyAutoCorrectionRules(body);

    const updated = await prisma.enquiry.update({
      where: { id },
      data: {
        ...(body.enquiryDate !== undefined && { enquiryDate: cleanedData.enquiryDate }),
        ...(body.leadId !== undefined && { leadId: cleanedData.leadId }),
        ...(body.customerName !== undefined && { customerName: cleanedData.customerName }),
        ...(body.contactNumber !== undefined && { contactNumber: cleanedData.contactNumber }),
        ...(body.emailId !== undefined && { emailId: cleanedData.emailId }),
        ...(body.occupation !== undefined && { occupation: cleanedData.occupation }),
        ...(body.occupationOther !== undefined && { occupationOther: cleanedData.occupationOther }),
        ...(body.companyName !== undefined && { companyName: cleanedData.companyName }),
        ...(body.designation !== undefined && { designation: cleanedData.designation }),
        ...(body.address !== undefined && { address: cleanedData.address }),
        ...(body.leadSource !== undefined && { leadSource: cleanedData.leadSource }),
        ...(body.leadSourceOther !== undefined && { leadSourceOther: cleanedData.leadSourceOther }),
        ...(body.bookingTimeline !== undefined && { bookingTimeline: cleanedData.bookingTimeline }),
        ...(body.requiresBankFinance !== undefined && { requiresBankFinance: cleanedData.requiresBankFinance }),
        ...(body.hasClientSignature !== undefined && { hasClientSignature: cleanedData.hasClientSignature }),
        ...(body.signatureReference !== undefined && { signatureReference: cleanedData.signatureReference }),
        ...(body.officeDate !== undefined && { officeDate: cleanedData.officeDate }),
        ...(body.officeTime !== undefined && { officeTime: cleanedData.officeTime }),
        ...(body.allocatedTo !== undefined && { allocatedTo: cleanedData.allocatedTo }),
        ...(body.attendedBy !== undefined && { attendedBy: cleanedData.attendedBy }),
        ...(body.officeRemarks !== undefined && { officeRemarks: cleanedData.officeRemarks }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.reviewedBy !== undefined && { reviewedBy: body.reviewedBy }),
      },
    });

    return NextResponse.json({
      message: "Enquiry updated successfully.",
      enquiry: updated,
    });
  } catch (error: any) {
    console.error("[API PATCH /api/enquiries/[id] error]", error);
    return NextResponse.json(
      { error: "Failed to update enquiry record", details: error.message },
      { status: 500 }
    );
  }
}
