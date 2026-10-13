import { prisma } from "@/lib/prisma";
import { CrmLeadPayload, CrmSyncResult } from "./types";
import crypto from "crypto";

/**
 * Generate a deterministic idempotency key for CRM synchronization
 */
export function generateIdempotencyKey(enquiryId: string, confirmedAt?: Date | string | null): string {
  const ts = confirmedAt ? new Date(confirmedAt).toISOString() : "draft";
  return crypto.createHash("sha256").update(`${enquiryId}-${ts}`).digest("hex");
}

/**
 * Sync confirmed enquiry to CRM using the configured CRM adapter
 */
export async function syncEnquiryToCrm(
  enquiryId: string,
  reviewerId?: string
): Promise<CrmSyncResult> {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: {
      syncLogs: {
        orderBy: { attemptedAt: "desc" },
      },
    },
  });

  if (!enquiry) {
    throw new Error(`Enquiry record ${enquiryId} not found.`);
  }

  // Generate unique idempotency key
  const idempotencyKey = generateIdempotencyKey(enquiry.id, enquiry.confirmedAt);

  // Check if an earlier attempt succeeded with this exact idempotency key
  const existingSuccess = enquiry.syncLogs.find(
    (log) => log.idempotencyKey === idempotencyKey && log.status === "SUCCESS"
  );

  if (existingSuccess && enquiry.crmRecordId) {
    return {
      success: true,
      status: "SYNCED",
      crmRecordId: enquiry.crmRecordId,
      rawResponse: existingSuccess.responsePayload
        ? JSON.parse(existingSuccess.responsePayload)
        : undefined,
    };
  }

  // Count prior attempts
  const attemptNumber = enquiry.syncLogs.length + 1;

  // Build canonical CRM Lead payload
  const payload: CrmLeadPayload = {
    enquiryRecordId: enquiry.id,
    leadId: enquiry.leadId || undefined,
    customerName: enquiry.customerName,
    contactNumber: enquiry.contactNumber,
    emailId: enquiry.emailId || undefined,
    occupation: enquiry.occupation || undefined,
    occupationOther: enquiry.occupationOther || undefined,
    companyName: enquiry.companyName || undefined,
    designation: enquiry.designation || undefined,
    address: enquiry.address || undefined,
    leadSource: enquiry.leadSource || undefined,
    leadSourceOther: enquiry.leadSourceOther || undefined,
    bookingTimeline: enquiry.bookingTimeline || undefined,
    requiresBankFinance: enquiry.requiresBankFinance || "Unknown",
    hasClientSignature: enquiry.hasClientSignature,
    signatureReference: enquiry.signatureReference || undefined,
    officeDate: enquiry.officeDate || undefined,
    officeTime: enquiry.officeTime || undefined,
    officeAllocatedTo: enquiry.allocatedTo || undefined,
    officeAttendedBy: enquiry.attendedBy || undefined,
    officeRemarks: enquiry.officeRemarks || undefined,
    enquiryDate: enquiry.enquiryDate || undefined,
    confirmedAt: enquiry.confirmedAt ? enquiry.confirmedAt.toISOString() : new Date().toISOString(),
    reviewedBy: reviewerId || enquiry.reviewedBy || undefined,
  };

  const crmType = (process.env.CRM_TYPE || "mock").toLowerCase();
  const endpointUrl = process.env.CRM_ENDPOINT_URL?.trim();
  const apiKey = process.env.CRM_API_KEY?.trim();

  let syncResult: CrmSyncResult;

  try {
    if (crmType === "webhook" || crmType === "rest") {
      if (!endpointUrl) {
        throw new Error(`CRM_ENDPOINT_URL is not configured for CRM_TYPE='${crmType}'.`);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
        headers["X-API-Key"] = apiKey;
      }

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`CRM endpoint returned HTTP ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json().catch(() => ({}));
      const crmRecordId =
        responseData.id ||
        responseData.lead_id ||
        responseData.record_id ||
        `CRM-${Date.now().toString().slice(-6)}`;

      syncResult = {
        success: true,
        status: "SYNCED",
        crmRecordId: String(crmRecordId),
        rawResponse: responseData,
      };
    } else {
      // Mock CRM Adapter (Simulated Vishal Chugera Real Estate CRM)
      // Simulates real CRM behavior, response IDs, and error recovery
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network latency

      const syntheticCrmId = `VCP-CRM-${Math.floor(100000 + Math.random() * 900000)}`;

      syncResult = {
        success: true,
        status: "SYNCED",
        crmRecordId: syntheticCrmId,
        rawResponse: {
          status: "created",
          crm_id: syntheticCrmId,
          timestamp: new Date().toISOString(),
          assigned_agent: payload.officeAllocatedTo || "Unassigned",
          project: "Collector N.A. Plots",
        },
      };
    }
  } catch (err: any) {
    syncResult = {
      success: false,
      status: "FAILED",
      error: err.message || "Failed to communicate with CRM server.",
    };
  }

  // Persist attempt in CrmSyncLog (Outbox / Audit Trail)
  await prisma.crmSyncLog.create({
    data: {
      enquiryId: enquiry.id,
      idempotencyKey,
      attemptNumber,
      status: syncResult.success ? "SUCCESS" : "FAILED",
      requestPayload: JSON.stringify(payload),
      responsePayload: syncResult.rawResponse ? JSON.stringify(syncResult.rawResponse) : undefined,
      errorMessage: syncResult.error,
    },
  });

  // Update Enquiry record
  if (syncResult.success) {
    await prisma.enquiry.update({
      where: { id: enquiry.id },
      data: {
        crmSyncStatus: "SYNCED",
        crmRecordId: syncResult.crmRecordId,
        crmSyncError: null,
        crmSyncedAt: new Date(),
      },
    });
  } else {
    await prisma.enquiry.update({
      where: { id: enquiry.id },
      data: {
        crmSyncStatus: "FAILED",
        crmSyncError: syncResult.error,
      },
    });
  }

  return syncResult;
}
