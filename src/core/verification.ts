import type {
  ApplicationData,
  ExtractedField,
  ExtractedFields,
  Layer1FieldResult,
  Layer2FieldResult,
  VerificationResult,
} from "./schemas.js";

export const REGULATION_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

// Optional trailing proof clause. Per 27 CFR 5.65 spirits may state proof in
// direct conjunction with %ABV; the % is what we parse, proof is decoration.
// Accepts: ' (80 PROOF)', ' 80 PROOF', ' 80° proof.'
const PROOF_TAIL = "(?:\\s+\\(?\\s*\\d+(?:\\.\\d+)?\\s*°?\\s*proof\\.?\\s*\\)?)?";
const ABV_FORMAT = new RegExp(
  `^\\s*(?:alcohol|alc\\.?)\\s*(\\d+(?:\\.\\d+)?)\\s*%\\s*(?:by\\s*)?(?:vol\\.?|volume)?${PROOF_TAIL}\\s*$`,
  "i",
);
// Shorthand covers CFR-compliant variants observed on real labels:
// '13.5% alc/vol', '40% alc./vol.', '40% ALC. BY VOL.', '50% ALC/VOL'.
const ABV_SHORTHAND = new RegExp(
  `^\\s*(\\d+(?:\\.\\d+)?)\\s*%\\s*alc\\.?\\s*(?:\\/|by\\s+)\\s*vol\\.?${PROOF_TAIL}\\s*$`,
  "i",
);

export function parseAbv(text: string): number | null {
  const m1 = ABV_FORMAT.exec(text);
  if (m1?.[1]) return parseFloat(m1[1]);
  const m2 = ABV_SHORTHAND.exec(text);
  if (m2?.[1]) return parseFloat(m2[1]);
  return null;
}

export function abvTolerance(abv: number): number {
  return abv > 14 ? 1.0 : 1.5;
}

