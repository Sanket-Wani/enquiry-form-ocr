import { NextRequest, NextResponse } from "next/server";
import { checkDuplicates } from "@/services/duplicates";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const contactNumber = searchParams.get("contactNumber") || "";
    const leadId = searchParams.get("leadId") || null;
    const emailId = searchParams.get("emailId") || null;

    const duplicates = await checkDuplicates(id, contactNumber, leadId, emailId);

    return NextResponse.json({
      hasDuplicates: duplicates.length > 0,
      duplicates,
    });
  } catch (error: any) {
    console.error("[API GET /api/enquiries/[id]/duplicates error]", error);
    return NextResponse.json(
      { error: "Failed to check duplicates", details: error.message },
      { status: 500 }
    );
  }
}
