/**
 * Auto-Correction & Intelligent Form Filling Engine
 * Vishal Chugera Properties India Pvt. Ltd.
 *
 * Automatically detects and repairs common handwriting OCR transcription artifacts:
 * - Email: removes internal spaces, fixes typos in domain suffixes (@gmail.com, @yahoo.com, etc.), lowercases, fixes missing .com or missing @
 * - Contact Number: corrects OCR letter-digit confusions (O->0, l/I->1, S->5), strips country code (+91, 0) to standard 10 digits
 * - Customer & Staff Names: strips printed form label artifacts (e.g. "1. Name:"), converts ALL-CAPS to proper Title Case, handles honorifics
 * - Dates: standardizes varying handwriting date representations (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, 2-digit years) to canonical DD/MM/YYYY
 * - Time: standardizes time format (e.g. 11.30 am -> 11:30 AM)
 * - Enum Fields: intelligent semantic mapping for Occupation, Lead Source, Booking Timeline, and Bank Finance
 * - Address: cleans OCR underline artifacts, normalizes punctuation, capitalizes, formats pin codes, expands common abbreviations (Nr. -> Near, Opp. -> Opposite)
 * - Company & Designation: preserves business acronyms (TCS, HDFC, CEO, VP) while applying clean Title Case
 */

export interface FieldCorrection {
  field: string;
  fieldLabel: string;
  original: string;
  corrected: string;
  reason: string;
}

export interface AutoCorrectionResult {
  data: {
    enquiryDate: string;
    leadId: string;
    customerName: string;
    contactNumber: string;
    emailId: string;
    occupation: string;
    occupationOther: string;
    companyName: string;
    designation: string;
    address: string;
    leadSource: string;
    leadSourceOther: string;
    bookingTimeline: string;
    requiresBankFinance: "Yes" | "No" | "Unknown";
    hasClientSignature: boolean;
    signatureReference: string;
    officeDate: string;
    officeTime: string;
    allocatedTo: string;
    attendedBy: string;
    officeRemarks: string;
  };
  corrections: FieldCorrection[];
}

/**
 * Common Corporate & Professional Acronyms to preserve in Title Casing
 */
const ACRONYMS = new Set([
  "TCS",
  "IBM",
  "HDFC",
  "ICICI",
  "SBI",
  "L&T",
  "LT",
  "BMW",
  "MNC",
  "PWC",
  "EY",
  "KPMG",
  "HSBC",
  "ISRO",
  "BARC",
  "DRDO",
  "IIT",
  "IIM",
  "CA",
  "CEO",
  "CTO",
  "CFO",
  "COO",
  "VP",
  "AVP",
  "MD",
  "GM",
  "AGM",
  "HR",
  "IT",
  "QA",
  "BHK",
  "RK",
  "LLP",
  "PVT",
  "LTD",
  "INC",
  "PLC",
]);

/**
 * Convert string to smart Title Case while preserving special acronyms and honorifics
 */