export function normalizeBrand(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Strip line-break hyphens ("PREG- NANCY" → "PREGNANCY") and collapse
// whitespace. The canonical warning text has no hyphens, so removing them
// only kills extraction artifacts, not real characters.
function normalizeWarning(text: string): string {
  return text
    .replace(/\s*-+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function checkWarning(field: ExtractedField): Layer1FieldResult {
  const text = field.value;
  if (text === REGULATION_WARNING) {
    return l1("governmentWarning", field, "pass", "Exact match.");
  }
  const startsWithCaps = text.startsWith("GOVERNMENT WARNING:");
  if (!startsWithCaps) {
    return l1(
      "governmentWarning",
      field,
      "fail",
      "Must begin with 'GOVERNMENT WARNING:' in all caps (27 CFR 16.22).",
    );
  }
  if (normalizeWarning(text) === normalizeWarning(REGULATION_WARNING)) {
    return l1(
      "governmentWarning",
      field,
      "pass",
      "Wording matches required text; differs only in case, whitespace, or line-wrap hyphens.",
    );
  }
  return l1(
    "governmentWarning",
    field,
    "fail",
    "Warning text does not match the wording required by 27 CFR 16.21.",
  );
}

function checkRequiredField(
  fieldName: string,
  field: ExtractedField,
): Layer1FieldResult {
  if (field.value.trim() === "") {
    return l1(
      fieldName,
      field,
      "fail",
      `Mandatory field '${fieldName}' is missing on the label.`,
    );
  }
  if (field.confidence === "low") {
    return l1(
      fieldName,
      field,
      "needs_review",
      `Field present but extraction confidence is low; reviewer should confirm.`,
    );
  }
  return l1(fieldName, field, "pass", "Mandatory field present.");
}

function checkAbvFormat(field: ExtractedField): Layer1FieldResult {
  const abv = parseAbv(field.value);
  if (abv === null) {
    return l1(
      "alcoholContent",
      field,
      "fail",
      "Alcohol content does not conform to 27 CFR 4.36 format (e.g., 'Alcohol 13.5% by volume' or '13.5% alc/vol').",
    );
  }
  return l1("alcoholContent", field, "pass", `Parsed as ${abv}% ABV.`);
}

function l1(
  fieldName: string,
  field: ExtractedField,
  verdict: Layer1FieldResult["verdict"],
  message: string,
): Layer1FieldResult {
  return {
    fieldName,
    verdict,
    extractionConfidence: field.confidence,
    extractionConfidenceRaw: field.confidenceRaw,
    message,
    extractedValue: field.value,
  };
}

export function runLayer1(extracted: ExtractedFields): Layer1FieldResult[] {
  return [
    checkRequiredField("brandName", extracted.brandName),
    checkRequiredField("classType", extracted.classType),
    checkAbvFormat(extracted.alcoholContent),
    checkRequiredField("netContents", extracted.netContents),
    checkRequiredField("producerName", extracted.producerName),
    checkRequiredField("producerAddress", extracted.producerAddress),
    checkWarning(extracted.governmentWarning),
  ];
}

function l2(
  fieldName: string,
  verdict: Layer2FieldResult["verdict"],
  message: string,
  extractedValue: string | null,
  applicationValue: string | null,
): Layer2FieldResult {
  return { fieldName, verdict, message, extractedValue, applicationValue };
}

function compareBrand(
  extracted: ExtractedField,
  application: string,
): Layer2FieldResult {
  if (extracted.value === application) {
    return l2(
      "brandName",
      "pass",
      "Exact match with application.",
      extracted.value,
      application,
    );
  }
  if (normalizeBrand(extracted.value) === normalizeBrand(application)) {
    return l2(
      "brandName",
      "pass",
      "Match after case/punctuation normalization (per F-030 tolerant matching).",
      extracted.value,
      application,
    );
  }
  return l2(
    "brandName",
    "fail",
    `Label '${extracted.value}' does not match application '${application}'.`,
    extracted.value,
    application,
  );
}

function compareAbv(
  extracted: ExtractedField,
  application: number,
): Layer2FieldResult {
  const appStr = String(application);
  const labelAbv = parseAbv(extracted.value);
  if (labelAbv === null) {
    return l2(
      "alcoholContent",
      "needs_review",
      "Label alcohol content could not be parsed; defer to reviewer.",
      extracted.value,
      appStr,
    );
  }
  const tol = abvTolerance(application);
  const diff = Math.abs(labelAbv - application);
  if (diff <= tol) {
    return l2(
      "alcoholContent",
      "pass",
      `Label ${labelAbv}% within ±${tol}% of application ${application}% (27 CFR 4.36 wine tolerance).`,
      extracted.value,
      appStr,
    );
  }
  return l2(
    "alcoholContent",
    "fail",
    `Label ${labelAbv}% differs from application ${application}% by ${diff.toFixed(1)}% (exceeds ±${tol}% tolerance).`,
    extracted.value,
    appStr,
  );
}

function compareString(
  fieldName: string,
  extracted: ExtractedField,
  application: string,
  options?: { extractedContainingAppPasses?: boolean },
): Layer2FieldResult {
  const a = extracted.value.trim().toLowerCase();
  const b = application.trim().toLowerCase();
  if (a === b) {
    return l2(
      fieldName,
      "pass",
      "Match with application.",
      extracted.value,
      application,
    );
  }
  // Verbatim Gemini output for some fields wraps the canonical app value
  // in surrounding label text — "PRODUCT OF UKRAINE" contains "Ukraine",
  // "CONTENT 750 ML" contains "750 mL". For fields where this is normal
  // (netContents, countryOfOrigin), treat it as pass when the app value
  // appears at a word boundary in the extracted text. The word boundary
  // keeps "Ukraine" from matching inside "Ukrainian".
  if (options?.extractedContainingAppPasses) {
    const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundary = new RegExp(`\\b${escaped}\\b`);
    if (boundary.test(a)) {
      return l2(
        fieldName,
        "pass",
        `Label '${extracted.value}' contains the application value '${application}' verbatim.`,
        extracted.value,
        application,
      );
    }
  }
  if (a.includes(b) || b.includes(a)) {
    return l2(
      fieldName,
      "needs_review",
      `Label '${extracted.value}' partially matches application '${application}'.`,
      extracted.value,
      application,
    );
  }
  return l2(
    fieldName,
    "fail",
    `Label '${extracted.value}' does not match application '${application}'.`,
    extracted.value,
    application,
  );
}

const LAYER2_FIELDS = [
  "brandName",
  "classType",
  "alcoholContent",
  "netContents",
  "producerName",
  "producerAddress",
  "countryOfOrigin",
] as const;

export function runLayer2(
  extracted: ExtractedFields,
  application: ApplicationData | null,
): Layer2FieldResult[] {
  if (application === null) {
    return LAYER2_FIELDS.map((f) => {
      const ext = layer2ExtractedValueFor(extracted, f);
      return l2(
        f,
        "needs_application_data",
        "Application data not yet provided.",
        ext,
        null,
      );
    });
  }
  const results: Layer2FieldResult[] = [
    compareBrand(extracted.brandName, application.brandName),
    compareString("classType", extracted.classType, application.classType),
    application.alcoholContent !== undefined
      ? compareAbv(extracted.alcoholContent, application.alcoholContent)
      : l2(
          "alcoholContent",
          "needs_application_data",
          "Alcohol content not declared in application.",
          extracted.alcoholContent.value,
          null,
        ),
    compareString("netContents", extracted.netContents, application.netContents, {
      extractedContainingAppPasses: true,
    }),
    compareString("producerName", extracted.producerName, application.producerName),
    compareString(
      "producerAddress",
      extracted.producerAddress,
      application.producerAddress,
    ),
  ];
  if (application.countryOfOrigin === undefined) {
    results.push(
      l2(
        "countryOfOrigin",
        "needs_application_data",
        "Country of origin not declared in application (optional for domestic).",
        extracted.countryOfOrigin?.value ?? null,
        null,
      ),
    );
  } else if (extracted.countryOfOrigin === undefined) {
    results.push(
      l2(
        "countryOfOrigin",
        "needs_review",
        `Application declares country of origin '${application.countryOfOrigin}'; label image does not show this field.`,
        null,
        application.countryOfOrigin,
      ),
    );
  } else {
    results.push(
      compareString(
        "countryOfOrigin",
        extracted.countryOfOrigin,
        application.countryOfOrigin,
        { extractedContainingAppPasses: true },
      ),
    );
  }
  return results;
}

function layer2ExtractedValueFor(
  extracted: ExtractedFields,
  field: (typeof LAYER2_FIELDS)[number],
): string | null {
  switch (field) {
    case "brandName":
      return extracted.brandName.value;
    case "classType":
      return extracted.classType.value;
    case "alcoholContent":
      return extracted.alcoholContent.value;
    case "netContents":
      return extracted.netContents.value;
    case "producerName":
      return extracted.producerName.value;
    case "producerAddress":
      return extracted.producerAddress.value;
    case "countryOfOrigin":
      return extracted.countryOfOrigin?.value ?? null;
  }
}

export function verifyLabel(
  extracted: ExtractedFields,
  application: ApplicationData | null,
): VerificationResult {
  return {
    layer1: runLayer1(extracted),
    layer2: runLayer2(extracted, application),
  };
}
