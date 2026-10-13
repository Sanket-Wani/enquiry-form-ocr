export interface CrmLeadPayload {
  leadId?: string;
  enquiryRecordId: string;
  customerName: string;
  contactNumber: string;
  emailId?: string;
  occupation?: string;
  occupationOther?: string;
  companyName?: string;
  designation?: string;
  address?: string;
  leadSource?: string;
  leadSourceOther?: string;
  bookingTimeline?: string;
  requiresBankFinance: string;
  hasClientSignature: boolean;
  signatureReference?: string;
  officeDate?: string;
  officeTime?: string;
  officeAllocatedTo?: string;
  officeAttendedBy?: string;
  officeRemarks?: string;
  enquiryDate?: string;
  confirmedAt: string;
  reviewedBy?: string;
}

export interface CrmSyncResult {
  success: boolean;
  crmRecordId?: string;
  error?: string;
  rawResponse?: any;
  status: "SYNCED" | "FAILED";
}