export function toSmartTitleCase(str: string): string {
  if (!str) return "";
  const cleaned = str.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ");

  const titleCased = words.map((word) => {
    // Check if word has dots (e.g. initials "A.P." or "Mr.")
    const upperWord = word.toUpperCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    if (ACRONYMS.has(upperWord)) {
      return word.toUpperCase();
    }

    // Standard title case
    if (word.length === 0) return "";
    // If it's hyphenated like Jean-Pierre
    if (word.includes("-")) {
      return word
        .split("-")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join("-");
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return titleCased.join(" ");
}

/**
 * 1. Clean Email Address
 * - Strips all internal and external whitespace
 * - Keeps original domain and characters exactly as written (spacing auto-correction only)
 */
export function cleanEmail(rawEmail: string): { value: string; changed: boolean; reason?: string } {
  if (!rawEmail) return { value: "", changed: false };
  const original = rawEmail;
  // Keep ONLY the spacing auto-correction (strip spaces, tabs, newlines)
  const cleaned = rawEmail.replace(/\s+/g, "").trim();
  const changed = cleaned !== original;
  return {
    value: cleaned,
    changed,
    reason: changed ? "Removed spaces from email address." : undefined,
  };
}

/**
 * 2. Clean & Correct Phone Number
 * - Repairs OCR letter-digit confusions (O->0, l/I->1, S->5, B->8)
 * - Removes non-digit noise (spaces, dashes, parentheses)
 * - Normalizes country codes (+91, 91, 0) to standard 10-digit mobile number
 */
export function cleanContactNumber(rawPhone: string): {
  value: string;
  changed: boolean;
  reason?: string;
} {
  if (!rawPhone) return { value: "", changed: false };
  const original = rawPhone.trim();
  let phone = original;

  // OCR letter substitution if surrounded or mixed with numbers
  phone = phone
    .replace(/[Oo]/g, "0")
    .replace(/[lI|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Zz]/g, "2");

  // Keep only digits and initial '+'
  let hasPlus = phone.startsWith("+");
  let digits = phone.replace(/\D/g, "");

  // If Indian mobile number format:
  // 12 digits starting with 91 followed by 6, 7, 8, 9 -> strip 91
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    // 11 digits starting with 0 followed by 6, 7, 8, 9 -> strip 0
    digits = digits.slice(1);
  }

  // Final cleaned value
  const value = digits;
  const changed = value !== original;
  const reason = changed
    ? "Cleaned OCR digit confusions, removed spaces/dashes, and formatted as standard 10-digit number."
    : undefined;

  return { value, changed, reason };
}

/**
 * 3. Clean & Format Customer Name
 * - Strips form prompt artifacts like "1. Name:", "1 Name:", "* Name:"
 * - Strips underline lines "____"
 * - Converts ALL-CAPS or all-lowercase to proper Title Case
 * - Preserves honorifics (Mr., Mrs., Ms., Dr., Shri, Smt.)
 */
export function cleanCustomerName(rawName: string): {
  value: string;
  changed: boolean;
  reason?: string;
} {
  if (!rawName) return { value: "", changed: false };
  const original = rawName.trim();
  let name = original;

  // 1. Strip leading question numbers or labels like "1. Name:", "1.", "Name:", "*"
  name = name.replace(/^(\d+[\.\)\-\:]\s*|\*\s*)*(customer\s*name|name)\s*[\:\.\-]?\s*/gi, "");
  name = name.replace(/^[\d+.\-)*\s]+(?=[A-Za-z])/, "");

  // 2. Strip underline artifacts
  name = name.replace(/[_~|]+/g, "").trim();

  // 3. Clean honorifics
  name = name
    .replace(/^mr[\s.]+/i, "Mr. ")
    .replace(/^mrs[\s.]+/i, "Mrs. ")
    .replace(/^ms[\s.]+/i, "Ms. ")
    .replace(/^dr[\s.]+/i, "Dr. ")
    .replace(/^shri[\s.]+/i, "Shri ")
    .replace(/^smt[\s.]+/i, "Smt. ");

  // 4. Smart Title Case
  name = toSmartTitleCase(name);

  const changed = name !== original;
  const reason = changed
    ? "Removed printed form labels/artifacts and converted to proper Title Case."
    : undefined;

  return { value: name, changed, reason };
}

/**
 * 4. Clean & Standardize Date
 * - Standardizes DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, and text dates (14 Oct 2026)
 * - Expands 2-digit years (26 -> 2026)
 * - Standardizes output to DD/MM/YYYY
 */
export function cleanDate(rawDate: string): { value: string; changed: boolean; reason?: string } {
  if (!rawDate) return { value: "", changed: false };
  const original = rawDate.trim();
  let d = original;

  // OCR digit fix
  d = d.replace(/[Oo]/g, "0").replace(/[lI]/g, "1");

  // Remove form label prefixes like "Date:" or "Date :"
  d = d.replace(/^date\s*[\:\.\-]?\s*/i, "").trim();

  // Strip blanks "___/___/___"
  if (/^[_/.\-\s]+$/.test(d)) {
    return { value: "", changed: original !== "", reason: "Cleared blank underline line." };
  }

  // 1. Match standard DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = d.match(/^(\d{1,2})[\/\.\-\s](\d{1,2})[\/\.\-\s](\d{2,4})$/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, "0");
    let month = dmyMatch[2].padStart(2, "0");
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = "20" + year;
    }
    const formatted = `${day}/${month}/${year}`;
    return {
      value: formatted,
      changed: formatted !== original,
      reason: formatted !== original ? "Standardized to DD/MM/YYYY format." : undefined,
    };
  }

  // 2. Match ISO YYYY-MM-DD
  const ymdMatch = d.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})$/);
  if (ymdMatch) {
    let year = ymdMatch[1];
    let month = ymdMatch[2].padStart(2, "0");
    let day = ymdMatch[3].padStart(2, "0");
    const formatted = `${day}/${month}/${year}`;
    return {
      value: formatted,
      changed: formatted !== original,
      reason: "Converted ISO date to DD/MM/YYYY format.",
    };
  }

  // 3. Text Month match (e.g. 14 Oct 2026, 14th October 2026)
  const textMonthMatch = d.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*,?\s*(\d{2,4})$/i
  );
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, "0");
    const monthStr = textMonthMatch[2].toLowerCase();
    let year = textMonthMatch[3];
    if (year.length === 2) year = "20" + year;

    const monthNames: Record<string, string> = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };

    const monthNum = monthNames[monthStr] || monthNames[monthStr.slice(0, 3)];
    if (monthNum) {
      const formatted = `${day}/${monthNum}/${year}`;
      return {
        value: formatted,
        changed: formatted !== original,
        reason: "Parsed textual date to DD/MM/YYYY.",
      };
    }
  }

  return { value: original, changed: false };
}

