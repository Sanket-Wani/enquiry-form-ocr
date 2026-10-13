import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveDocumentFile } from "@/lib/storage";
import fs from "fs";
import path from "path";

// POST /api/sample-form - Quick test button loads the physical enquiry form image
export async function POST() {
  try {
    const samplePath = path.join(process.cwd(), "public", "sample-form.png");
    if (!fs.existsSync(samplePath)) {
      return NextResponse.json(
        { error: "Sample enquiry form not found on server." },
        { status: 404 }
      );
    }

    const buffer = await fs.promises.readFile(samplePath);
    const saved = await saveDocumentFile(buffer, "vishal-chugera-enquiry-form.png", "image/png");

    const enquiry = await prisma.enquiry.create({
      data: {
        status: "DRAFT",
        crmSyncStatus: "NOT_SYNCED",
        originalDocumentPath: saved.relativePath,
        originalDocumentName: "vishal-chugera-enquiry-form.png",
        originalDocumentMime: "image/png",
        originalDocumentSize: saved.sizeBytes,
      },
    });

    return NextResponse.json({
      message: "Sample Vishal Chugera enquiry form loaded successfully.",
      enquiry,
    });
  } catch (error: any) {
    console.error("[API POST /api/sample-form error]", error);
    return NextResponse.json(
      { error: "Failed to load sample form", details: error.message },
      { status: 500 }
    );
  }
}
