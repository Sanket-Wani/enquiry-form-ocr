import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncEnquiryToCrm } from "@/services/crm/adapter";
import { applyAutoCorrectionRules } from "@/services/autoCorrection";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // Run through common-sense business auto-correction rules
    const { data: cleaned } = applyAutoCorrectionRules(rawBody);

    // Validation
    if (!cleaned.customerName || cleaned.customerName.trim().length === 0) {
      return NextResponse.json(
        { error: "Customer Name is required." },
        { status: 422 }
      );
    }

    if (!cleaned.contactNumber || cleaned.contactNumber.trim().length < 10) {
      return NextResponse.json(
        { error: "Contact Number must be a valid 10-digit phone number." },
        { status: 422 }
      );
    }

    // Generate Lead ID if not already present
    let finalLeadId = cleaned.leadId?.trim();
    if (!finalLeadId) {
      const year = new Date().getFullYear();
      finalLeadId = `VCP-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const reviewer = rawBody.reviewedBy?.trim() || "Office Staff";
    const confirmedAt = new Date();

    let enquiry;
    // If an enquiryId was provided (from scanning), update that existing record
    if (rawBody.enquiryId) {
      enquiry = await prisma.enquiry.update({
        where: { id: rawBody.enquiryId },
        data: {
          status: "CONFIRMED",
          leadId: finalLeadId,
          customerName: cleaned.customerName.trim(),
          contactNumber: cleaned.contactNumber.trim(),
          emailId: cleaned.emailId?.trim() || null,
          occupation: cleaned.occupation || null,
          occupationOther: cleaned.occupationOther?.trim() || null,
          companyName: cleaned.companyName?.trim() || null,
          designation: cleaned.designation?.trim() || null,
          address: cleaned.address?.trim() || null,
          leadSource: cleaned.leadSource || null,
          leadSourceOther: cleaned.leadSourceOther?.trim() || null,
          bookingTimeline: cleaned.bookingTimeline || null,
          requiresBankFinance: cleaned.requiresBankFinance || "Unknown",
          hasClientSignature: Boolean(cleaned.hasClientSignature),
          signatureReference: cleaned.signatureReference || null,
          officeDate: cleaned.officeDate?.trim() || null,
          officeTime: cleaned.officeTime?.trim() || null,
          allocatedTo: cleaned.allocatedTo?.trim() || null,
          attendedBy: cleaned.attendedBy?.trim() || null,
          officeRemarks: cleaned.officeRemarks?.trim() || null,
          enquiryDate: cleaned.enquiryDate?.trim() || null,
          reviewedBy: reviewer,
          confirmedAt,
          crmSyncStatus: "PENDING",
        },
      });
    } else {
      // Manual entry without scan
      enquiry = await prisma.enquiry.create({
        data: {
          originalDocumentPath: "manual-entry",
          originalDocumentName: "Direct Form Entry",
          originalDocumentMime: "application/json",
          originalDocumentSize: 0,
          status: "CONFIRMED",
          leadId: finalLeadId,
          customerName: cleaned.customerName.trim(),
          contactNumber: cleaned.contactNumber.trim(),
          emailId: cleaned.emailId?.trim() || null,
          occupation: cleaned.occupation || null,
          occupationOther: cleaned.occupationOther?.trim() || null,
          companyName: cleaned.companyName?.trim() || null,
          designation: cleaned.designation?.trim() || null,
          address: cleaned.address?.trim() || null,
          leadSource: cleaned.leadSource || null,
          leadSourceOther: cleaned.leadSourceOther?.trim() || null,
          bookingTimeline: cleaned.bookingTimeline || null,
          requiresBankFinance: cleaned.requiresBankFinance || "Unknown",
          hasClientSignature: Boolean(cleaned.hasClientSignature),
          signatureReference: cleaned.signatureReference || null,
          officeDate: cleaned.officeDate?.trim() || null,
          officeTime: cleaned.officeTime?.trim() || null,
          allocatedTo: cleaned.allocatedTo?.trim() || null,
          attendedBy: cleaned.attendedBy?.trim() || null,
          officeRemarks: cleaned.officeRemarks?.trim() || null,
          enquiryDate: cleaned.enquiryDate?.trim() || null,
          reviewedBy: reviewer,
          confirmedAt,
          crmSyncStatus: "PENDING",
        },
      });
    }

    // Sync to CRM
    const crmResult = await syncEnquiryToCrm(enquiry.id, reviewer);

    const refreshed = await prisma.enquiry.findUnique({
      where: { id: enquiry.id },
      include: {
        syncLogs: {
          orderBy: { attemptedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: crmResult.success
        ? "Enquiry saved and synced to CRM successfully!"
        : "Enquiry saved to database. CRM sync will retry automatically.",
      enquiry: refreshed,
      crmSyncResult: crmResult,
    });
  } catch (error: any) {
    console.error("[API POST /api/enquiries/submit error]", error);
    return NextResponse.json(
      { error: "Failed to submit enquiry", details: error.message },
      { status: 500 }
    );
  }
}