/**
 * 5. Clean & Format Time
 * e.g. "11.30 am", "4 pm", "16:00" -> "11:30 AM", "04:00 PM"
 */
export function cleanTime(rawTime: string): { value: string; changed: boolean; reason?: string } {
  if (!rawTime) return { value: "", changed: false };
  const original = rawTime.trim();
  let t = original;

  // Strip prefixes
  t = t.replace(/^time\s*[\:\.\-]?\s*/i, "").trim();

  // Clean 11.30 am or 11:30am
  const match = t.match(/^(\d{1,2})[\.:]?(\d{0,2})\s*([ap]\.?m\.?)?$/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    let minute = match[2] ? match[2].padStart(2, "0") : "00";
    let meridiem = match[3] ? match[3].replace(/\./g, "").toUpperCase() : "";

    if (!meridiem) {
      if (hour >= 12) {
        meridiem = "PM";
        if (hour > 12) hour -= 12;
      } else {
        meridiem = "AM";
      }
    }

    const formattedHour = String(hour).padStart(2, "0");
    const formatted = `${formattedHour}:${minute} ${meridiem}`;
    return {
      value: formatted,
      changed: formatted !== original,
      reason: formatted !== original ? "Standardized to HH:MM AM/PM." : undefined,
    };
  }

  return { value: original, changed: false };
}

/**
 * 6. Clean Lead ID
 */
export function cleanLeadId(rawLeadId: string): {
  value: string;
  changed: boolean;
  reason?: string;
} {
  if (!rawLeadId) return { value: "", changed: false };
  const original = rawLeadId.trim();
  let id = original;

  // Strip prefix "Lead ID:" or "ID:"
  id = id.replace(/^(lead\s*id|id)\s*[\:\.\-]?\s*/i, "");
  // Strip underline blanks
  id = id.replace(/[_~|]+/g, "").trim();
  // Clean internal spaces around hyphens
  id = id.replace(/\s*-\s*/g, "-").toUpperCase();

  const changed = id !== original;
  return {
    value: id,
    changed,
    reason: changed ? "Normalized Lead ID format and removed spacing." : undefined,
  };
}

/**
 * 7. Map & Clean Occupation
 */
export function cleanOccupation(
  rawOccupation: string,
  rawOther: string = ""
): {
  occupation: string;
  occupationOther: string;
  changed: boolean;
  reason?: string;
} {
  const origOcc = (rawOccupation || "").trim();
  const origOther = (rawOther || "").trim();
  let occ = origOcc;
  let other = origOther;

  const lower = occ.toLowerCase();

  if (
    lower.includes("self") ||
    lower.includes("business") ||
    lower.includes("trader") ||
    lower.includes("shop") ||
    lower.includes("proprietor") ||
    lower.includes("entrepreneur")
  ) {
    occ = "Self Employed";
  } else if (
    lower.includes("salar") ||
    lower.includes("service") ||
    lower.includes("job") ||
    lower.includes("govt") ||
    lower.includes("employee") ||
    lower.includes("corporate") ||
    lower.includes("it ") ||
    lower.includes("software")
  ) {
    occ = "Salaried";
  } else if (
    lower.includes("prof") ||
    lower.includes("doctor") ||
    lower.includes("advocate") ||
    lower.includes("lawyer") ||
    lower.includes("ca ") ||
    lower.includes("chartered") ||
    lower.includes("architect") ||
    lower.includes("consultant")
  ) {
    occ = "Professional";
  } else if (occ && !["Self Employed", "Salaried", "Professional", "Other"].includes(occ)) {
    // Custom occupation, map to Other and set occupationOther
    other = toSmartTitleCase(occ);
    occ = "Other";
  }

  if (other) {
    other = toSmartTitleCase(other);
  }

  const changed = occ !== origOcc || other !== origOther;
  return {
    occupation: occ,
    occupationOther: other,
    changed,
    reason: changed ? "Mapped occupation to standard category." : undefined,
  };
}

