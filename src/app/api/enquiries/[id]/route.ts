import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Extract allowed editable fields
    const {
      enquiryDate,
      leadId,
      customerName,
      contactNumber,
      emailId,
      occupation,
      occupationOther,
      companyName,
      designation,
      address,
      leadSource,
      leadSourceOther,
      bookingTimeline,
      requiresBankFinance,
      hasClientSignature,
      signatureReference,
      officeDate,
      officeTime,
      allocatedTo,
      attendedBy,
      officeRemarks,
      status,
      reviewedBy,
    } = body;

    const updated = await prisma.enquiry.update({
      where: { id },
      data: {
        ...(enquiryDate !== undefined && { enquiryDate }),
        ...(leadId !== undefined && { leadId }),
        ...(customerName !== undefined && { customerName }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(emailId !== undefined && { emailId }),
        ...(occupation !== undefined && { occupation }),
        ...(occupationOther !== undefined && { occupationOther }),
        ...(companyName !== undefined && { companyName }),
        ...(designation !== undefined && { designation }),
        ...(address !== undefined && { address }),
        ...(leadSource !== undefined && { leadSource }),
        ...(leadSourceOther !== undefined && { leadSourceOther }),
        ...(bookingTimeline !== undefined && { bookingTimeline }),
        ...(requiresBankFinance !== undefined && { requiresBankFinance }),
        ...(hasClientSignature !== undefined && { hasClientSignature }),
        ...(signatureReference !== undefined && { signatureReference }),
        ...(officeDate !== undefined && { officeDate }),
        ...(officeTime !== undefined && { officeTime }),
        ...(allocatedTo !== undefined && { allocatedTo }),
        ...(attendedBy !== undefined && { attendedBy }),
        ...(officeRemarks !== undefined && { officeRemarks }),
        ...(status !== undefined && { status }),
        ...(reviewedBy !== undefined && { reviewedBy }),
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
