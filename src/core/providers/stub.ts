import path from "node:path";
import type { LabelProvider } from "./types.js";
import type { ExtractedField, ExtractedFields } from "../schemas.js";

const REGULATION_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

const hi = (value: string): ExtractedField => ({
  value,
  confidence: "hi",
  confidenceRaw: 0.95,
});

const med = (value: string): ExtractedField => ({
  value,
  confidence: "med",
  confidenceRaw: 0.7,
});

const low = (value: string): ExtractedField => ({
  value,
  confidence: "low",
  confidenceRaw: 0.4,
});

type Fixture = ExtractedFields;

const FIXTURES: Record<string, Fixture> = {
  "good-merlot": {
    brandName: hi("Stone's Throw"),
    classType: hi("Merlot"),
    alcoholContent: hi("13.5% alc/vol"),
    netContents: hi("750 mL"),
    producerName: hi("Stone's Throw Vineyards"),
    producerAddress: hi("Napa, California"),
    governmentWarning: hi(REGULATION_WARNING),
  },
  "case-drift-brand": {
    brandName: hi("STONE'S THROW"),
    classType: hi("Merlot"),
    alcoholContent: hi("13.5% alc/vol"),
    netContents: hi("750 mL"),
    producerName: hi("Stone's Throw Vineyards"),
    producerAddress: hi("Napa, California"),
    governmentWarning: hi(REGULATION_WARNING),
  },
  "bad-warning-titlecase": {
    brandName: hi("Riverbend"),
    classType: hi("Cabernet Sauvignon"),
    alcoholContent: hi("14.2% alc/vol"),
    netContents: hi("750 mL"),
    producerName: hi("Riverbend Estates"),
    producerAddress: hi("Sonoma, California"),
    governmentWarning: hi(
      "Government Warning: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
    ),
  },
  "abv-mismatch": {
    brandName: hi("Sunset Bluff"),
    classType: hi("Chardonnay"),
    alcoholContent: hi("11.0% alc/vol"),
    netContents: hi("750 mL"),
    producerName: hi("Sunset Bluff Wines"),
    producerAddress: hi("Paso Robles, California"),
    governmentWarning: hi(REGULATION_WARNING),
  },
  "low-confidence-read": {
    brandName: low("Eagl3 R1dge"),
    classType: med("Pinot Noir"),
    alcoholContent: low("1?.5% alc/vol"),
    netContents: med("750 mL"),
    producerName: low("E4gle Ridge V1ney4rd"),
    producerAddress: med("Oregon"),
    governmentWarning: med(REGULATION_WARNING),
  },
};

const DEFAULT_FIXTURE: Fixture = FIXTURES["good-merlot"]!;

export class StubLabelProvider implements LabelProvider {
  async analyzeLabel(imagePath: string): Promise<ExtractedFields> {
    const stem = path.basename(imagePath, path.extname(imagePath));
    return FIXTURES[stem] ?? DEFAULT_FIXTURE;
  }
}