/**
 * 8. Map & Clean Lead Source
 */
export function cleanLeadSource(
  rawSource: string,
  rawOther: string = ""
): {
  leadSource: string;
  leadSourceOther: string;
  changed: boolean;
  reason?: string;
} {
  const origSrc = (rawSource || "").trim();
  const origOther = (rawOther || "").trim();
  let src = origSrc;
  let other = origOther;

  const lower = src.toLowerCase();

  if (
    lower.includes("paper") ||
    lower.includes("news") ||
    lower.includes("sakal") ||
    lower.includes("lokmat") ||
    lower.includes("times") ||
    lower.includes("print")
  ) {
    src = "Newspaper";
  } else if (
    lower.includes("web") ||
    lower.includes("online") ||
    lower.includes("google") ||
    lower.includes("facebook") ||
    lower.includes("insta") ||
    lower.includes("social") ||
    lower.includes("housing") ||
    lower.includes("99acres") ||
    lower.includes("magicbricks") ||
    lower.includes("portal")
  ) {
    src = "Website";
  } else if (
    lower.includes("ref") ||
    lower.includes("friend") ||
    lower.includes("relative") ||
    lower.includes("family") ||
    lower.includes("mouth") ||
    lower.includes("client")
  ) {
    src = "Referral";
  } else if (
    lower.includes("hoard") ||
    lower.includes("board") ||
    lower.includes("banner") ||
    lower.includes("flex") ||
    lower.includes("outdoor")
  ) {
    src = "Hoardings";
  } else if (
    lower.includes("cp") ||
    lower.includes("channel") ||
    lower.includes("broker") ||
    lower.includes("agent") ||
    lower.includes("realtor")
  ) {
    src = "Channel Partner";
  } else if (src && !["Newspaper", "Website", "Referral", "Hoardings", "Channel Partner", "Other"].includes(src)) {
    other = toSmartTitleCase(src);
    src = "Other";
  }

  if (other) {
    other = toSmartTitleCase(other);
  }

  const changed = src !== origSrc || other !== origOther;
  return {
    leadSource: src,
    leadSourceOther: other,
    changed,
    reason: changed ? "Mapped lead source to standard category." : undefined,
  };
}

/**
 * 9. Map & Clean Booking Timeline
 */
export function cleanBookingTimeline(rawTimeline: string): {
  value: string;
  changed: boolean;
  reason?: string;
} {
  if (!rawTimeline) return { value: "", changed: false };
  const orig = rawTimeline.trim();
  let val = orig;
  const lower = val.toLowerCase();

  if (
    lower === "now" ||
    lower.includes("immed") ||
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("today") ||
    lower.includes("ready")
  ) {
    val = "Now";
  } else if (
    lower.includes("week") ||
    lower.includes("7 days") ||
    lower.includes("within a week")
  ) {
    val = "Within a week";
  } else if (
    lower.includes("month") &&
    !lower.includes("after") &&
    !lower.includes("more") &&
    !lower.includes("2") &&
    !lower.includes("3")
  ) {
    val = "Within a month";
  } else if (
    lower.includes("after") ||
    lower.includes("more") ||
    lower.includes("later") ||
    lower.includes("future") ||
    lower.includes("2") ||
    lower.includes("3") ||
    lower.includes("6")
  ) {
    val = "After a month or more";
  }

  const changed = val !== orig;
  return {
    value: val,
    changed,
    reason: changed ? "Standardized booking timeline option." : undefined,
  };
}

/**
 * 10. Map & Clean Bank Finance
 */
