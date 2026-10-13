/**
 * Language Translation Service
 * Uses Sarvam AI Translation API to translate non-English text to English.
 * Supports Marathi, Hindi, Gujarati, Tamil, Telugu, Kannada, Bengali, and auto-detected Indian languages.
 */

const SARVAM_BASE_URL = "https://api.sarvam.ai";

/**
 * Check if a string contains non-English / non-ASCII characters
 * (e.g. Devanagari, Gujarati, Bengali, etc.)
 */
export function containsNonEnglish(text: string): boolean {
  if (!text) return false;
  // Match any non-ASCII character (including Devanagari \u0900-\u097F, etc.)
  return /[^\x00-\x7F]/.test(text);
}

/**
 * Translate a single text string to English using Sarvam AI
 */
export async function translateTextToEnglish(text: string): Promise<string> {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";

  // If text is already strictly English/ASCII, return as-is
  if (!containsNonEnglish(trimmed)) {
    return trimmed;
  }

  const apiKey =
    process.env.SARVAM_API_KEY || "sk_03mty6as_VULONdGTCeAGnuqtBO4IqlSx";

  try {
    const response = await fetch(`${SARVAM_BASE_URL}/translate`, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: trimmed,
        source_language_code: "auto",
        target_language_code: "en-IN",
        mode: "formal",
      }),
    });

    if (!response.ok) {
      console.warn(
        `[Sarvam Translate API] Status ${response.status}: ${response.statusText}`
      );
      return trimmed;
    }

    const data = await response.json();
    if (data.translated_text) {
      // Remove trailing period if original didn't have one
      let result = String(data.translated_text).trim();
      if (!trimmed.endsWith(".") && result.endsWith(".")) {
        result = result.slice(0, -1);
      }
      return result;
    }
    return trimmed;
  } catch (err) {
    console.warn("[Sarvam Translate Error]", err);
    return trimmed;
  }
}

/**
 * Translate all text fields in an extracted enquiry object to English
 */
export async function translateEnquiryDataToEnglish(
  data: Record<string, any>
): Promise<Record<string, any>> {
  const fieldsToTranslate = [
    "customerName",
    "occupation",
    "occupationOther",
    "companyName",
    "designation",
    "address",
    "leadSource",
    "leadSourceOther",
    "bookingTimeline",
    "allocatedTo",
    "attendedBy",
    "officeRemarks",
  ];

  const translated = { ...data };

  await Promise.all(
    fieldsToTranslate.map(async (field) => {
      const val = translated[field];
      if (typeof val === "string" && containsNonEnglish(val)) {
        translated[field] = await translateTextToEnglish(val);
      }
    })
  );

  return translated;
}
