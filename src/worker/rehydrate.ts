import type { Selectable } from "kysely";
import type {
  ExtractedField,
  ExtractedFields,
} from "../core/schemas.js";
import type {
  ExtractionConfidence,
  Layer1ResultsTable,
  Layer2ResultsTable,
} from "../db/schema.js";

type Layer1Row = Selectable<Layer1ResultsTable>;
type Layer2Row = Selectable<Layer2ResultsTable>;

function fieldFromLayer1(row: Layer1Row): ExtractedField {
  return {
    value: row.extracted_value ?? "",
    confidence: row.extraction_confidence,
    confidenceRaw: row.extraction_confidence_raw,
  };
}

function fieldFromLayer2(
  row: Layer2Row,
  confidence: ExtractionConfidence = "low",
): ExtractedField {
  return {
    value: row.extracted_value ?? "",
    confidence,
    confidenceRaw: null,
  };
}

const EMPTY_FIELD: ExtractedField = {
  value: "",
  confidence: "low",
  confidenceRaw: null,
};

export function rehydrateExtractedFields(
  layer1: Layer1Row[],
  layer2: Layer2Row[],
): ExtractedFields {
  const byL1 = new Map(layer1.map((r) => [r.field_name, r]));
  const byL2 = new Map(layer2.map((r) => [r.field_name, r]));

  const pick = (name: string): ExtractedField => {
    const l1 = byL1.get(name);
    if (l1) return fieldFromLayer1(l1);
    const l2 = byL2.get(name);
    if (l2) return fieldFromLayer2(l2);
    return EMPTY_FIELD;
  };

  const result: ExtractedFields = {
    brandName: pick("brandName"),
    classType: pick("classType"),
    alcoholContent: pick("alcoholContent"),
    netContents: pick("netContents"),
    producerName: pick("producerName"),
    producerAddress: pick("producerAddress"),
    governmentWarning: pick("governmentWarning"),
  };

  const country = byL2.get("countryOfOrigin");
  if (country) {
    result.countryOfOrigin = fieldFromLayer2(country);
  }

  return result;
}