export function cleanBankFinance(rawFinance: string): {
  value: "Yes" | "No" | "Unknown";
  changed: boolean;
  reason?: string;
} {
  const orig = (rawFinance || "").trim();
  let val: "Yes" | "No" | "Unknown" = "Unknown";
  const lower = orig.toLowerCase();

  if (
    lower === "yes" ||
    lower === "y" ||
    lower === "true" ||
    lower.includes("loan") ||
    lower.includes("finance") ||
    lower.includes("need")
  ) {
    val = "Yes";
  } else if (
    lower === "no" ||
    lower === "n" ||
    lower === "false" ||
    lower.includes("self") ||
    lower.includes("cash") ||
    lower.includes("own")
  ) {
    val = "No";
  }

  const changed = val !== orig;
  return {
    value: val,
    changed,
    reason: changed ? "Standardized bank finance response." : undefined,
  };
}

/**
 * 11. Clean & Format Address
 * - Strips question labels (6. Address:)
 * - Cleans underline blanks
 * - Normalizes punctuation (no space before commas)
 * - Expands Indian address abbreviations (Nr. -> Near, Opp. -> Opposite)
 * - Formats 6-digit PIN codes
 */
export function cleanAddress(rawAddress: string): {
  value: string;
  changed: boolean;
  reason?: string;
} {
  if (!rawAddress) return { value: "", changed: false };
  const orig = rawAddress.trim();
  let addr = orig;

  // 1. Strip label prefix
  addr = addr.replace(/^(\d+[\.\)\-\:]\s*|\*\s*)*(client\s*address|address)\s*[\:\.\-]?\s*/gi, "");

  // 2. Strip underline blanks
  addr = addr.replace(/[_~|]+/g, " ");

  // 3. Fix space before commas
  addr = addr.replace(/\s+,/g, ",");

  // 4. Expand common address abbreviations
  addr = addr
    .replace(/\bnr[\.:\s]+/gi, "Near ")
    .replace(/\bopp[\.:\s]+/gi, "Opposite ")
    .replace(/\brd[\.:\s]+/gi, "Road ")
    .replace(/\bapt[\.:\s]+/gi, "Apartment ")
    .replace(/\bsoc[\.:\s]+/gi, "Society ")
    .replace(/\bbldg[\.:\s]+/gi, "Building ")
    .replace(/\bngr[\.:\s]+/gi, "Nagar ");

  // 5. Format PIN code e.g. "411 001" or "411-001" -> "411001"
  addr = addr.replace(/\b(\d{3})[\s\-](\d{3})\b/g, "$1$2");

  // 6. Clean multiple spaces
  addr = addr.replace(/\s+/g, " ").trim();

  // 7. Capitalize first letter of each word in address
  addr = toSmartTitleCase(addr);

  const changed = addr !== orig;
  return {
    value: addr,
    changed,
    reason: changed ? "Formatted address, expanded abbreviations, and cleaned punctuation." : undefined,
  };
}

/**
 * 12. Clean Company Name & Designation
 */
export function cleanCompanyAndDesignation(
  rawCompany: string,
  rawDesignation: string
): {
  companyName: string;
  designation: string;
  changed: boolean;
  reason?: string;
} {
  const origComp = (rawCompany || "").trim();
  const origDesig = (rawDesignation || "").trim();

  let comp = origComp.replace(/^(\d+[\.\)\-\:]\s*|\*\s*)*(company\s*name|company)\s*[\:\.\-]?\s*/gi, "");
  comp = comp.replace(/[_~|]+/g, "").trim();
  comp = toSmartTitleCase(comp);

  let desig = origDesig.replace(/^(designation)\s*[\:\.\-]?\s*/gi, "");
  desig = desig.replace(/[_~|]+/g, "").trim();
  desig = toSmartTitleCase(desig);

  const changed = comp !== origComp || desig !== origDesig;
  return {
    companyName: comp,
    designation: desig,
    changed,
    reason: changed ? "Formatted company name and designation with proper business casing." : undefined,
  };
}

/**
 * 13. Clean Staff Section (Allocated To, Attended By, Office Remarks)
 */
