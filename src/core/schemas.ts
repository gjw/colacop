import { z } from "zod";

// All fields optional: the schema describes what application JSON CAN
// contain, not what it MUST contain. Missing fields are reported per-field
// as needs_application_data in Layer 2 (UC-001.4e). Malformed JSON still
// hard-fails at parse time.
export const applicationDataSchema = z.object({
  brandName: z.string().min(1).optional(),
  classType: z.string().min(1).optional(),
  alcoholContent: z.number().nonnegative().optional(),
  netContents: z.string().min(1).optional(),
  producerName: z.string().min(1).optional(),
  producerAddress: z.string().min(1).optional(),
  countryOfOrigin: z.string().min(1).optional(),
});

export type ApplicationData = z.infer<typeof applicationDataSchema>;

export const extractionConfidenceSchema = z.enum(["low", "med", "hi"]);
export type ExtractionConfidence = z.infer<typeof extractionConfidenceSchema>;

export const extractedFieldSchema = z.object({
  value: z.string(),
  confidence: extractionConfidenceSchema,
  confidenceRaw: z.number().nullable(),
});

export type ExtractedField = z.infer<typeof extractedFieldSchema>;

export const extractedFieldsSchema = z.object({
  brandName: extractedFieldSchema,
  classType: extractedFieldSchema,
  alcoholContent: extractedFieldSchema,
  netContents: extractedFieldSchema,
  producerName: extractedFieldSchema,
  producerAddress: extractedFieldSchema,
  countryOfOrigin: extractedFieldSchema.optional(),
  governmentWarning: extractedFieldSchema,
});

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>;

export const layer1VerdictSchema = z.enum(["pass", "fail", "needs_review"]);
export type Layer1Verdict = z.infer<typeof layer1VerdictSchema>;

export const layer2VerdictSchema = z.enum([
  "pass",
  "fail",
  "needs_review",
  "needs_application_data",
]);
export type Layer2Verdict = z.infer<typeof layer2VerdictSchema>;

export interface Layer1FieldResult {
  fieldName: string;
  verdict: Layer1Verdict;
  extractionConfidence: ExtractionConfidence;
  extractionConfidenceRaw: number | null;
  message: string;
  extractedValue: string | null;
}

export interface Layer2FieldResult {
  fieldName: string;
  verdict: Layer2Verdict;
  message: string;
  extractedValue: string | null;
  applicationValue: string | null;
}

export interface VerificationResult {
  layer1: Layer1FieldResult[];
  layer2: Layer2FieldResult[];
}
