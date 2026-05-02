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

const ABV_FORMAT = /^\s*(?:alcohol|alc\.?)\s*(\d+(?:\.\d+)?)\s*%\s*(?:by\s*)?(?:vol\.?|volume)?\s*$/i;
const ABV_SHORTHAND = /^\s*(\d+(?:\.\d+)?)\s*%\s*alc\s*\/?\s*vol\.?\s*$/i;

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
  if (text.toLowerCase().trim() === REGULATION_WARNING.toLowerCase().trim()) {
    return l1(
      "governmentWarning",
      field,
      "needs_review",
      "Wording matches but exact text differs in punctuation or whitespace.",
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
  if (field.confidence === "low") {
    return l1(
      "alcoholContent",
      field,
      "needs_review",
      `Parsed as ${abv}% but extraction confidence is low.`,
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
): Layer2FieldResult {
  return { fieldName, verdict, message };
}

function compareBrand(
  extracted: ExtractedField,
  application: string,
): Layer2FieldResult {
  if (extracted.value === application) {
    return l2("brandName", "pass", "Exact match with application.");
  }
  if (normalizeBrand(extracted.value) === normalizeBrand(application)) {
    return l2(
      "brandName",
      "pass",
      "Match after case/punctuation normalization (per F-030 tolerant matching).",
    );
  }
  return l2(
    "brandName",
    "fail",
    `Label '${extracted.value}' does not match application '${application}'.`,
  );
}

function compareAbv(
  extracted: ExtractedField,
  application: number,
): Layer2FieldResult {
  const labelAbv = parseAbv(extracted.value);
  if (labelAbv === null) {
    return l2(
      "alcoholContent",
      "needs_review",
      "Label alcohol content could not be parsed; defer to reviewer.",
    );
  }
  const tol = abvTolerance(application);
  const diff = Math.abs(labelAbv - application);
  if (diff <= tol) {
    return l2(
      "alcoholContent",
      "pass",
      `Label ${labelAbv}% within ±${tol}% of application ${application}% (27 CFR 4.36 wine tolerance).`,
    );
  }
  return l2(
    "alcoholContent",
    "fail",
    `Label ${labelAbv}% differs from application ${application}% by ${diff.toFixed(1)}% (exceeds ±${tol}% tolerance).`,
  );
}

function compareString(
  fieldName: string,
  extracted: ExtractedField,
  application: string,
): Layer2FieldResult {
  const a = extracted.value.trim().toLowerCase();
  const b = application.trim().toLowerCase();
  if (a === b) {
    return l2(fieldName, "pass", "Match with application.");
  }
  if (a.includes(b) || b.includes(a)) {
    return l2(
      fieldName,
      "needs_review",
      `Label '${extracted.value}' partially matches application '${application}'.`,
    );
  }
  return l2(
    fieldName,
    "fail",
    `Label '${extracted.value}' does not match application '${application}'.`,
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
    return LAYER2_FIELDS.map((f) =>
      l2(f, "needs_application_data", "Application data not yet provided."),
    );
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
        ),
    compareString("netContents", extracted.netContents, application.netContents),
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
      ),
    );
  } else if (extracted.countryOfOrigin === undefined) {
    results.push(
      l2(
        "countryOfOrigin",
        "needs_review",
        `Application declares country of origin '${application.countryOfOrigin}'; label image does not show this field.`,
      ),
    );
  } else {
    results.push(
      compareString(
        "countryOfOrigin",
        extracted.countryOfOrigin,
        application.countryOfOrigin,
      ),
    );
  }
  return results;
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