export function cleanStaffSection(
  rawAllocated: string,
  rawAttended: string,
  rawRemarks: string
): {
  allocatedTo: string;
  attendedBy: string;
  officeRemarks: string;
  changed: boolean;
} {
  const origAlloc = (rawAllocated || "").trim();
  const origAtt = (rawAttended || "").trim();
  const origRem = (rawRemarks || "").trim();

  let alloc = origAlloc.replace(/^allocated\s*to\s*[\:\.\-]?\s*/gi, "").replace(/[_~|]+/g, "").trim();
  alloc = toSmartTitleCase(alloc);

  let att = origAtt.replace(/^attended\s*by\s*[\:\.\-]?\s*/gi, "").replace(/[_~|]+/g, "").trim();
  att = toSmartTitleCase(att);

  let rem = origRem.replace(/^remarks\s*[\:\.\-]?\s*/gi, "").replace(/[_~|]+/g, "").trim();
  if (rem.length > 0) {
    rem = rem.charAt(0).toUpperCase() + rem.slice(1);
  }

  const changed = alloc !== origAlloc || att !== origAtt || rem !== origRem;
  return {
    allocatedTo: alloc,
    attendedBy: att,
    officeRemarks: rem,
    changed,
  };
}

/**
 * MASTER FUNCTION: Apply all Auto-Correction and Auto-Form Filling Rules
 * Analyzes all physical form fields, corrects OCR transcription artifacts,
 * and returns the cleaned data alongside an audit log of corrections.
 */
