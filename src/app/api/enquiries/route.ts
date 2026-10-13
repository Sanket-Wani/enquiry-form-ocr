import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveDocumentFile, validateDocumentFile } from "@/lib/storage";

// GET /api/enquiries - Search, filter, paginate, and fetch dashboard counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const crmSyncStatus = searchParams.get("crmSyncStatus")?.trim() || "";
    const leadSource = searchParams.get("leadSource")?.trim() || "";
    const fromDate = searchParams.get("fromDate")?.trim() || "";
    const toDate = searchParams.get("toDate")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { contactNumber: { contains: search } },
        { leadId: { contains: search } },
        { emailId: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (crmSyncStatus && crmSyncStatus !== "ALL") {
      where.crmSyncStatus = crmSyncStatus;
    }

    if (leadSource && leadSource !== "ALL") {
      where.leadSource = leadSource;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        // End of the day
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [enquiries, totalRecords, total, awaitingReview, confirmed, extractionFailed, crmFailed] =
      await Promise.all([
        prisma.enquiry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.enquiry.count({ where }),
        // Real counts for dashboard metrics
        prisma.enquiry.count(),
        prisma.enquiry.count({ where: { status: "AWAITING_REVIEW" } }),
        prisma.enquiry.count({ where: { status: "CONFIRMED" } }),
        prisma.enquiry.count({ where: { status: "EXTRACTION_FAILED" } }),
        prisma.enquiry.count({ where: { crmSyncStatus: "FAILED" } }),
      ]);

    return NextResponse.json({
      enquiries,
      pagination: {
        totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
      counts: {
        total,
        awaitingReview,
        confirmed,
        extractionFailed,
        crmFailed,
      },
    });
  } catch (error: any) {
    console.error("[API GET /api/enquiries error]", error);
    return NextResponse.json(
      { error: "Failed to retrieve enquiries", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/enquiries - Upload enquiry document and create DRAFT enquiry record
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No document file provided. Please select or capture an enquiry form image or PDF." },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const validation = validateDocumentFile(mimeType, file.size);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save document to secure server-side storage
    const savedFile = await saveDocumentFile(buffer, file.name, mimeType);

    // Create enquiry record in DRAFT state
    const enquiry = await prisma.enquiry.create({
      data: {
        status: "DRAFT",
        crmSyncStatus: "NOT_SYNCED",
        originalDocumentPath: savedFile.relativePath,
        originalDocumentName: savedFile.originalName,
        originalDocumentMime: savedFile.mimeType,
        originalDocumentSize: savedFile.sizeBytes,
      },
    });

    return NextResponse.json(
      {
        message: "Enquiry document uploaded successfully.",
        enquiry,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API POST /api/enquiries error]", error);
    return NextResponse.json(
      { error: "Failed to upload enquiry document", details: error.message },
      { status: 500 }
    );
  }
}
