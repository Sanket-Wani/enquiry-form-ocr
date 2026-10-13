import { prisma } from "@/lib/prisma";

export interface DuplicateMatch {
  id: string;
  customerName: string;
  contactNumber: string;
  leadId: string | null;
  enquiryDate: string | null;
  status: string;
  crmSyncStatus: string;
  createdAt: Date;
  matchReasons: string[];
}

export async function checkDuplicates(
  currentEnquiryId: string,
  contactNumber: string,
  leadId?: string | null,
  emailId?: string | null
): Promise<DuplicateMatch[]> {
  const cleanPhone = contactNumber?.replace(/(?!^\+)[^\d]/g, "").trim();
  const cleanLeadId = leadId?.trim();
  const cleanEmail = emailId?.trim().toLowerCase();

  const conditions: any[] = [];

  if (cleanPhone && cleanPhone.length >= 8) {
    conditions.push({ contactNumber: cleanPhone });
  }

  if (cleanLeadId && cleanLeadId.length > 0) {
    conditions.push({ leadId: cleanLeadId });
  }

  if (cleanEmail && cleanEmail.includes("@")) {
    conditions.push({ emailId: cleanEmail });
  }

  if (conditions.length === 0) {
    return [];
  }

  const matches = await prisma.enquiry.findMany({
    where: {
      id: { not: currentEnquiryId },
      OR: conditions,
    },
    select: {
      id: true,
      customerName: true,
      contactNumber: true,
      leadId: true,
      enquiryDate: true,
      status: true,
      crmSyncStatus: true,
      createdAt: true,
      emailId: true,
    },
    take: 5,
  });

  return matches.map((m) => {
    const reasons: string[] = [];
    if (cleanPhone && m.contactNumber === cleanPhone) {
      reasons.push(`Matching phone number (${cleanPhone})`);
    }
    if (cleanLeadId && m.leadId === cleanLeadId) {
      reasons.push(`Matching Lead ID (${cleanLeadId})`);
    }
    if (cleanEmail && m.emailId?.toLowerCase() === cleanEmail) {
      reasons.push(`Matching Email (${cleanEmail})`);
    }

    return {
      id: m.id,
      customerName: m.customerName,
      contactNumber: m.contactNumber,
      leadId: m.leadId,
      enquiryDate: m.enquiryDate,
      status: m.status,
      crmSyncStatus: m.crmSyncStatus,
      createdAt: m.createdAt,
      matchReasons: reasons,
    };
  });
}