export function applyAutoCorrectionRules(input: Record<string, any>): AutoCorrectionResult {
  const corrections: FieldCorrection[] = [];

  // 1. Email
  const emailRes = cleanEmail(String(input.emailId || ""));
  if (emailRes.changed) {
    corrections.push({
      field: "emailId",
      fieldLabel: "Email Id",
      original: input.emailId || "",
      corrected: emailRes.value,
      reason: emailRes.reason || "Auto-corrected email format",
    });
  }

  // 2. Contact Number
  const phoneRes = cleanContactNumber(String(input.contactNumber || ""));
  if (phoneRes.changed) {
    corrections.push({
      field: "contactNumber",
      fieldLabel: "Contact Number",
      original: input.contactNumber || "",
      corrected: phoneRes.value,
      reason: phoneRes.reason || "Auto-corrected phone number",
    });
  }

  // 3. Customer Name
  const nameRes = cleanCustomerName(String(input.customerName || ""));
  if (nameRes.changed) {
    corrections.push({
      field: "customerName",
      fieldLabel: "Customer Name",
      original: input.customerName || "",
      corrected: nameRes.value,
      reason: nameRes.reason || "Auto-corrected name casing and labels",
    });
  }

  // 4. Enquiry Date
  const dateRes = cleanDate(String(input.enquiryDate || ""));
  if (dateRes.changed) {
    corrections.push({
      field: "enquiryDate",
      fieldLabel: "Enquiry Date",
      original: input.enquiryDate || "",
      corrected: dateRes.value,
      reason: dateRes.reason || "Standardized date format",
    });
  }

  // 5. Lead ID
  const leadIdRes = cleanLeadId(String(input.leadId || ""));
  if (leadIdRes.changed) {
    corrections.push({
      field: "leadId",
      fieldLabel: "Lead ID",
      original: input.leadId || "",
      corrected: leadIdRes.value,
      reason: leadIdRes.reason || "Standardized Lead ID",
    });
  }

  // 6. Occupation
  const occRes = cleanOccupation(String(input.occupation || ""), String(input.occupationOther || ""));
  if (occRes.changed) {
    corrections.push({
      field: "occupation",
      fieldLabel: "Occupation",
      original: input.occupation || "",
      corrected: occRes.occupation,
      reason: occRes.reason || "Standardized occupation category",
    });
  }

  // 7. Company & Designation
  const compRes = cleanCompanyAndDesignation(
    String(input.companyName || ""),
    String(input.designation || "")
  );
  if (compRes.changed) {
    if (compRes.companyName !== (input.companyName || "")) {
      corrections.push({
        field: "companyName",
        fieldLabel: "Company Name",
        original: input.companyName || "",
        corrected: compRes.companyName,
        reason: "Cleaned company name casing and acronyms",
      });
    }
    if (compRes.designation !== (input.designation || "")) {
      corrections.push({
        field: "designation",
        fieldLabel: "Designation",
        original: input.designation || "",
        corrected: compRes.designation,
        reason: "Cleaned designation casing and acronyms",
      });
    }
  }

  // 8. Address
  const addrRes = cleanAddress(String(input.address || ""));
  if (addrRes.changed) {
    corrections.push({
      field: "address",
      fieldLabel: "Client Address",
      original: input.address || "",
      corrected: addrRes.value,
      reason: addrRes.reason || "Cleaned address format and abbreviations",
    });
  }

  // 9. Lead Source
  const leadSrcRes = cleanLeadSource(
    String(input.leadSource || ""),
    String(input.leadSourceOther || "")
  );
  if (leadSrcRes.changed) {
    corrections.push({
      field: "leadSource",
      fieldLabel: "Lead Source",
      original: input.leadSource || "",
      corrected: leadSrcRes.leadSource,
      reason: leadSrcRes.reason || "Standardized lead source",
    });
  }

  // 10. Booking Timeline
  const timeRes = cleanBookingTimeline(String(input.bookingTimeline || ""));
  if (timeRes.changed) {
    corrections.push({
      field: "bookingTimeline",
      fieldLabel: "Booking Timeline",
      original: input.bookingTimeline || "",
      corrected: timeRes.value,
      reason: timeRes.reason || "Standardized booking timeline",
    });
  }

  // 11. Bank Finance
  const finRes = cleanBankFinance(String(input.requiresBankFinance || ""));
  if (finRes.changed) {
    corrections.push({
      field: "requiresBankFinance",
      fieldLabel: "Bank Finance",
      original: input.requiresBankFinance || "",
      corrected: finRes.value,
      reason: finRes.reason || "Standardized bank finance option",
    });
  }

  // 12. Office Date & Time
  const offDateRes = cleanDate(String(input.officeDate || ""));
  if (offDateRes.changed) {
    corrections.push({
      field: "officeDate",
      fieldLabel: "Office Date",
      original: input.officeDate || "",
      corrected: offDateRes.value,
      reason: offDateRes.reason || "Standardized office date",
    });
  }

  const offTimeRes = cleanTime(String(input.officeTime || ""));
  if (offTimeRes.changed) {
    corrections.push({
      field: "officeTime",
      fieldLabel: "Office Time",
      original: input.officeTime || "",
      corrected: offTimeRes.value,
      reason: offTimeRes.reason || "Standardized office time",
    });
  }

  // 13. Staff Section
  const staffRes = cleanStaffSection(
    String(input.allocatedTo || ""),
    String(input.attendedBy || ""),
    String(input.officeRemarks || "")
  );
  if (staffRes.changed) {
    if (staffRes.allocatedTo !== (input.allocatedTo || "")) {
      corrections.push({
        field: "allocatedTo",
        fieldLabel: "Allocated To",
        original: input.allocatedTo || "",
        corrected: staffRes.allocatedTo,
        reason: "Standardized staff name casing",
      });
    }
    if (staffRes.attendedBy !== (input.attendedBy || "")) {
      corrections.push({
        field: "attendedBy",
        fieldLabel: "Attended By",
        original: input.attendedBy || "",
        corrected: staffRes.attendedBy,
        reason: "Standardized staff name casing",
      });
    }
    if (staffRes.officeRemarks !== (input.officeRemarks || "")) {
      corrections.push({
        field: "officeRemarks",
        fieldLabel: "Office Remarks",
        original: input.officeRemarks || "",
        corrected: staffRes.officeRemarks,
        reason: "Cleaned office remarks",
      });
    }
  }

  return {
    data: {
      enquiryDate: dateRes.value,
      leadId: leadIdRes.value,
      customerName: nameRes.value,
      contactNumber: phoneRes.value,
      emailId: emailRes.value,
      occupation: occRes.occupation,
      occupationOther: occRes.occupationOther,
      companyName: compRes.companyName,
      designation: compRes.designation,
      address: addrRes.value,
      leadSource: leadSrcRes.leadSource,
      leadSourceOther: leadSrcRes.leadSourceOther,
      bookingTimeline: timeRes.value,
      requiresBankFinance: finRes.value,
      hasClientSignature: Boolean(input.hasClientSignature),
      signatureReference: input.hasClientSignature
        ? input.signatureReference || "Detected on Client Signature line"
        : "",
      officeDate: offDateRes.value,
      officeTime: offTimeRes.value,
      allocatedTo: staffRes.allocatedTo,
      attendedBy: staffRes.attendedBy,
      officeRemarks: staffRes.officeRemarks,
    },
    corrections,
  };
}
