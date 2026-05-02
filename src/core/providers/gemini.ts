import { promises as fs } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { LabelProvider } from "./types.js";
import {
  type ExtractedField,
  type ExtractedFields,
  type ExtractionConfidence,
  extractionConfidenceSchema,
} from "../schemas.js";

const PROMPT =
  "This image shows the front and/or back panels of an alcohol bottle label, possibly as a side-by-side or stacked composite of two panels. Extract each listed field as it appears on the label. Return null for any field not visible in the image. Do not hallucinate or infer missing values from training data — if the back panel is not visible, the government warning field must be null. For each field, return extraction_confidence: low (blurry, partial, glare-obscured, hard to read), med (readable but stylized or low-contrast), or hi (clean print, unambiguous).";

const DEFAULT_MODEL = "gemini-3.1-pro-preview";

const fieldResponseSchema = z.object({
  value: z.string().nullable(),
  extraction_confidence: extractionConfidenceSchema,
});

const responseSchema = z.object({
  brandName: fieldResponseSchema,
  classType: fieldResponseSchema,
  alcoholContent: fieldResponseSchema,
  netContents: fieldResponseSchema,
  producerName: fieldResponseSchema,
  producerAddress: fieldResponseSchema,
  countryOfOrigin: fieldResponseSchema,
  governmentWarning: fieldResponseSchema,
});

type FieldResponse = z.infer<typeof fieldResponseSchema>;

const CONFIDENCE_RAW: Record<ExtractionConfidence, number> = {
  low: 0.3,
  med: 0.7,
  hi: 0.95,
};

const FIELD_SCHEMA = {
  type: "object",
  properties: {
    value: { type: ["string", "null"] },
    extraction_confidence: { type: "string", enum: ["low", "med", "hi"] },
  },
  required: ["value", "extraction_confidence"],
} as const;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    brandName: FIELD_SCHEMA,
    classType: FIELD_SCHEMA,
    alcoholContent: FIELD_SCHEMA,
    netContents: FIELD_SCHEMA,
    producerName: FIELD_SCHEMA,
    producerAddress: FIELD_SCHEMA,
    countryOfOrigin: FIELD_SCHEMA,
    governmentWarning: FIELD_SCHEMA,
  },
  required: [
    "brandName",
    "classType",
    "alcoholContent",
    "netContents",
    "producerName",
    "producerAddress",
    "countryOfOrigin",
    "governmentWarning",
  ],
} as const;

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function mimeTypeForPath(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) throw new Error(`Unsupported image extension: ${ext}`);
  return mime;
}

export function toExtractedField(raw: FieldResponse): ExtractedField {
  if (raw.value === null) {
    return { value: "", confidence: "low", confidenceRaw: null };
  }
  return {
    value: raw.value,
    confidence: raw.extraction_confidence,
    confidenceRaw: CONFIDENCE_RAW[raw.extraction_confidence],
  };
}

export class GeminiLabelProvider implements LabelProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(args: { apiKey: string; model?: string }) {
    this.client = new GoogleGenAI({ apiKey: args.apiKey });
    this.model = args.model ?? DEFAULT_MODEL;
  }

  async analyzeLabel(imagePath: string): Promise<ExtractedFields> {
    const bytes = await fs.readFile(imagePath);
    const mimeType = mimeTypeForPath(imagePath);

    const t0 = Date.now();
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: bytes.toString("base64") } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
      },
    });
    const elapsedMs = Date.now() - t0;

    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const visibleOutputTokens = usage?.candidatesTokenCount ?? 0;
    const totalTokens = usage?.totalTokenCount ?? inputTokens + visibleOutputTokens;
    const thinkingTokens = Math.max(0, totalTokens - inputTokens - visibleOutputTokens);
    const billedOutputTokens = visibleOutputTokens + thinkingTokens;
    const inputCostUsd = (inputTokens / 1_000_000) * 2;
    const outputCostUsd = (billedOutputTokens / 1_000_000) * 12;
    const totalCostUsd = inputCostUsd + outputCostUsd;
    const stem = path.basename(imagePath, path.extname(imagePath));
    console.log(
      `[gemini] ${stem}: ${elapsedMs}ms, in=${inputTokens} out=${visibleOutputTokens} thinking=${thinkingTokens} total=${totalTokens} tok, cost=$${totalCostUsd.toFixed(6)} (in $${inputCostUsd.toFixed(6)} + out $${outputCostUsd.toFixed(6)})`,
    );

    const text = response.text;
    if (text === undefined || text === "") {
      throw new Error("Gemini response was empty");
    }
    const parsed: unknown = JSON.parse(text);
    const validated = responseSchema.parse(parsed);

    const result: ExtractedFields = {
      brandName: toExtractedField(validated.brandName),
      classType: toExtractedField(validated.classType),
      alcoholContent: toExtractedField(validated.alcoholContent),
      netContents: toExtractedField(validated.netContents),
      producerName: toExtractedField(validated.producerName),
      producerAddress: toExtractedField(validated.producerAddress),
      governmentWarning: toExtractedField(validated.governmentWarning),
    };
    if (validated.countryOfOrigin.value !== null) {
      result.countryOfOrigin = toExtractedField(validated.countryOfOrigin);
    }
    return result;
  }
}
