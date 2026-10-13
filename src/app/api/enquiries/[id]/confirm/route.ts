import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncEnquiryToCrm } from "@/services/crm/adapter";
import { applyAutoCorrectionRules } from "@/services/autoCorrection";

interface Params {
  params: Promise<{ id: string }>;
}

const VALID_OCCUPATIONS = ["Self Employed", "Salaried", "Professional", "Other", ""];
const VALID_LEAD_SOURCES = [
  "Newspaper",
  "Website",
  "Referral",
  "Hoardings",
  "Channel Partner",
  "Other",
  "",
];
const VALID_BOOKING_TIMELINES = [
  "Now",
  "Within a week",
  "Within a month",
  "After a month or more",
  "",
];
const VALID_BANK_FINANCE = ["Yes", "No", "Unknown"];

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const rawBody = await request.json();

    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry record not found." }, { status: 404 });
    }

    // Apply auto-correction and standard business rules to form values before validation
    const { data: cleanedData, corrections } = applyAutoCorrectionRules(rawBody);

    const {
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
      enquiryDate,
      leadId,
    } = cleanedData;

    const reviewedBy = rawBody.reviewedBy?.trim() || "Office Staff";

    // Strict Business Validation
    const errors: Record<string, string> = {};

    // 1. Customer Name Presence
    if (!customerName || customerName.trim().length === 0) {
      errors.customerName = "Customer Name is required before confirmation.";
    }

    // 2. Contact Number Format (strictly string, minimum 10 digits without altering digits)
    const cleanPhone = contactNumber ? String(contactNumber).trim() : "";
    if (!cleanPhone) {
      errors.contactNumber = "Contact Number is required.";
    } else {
      const digitCount = (cleanPhone.match(/\d/g) || []).length;
      if (digitCount < 10) {
        errors.contactNumber = "Contact Number must contain at least 10 digits.";
      }
    }

    // 3. Email syntax (if present)
    if (emailId && emailId.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailId.trim())) {
        errors.emailId = "Invalid email address syntax.";
      }
    }

    // 4. Allowed Enum Values
    if (occupation && !VALID_OCCUPATIONS.includes(occupation)) {
      errors.occupation = `Invalid occupation '${occupation}'. Allowed: ${VALID_OCCUPATIONS.filter(Boolean).join(", ")}`;
    }
    if (leadSource && !VALID_LEAD_SOURCES.includes(leadSource)) {
      errors.leadSource = `Invalid lead source '${leadSource}'. Allowed: ${VALID_LEAD_SOURCES.filter(Boolean).join(", ")}`;
    }
    if (bookingTimeline && !VALID_BOOKING_TIMELINES.includes(bookingTimeline)) {
      errors.bookingTimeline = `Invalid booking timeline '${bookingTimeline}'.`;
    }
    if (requiresBankFinance && !VALID_BANK_FINANCE.includes(requiresBankFinance)) {
      errors.requiresBankFinance = "Bank finance requirement must be 'Yes', 'No', or 'Unknown'.";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed before confirmation.",
          fieldErrors: errors,
        },
        { status: 422 }
      );
    }

    // Generate or preserve Lead ID according to consistent application policy:
    // If Lead ID was already present on physical form, preserve it.
    // Otherwise, generate structured format: VCP-LEAD-<year>-<random sequence>
    let finalLeadId = leadId?.trim() || enquiry.leadId?.trim();
    if (!finalLeadId) {
      const currentYear = new Date().getFullYear();
      finalLeadId = `VCP-${currentYear}-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const reviewer = reviewedBy?.trim() || "Office Staff";
    const confirmedAt = new Date();

    // 1. Save verified enquiry to application database
    const confirmedEnquiry = await prisma.enquiry.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        leadId: finalLeadId,
        customerName: customerName.trim(),
        contactNumber: contactNumber.trim(),
        emailId: emailId?.trim() || null,
        occupation: occupation || null,
        occupationOther: occupationOther?.trim() || null,
        companyName: companyName?.trim() || null,
        designation: designation?.trim() || null,
        address: address?.trim() || null,
        leadSource: leadSource || null,
        leadSourceOther: leadSourceOther?.trim() || null,
        bookingTimeline: bookingTimeline || null,
        requiresBankFinance: requiresBankFinance || "Unknown",
        hasClientSignature: Boolean(hasClientSignature),
        signatureReference: signatureReference || null,
        officeDate: officeDate?.trim() || null,
        officeTime: officeTime?.trim() || null,
        allocatedTo: allocatedTo?.trim() || null,
        attendedBy: attendedBy?.trim() || null,
        officeRemarks: officeRemarks?.trim() || null,
        enquiryDate: enquiryDate?.trim() || null,
        reviewedBy: reviewer,
        confirmedAt,
        crmSyncStatus: "PENDING", // Ready for CRM synchronization
      },
    });

    // 2. Synchronize to CRM via durable adapter
    const crmResult = await syncEnquiryToCrm(id, reviewer);

    // Fetch refreshed record with latest sync status
    const refreshed = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        syncLogs: {
          orderBy: { attemptedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      message: crmResult.success
        ? "Enquiry confirmed and synced to CRM successfully."
        : "Enquiry confirmed locally, but CRM synchronization failed. You can retry anytime.",
      enquiry: refreshed,
      crmSyncResult: crmResult,
    });
  } catch (error: any) {
    console.error("[API POST /api/enquiries/[id]/confirm error]", error);
    return NextResponse.json(
      { error: "Confirmation processing failed", details: error.message },
      { status: 500 }
    );
  }
}
