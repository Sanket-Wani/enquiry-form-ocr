import { readDocumentFile } from "@/lib/storage";
import { applyAutoCorrectionRules, FieldCorrection } from "@/services/autoCorrection";

const SARVAM_BASE_URL = "https://api.sarvam.ai";

export interface NormalizedEnquiryData {
  enquiryDate?: string;
  leadId?: string;
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
  requiresBankFinance: "Yes" | "No" | "Unknown";
  hasClientSignature: boolean;
  signatureReference?: string;
  officeDate?: string;
  officeTime?: string;
  allocatedTo?: string;
  attendedBy?: string;
  officeRemarks?: string;

  // Metadata
  confidenceMap: Record<string, number>;
  sourceMap: Record<string, any[]>;
  isMockExtraction?: boolean;
  corrections?: FieldCorrection[];
}

export interface SarvamExtractResponse {
  job_id: string;
  status: string;
  run_id?: string;
}

export interface SarvamStatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "partially_completed" | "failed" | "rejected";
  pipeline: string;
  usage?: {
    pages_total?: number;
    pages_processed?: number;
    pages_succeeded?: number;
    pages_failed?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface SarvamResultsResponse {
  type: string;
  job_id: string;
  status: "completed" | "partially_completed" | "failed" | "rejected";
  result: Record<string, any>;
  annotations: Record<
    string,
    {
      confidence?: number;
      sources?: Array<{
        document_id?: string;
        filename?: string;
        page_num?: number;
        box?: number[];
      }>;
    }
  >;
  version?: number;
}

export const ENQUIRY_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    enquiry_date: {
      type: "string",
      description:
        "Date written at top right next to 'Date:'. Format YYYY-MM-DD or DD/MM/YYYY. Leave empty string if blank. Do not invent missing values.",
    },
    lead_id: {
      type: "string",
      description:
        "Lead ID written after 'Lead ID'. Leave empty string if blank. Preserve existing Lead ID found on form.",
    },
    customer_name: {
      type: "string",
      description:
        "Customer full name handwritten next to '1 Name:'. Preserve handwritten letters accurately. Ignore red handwritten number '1' and asterisk.",
    },
    contact_number: {
      type: "string",
      description:
        "Customer contact/mobile number next to '2 Contact Number:'. Must be string, preserve all digits exactly without alteration. Ignore red number '2' and asterisk.",
    },
    email_id: {
      type: "string",
      description:
        "Customer email address next to '3 Email Id:'. Preserve exact characters. Leave empty string if blank.",
    },
    occupation: {
      type: "string",
      enum: ["Self Employed", "Salaried", "Professional", "Other"],
      description:
        "Occupation selected among checkboxes next to '4 Occupation:'. Interpret checked boxes conservatively. Leave empty string if none checked.",
    },
    occupation_other: {
      type: "string",
      description:
        "Specification next to 'Other:' in occupation section if Other is chosen. Leave empty string if none.",
    },
    company_name: {
      type: "string",
      description:
        "Company name handwritten next to '5 Company Name:'. Leave empty string if blank.",
    },
    designation: {
      type: "string",
      description:
        "Designation or title handwritten next to 'Designation:'. Leave empty string if blank.",
    },
    address: {
      type: "string",
      description:
        "Customer address handwritten next to '6 Address:' or 'Client Address:'. Preserve multiple lines if present. Leave empty string if blank.",
    },
    lead_source: {
      type: "string",
      enum: ["Newspaper", "Website", "Referral", "Hoardings", "Channel Partner", "Other"],
      description:
        "Selection for '7 How did you come to know about our project?'. Checkbox options: Newspaper, Website, Referral, Hoardings, Channel Partner, Other. Leave empty string if none selected.",
    },
    lead_source_other: {
      type: "string",
      description:
        "Specification next to 'F) Others' if selected. Leave empty string if blank.",
    },
    booking_timeline: {
      type: "string",
      enum: ["Now", "Within a week", "Within a month", "After a month or more"],
      description:
        "Selection under 'I would like to book:'. Checkbox options: Now, Within a week, Within a month, After a month or more. Note: red cross-out or pen marks are annotations, interpret customer checked box conservatively. Leave empty string if none.",
    },
    requires_bank_finance: {
      type: "string",
      enum: ["Yes", "No", "Unknown"],
      description:
        "Answer to '9 Are you looking for any Financial Assistance from Bank?': Yes, No, or Unknown if unchecked or ambiguous. Do not treat unchecked box as definite No.",
    },
    has_client_signature: {
      type: "boolean",
      description:
        "True if a handwritten client signature or mark is present on the 'Client Signature:' line; false if the line is blank. Do not treat a signature as ordinary text.",
    },
    office_date: {
      type: "string",
      description:
        "Date written inside 'OFFICE USE ONLY' section. Keep empty if not present on document. Do NOT substitute current or processing timestamps.",
    },
    office_time: {
      type: "string",
      description:
        "Time written inside 'OFFICE USE ONLY' section. Keep empty if not present on document.",
    },
    allocated_to: {
      type: "string",
      description:
        "Employee name written next to 'Allocated to:' in OFFICE USE ONLY section. Keep empty if blank.",
    },
    attended_by: {
      type: "string",
      description:
        "Employee name written next to 'Attended by:' in OFFICE USE ONLY section. Keep empty if blank.",
    },
    office_remarks: {
      type: "string",
      description:
        "Remarks written next to 'Remarks:' in OFFICE USE ONLY section. Keep empty if blank.",
    },
  },
};

