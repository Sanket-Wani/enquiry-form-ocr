import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readDocumentFile } from "@/lib/storage";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      select: {
        originalDocumentPath: true,
        originalDocumentName: true,
        originalDocumentMime: true,
      },
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const fileBuffer = await readDocumentFile(enquiry.originalDocumentPath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": enquiry.originalDocumentMime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(enquiry.originalDocumentName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("[API GET /api/documents/[id] error]", error);
    return NextResponse.json(
      { error: "Failed to read document file", details: error.message },
      { status: 500 }
    );
  }
}
