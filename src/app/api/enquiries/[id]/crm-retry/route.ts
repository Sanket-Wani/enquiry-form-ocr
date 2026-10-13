import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncEnquiryToCrm } from "@/services/crm/adapter";

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

    if (enquiry.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only confirmed enquiries can be synchronized with the CRM." },
        { status: 400 }
      );
    }

    // Attempt retry
    const syncResult = await syncEnquiryToCrm(id);

    const refreshed = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        syncLogs: {
          orderBy: { attemptedAt: "desc" },
          take: 3,
        },
      },
    });

    return NextResponse.json({
      message: syncResult.success
        ? "CRM synchronization succeeded."
        : `CRM synchronization retry failed: ${syncResult.error}`,
      enquiry: refreshed,
      crmSyncResult: syncResult,
    });
  } catch (error: any) {
    console.error("[API POST /api/enquiries/[id]/crm-retry error]", error);
    return NextResponse.json(
      { error: "CRM retry failed", details: error.message },
      { status: 500 }
    );
  }
}