/**
 * Check if live Sarvam API credentials are configured
 */
export function isSarvamConfigured(): boolean {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  return Boolean(apiKey && apiKey.length > 5 && apiKey !== "your_sarvam_api_subscription_key_here");
}

/**
 * Submit an extraction job to Sarvam DocAI
 * Follows POST https://api.sarvam.ai/doc-ai/v1/job/extract
 */
export async function submitExtractionJob(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<SarvamExtractResponse> {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  const configId = process.env.SARVAM_CONFIG_ID?.trim();

  // If live credentials are not configured, return a mock job ID for local testing fixture
  if (!isSarvamConfigured()) {
    console.log("[Sarvam Service] No valid SARVAM_API_KEY configured. Using local fixture mode.");
    return {
      job_id: `fixture_job_${Date.now()}`,
      status: "pending",
      run_id: `fixture_run_${Date.now()}`,
    };
  }

  const formData = new FormData();
  // Sarvam API requires Blob/File for 'file'
  const fileBlob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append("file", fileBlob, fileName);
  formData.append("output_format", "json");

  // Exactly one of config_id and schema must be provided
  if (configId) {
    formData.append("config_id", configId);
  } else {
    formData.append("schema", JSON.stringify(ENQUIRY_EXTRACTION_SCHEMA));
  }

  const response = await fetch(`${SARVAM_BASE_URL}/doc-ai/v1/job/extract`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey!,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(
      `Sarvam DocAI API error (${response.status} ${response.statusText}): ${errorDetail}`
    );
  }

  const data = (await response.json()) as SarvamExtractResponse;
  return data;
}

/**
 * Check status of a Sarvam DocAI extraction job
 * Follows GET https://api.sarvam.ai/doc-ai/v1/job/{job_id}/status
 */
export async function getJobStatus(jobId: string): Promise<SarvamStatusResponse> {
  // If it's a fixture job ID
  if (jobId.startsWith("fixture_job_")) {
    return {
      job_id: jobId,
      status: "completed",
      pipeline: "extract",
      usage: { pages_total: 1, pages_processed: 1, pages_succeeded: 1, pages_failed: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY is not configured.");
  }

  const response = await fetch(`${SARVAM_BASE_URL}/doc-ai/v1/job/${jobId}/status`, {
    method: "GET",
    headers: {
      "api-subscription-key": apiKey,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to check Sarvam job status (${response.status}): ${errText}`);
  }

  return (await response.json()) as SarvamStatusResponse;
}

/**
 * Fetch results for a terminal Sarvam DocAI job
 * Follows GET https://api.sarvam.ai/doc-ai/v1/job/{job_id}/results?format=json
 */
export async function getJobResults(jobId: string): Promise<SarvamResultsResponse> {
  // If it's a fixture job ID, return realistic fixture extraction based on Vishal Chugera Enquiry Form
  if (jobId.startsWith("fixture_job_")) {
    return generateFixtureResults(jobId);
  }

  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY is not configured.");
  }

  const response = await fetch(`${SARVAM_BASE_URL}/doc-ai/v1/job/${jobId}/results?format=json`, {
    method: "GET",
    headers: {
      "api-subscription-key": apiKey,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch Sarvam job results (${response.status}): ${errText}`);
  }

  return (await response.json()) as SarvamResultsResponse;
}

/**
 * Poll Sarvam DocAI extraction job until terminal status is reached
 */
export async function pollJobUntilComplete(
  jobId: string,
  maxWaitMs = 90000,
  intervalMs = 2500
): Promise<SarvamResultsResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const statusRes = await getJobStatus(jobId);

    if (
      statusRes.status === "completed" ||
      statusRes.status === "partially_completed"
    ) {
      return await getJobResults(jobId);
    }

    if (statusRes.status === "failed" || statusRes.status === "rejected") {
      throw new Error(`Sarvam DocAI extraction job ended with status '${statusRes.status}'.`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Sarvam DocAI extraction job timed out after ${maxWaitMs / 1000} seconds.`);
}

/**
 * Normalize raw Sarvam DocAI extraction response into canonical enquiry fields
 */
export function normalizeExtractionResponse(
  rawResults: SarvamResultsResponse,
  isMock = false
): NormalizedEnquiryData {
  const r = rawResults.result || {};
  const a = rawResults.annotations || {};

  const confidenceMap: Record<string, number> = {};
  const sourceMap: Record<string, any[]> = {};

  for (const [key, ann] of Object.entries(a)) {
    if (ann && typeof ann === "object") {
      if (typeof ann.confidence === "number") {
        confidenceMap[key] = ann.confidence;
      }
      if (Array.isArray(ann.sources)) {
        sourceMap[key] = ann.sources;
      }
    }
  }

  // Helper to safely extract string
  const str = (v: any): string => {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  };

  // Helper to normalize phone number: strictly string, preserve digits
  const normPhone = (v: any): string => {
    const raw = str(v);
    // Remove non-digit except '+' at beginning
    return raw.replace(/(?!^\+)[^\d]/g, "");
  };

  // Helper for bank finance: Yes, No, Unknown
  const normBankFinance = (v: any): "Yes" | "No" | "Unknown" => {
    const s = str(v).toLowerCase();
    if (s === "yes" || s === "true") return "Yes";
    if (s === "no" || s === "false") return "No";
    return "Unknown";
  };

  // Extract raw string values from Sarvam
  const rawValues = {
    enquiryDate: str(r.enquiry_date),
    leadId: str(r.lead_id),
    customerName: str(r.customer_name),
    contactNumber: normPhone(r.contact_number),
    emailId: str(r.email_id),
    occupation: str(r.occupation),
    occupationOther: str(r.occupation_other),
    companyName: str(r.company_name),
    designation: str(r.designation),
    address: str(r.address),
    leadSource: str(r.lead_source),
    leadSourceOther: str(r.lead_source_other),
    bookingTimeline: str(r.booking_timeline),
    requiresBankFinance: normBankFinance(r.requires_bank_finance),
    hasClientSignature: Boolean(r.has_client_signature),
    signatureReference: r.has_client_signature ? "Detected on Client Signature line" : "",
    officeDate: str(r.office_date),
    officeTime: str(r.office_time),
    allocatedTo: str(r.allocated_to),
    attendedBy: str(r.attended_by),
    officeRemarks: str(r.office_remarks),
  };

  // Run through intelligent auto-correction & auto-form-filling rules
  const autoCorrected = applyAutoCorrectionRules(rawValues);

  return {
    ...autoCorrected.data,
    confidenceMap,
    sourceMap,
    isMockExtraction: isMock || rawResults.job_id.startsWith("fixture_job_"),
    corrections: autoCorrected.corrections,
  };
}

/**
 * Generate a realistic fixture result matching Vishal Chugera Properties enquiry form
 * for development, demonstration, and tests when live credentials are not yet entered.
 */
function generateFixtureResults(jobId: string): SarvamResultsResponse {
  return {
    type: "extract",
    job_id: jobId,
    status: "completed",
    version: 1,
    result: {
      enquiry_date: "", // Note: Date line on sample form is blank ('Date: ___/___/___')
      lead_id: "",      // Blank on sample form ('Lead ID _____________')
      customer_name: "", // Unfilled blank sample form template
      contact_number: "",
      email_id: "",
      occupation: "",
      occupation_other: "",
      company_name: "",
      designation: "",
      address: "",
      lead_source: "",
      lead_source_other: "",
      booking_timeline: "",
      requires_bank_finance: "Unknown", // Checked boxes are blank on fresh form
      has_client_signature: false,
      office_date: "",
      office_time: "",
      allocatedTo: "",
      attended_by: "",
      office_remarks: "",
    },
    annotations: {
      customer_name: { confidence: 0.95, sources: [{ page_num: 1 }] },
      contact_number: { confidence: 0.92, sources: [{ page_num: 1 }] },
      email_id: { confidence: 0.88, sources: [{ page_num: 1 }] },
      occupation: { confidence: 0.85, sources: [{ page_num: 1 }] },
      address: { confidence: 0.90, sources: [{ page_num: 1 }] },
      lead_source: { confidence: 0.82, sources: [{ page_num: 1 }] },
      booking_timeline: { confidence: 0.70, sources: [{ page_num: 1 }] },
      requires_bank_finance: { confidence: 0.75, sources: [{ page_num: 1 }] },
      has_client_signature: { confidence: 0.98, sources: [{ page_num: 1 }] },
    },
  };
}
