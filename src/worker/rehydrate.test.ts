import { describe, expect, it } from "vitest";
import type { Selectable } from "kysely";
import type {
  Layer1ResultsTable,
  Layer2ResultsTable,
} from "../db/schema.js";
import { rehydrateExtractedFields } from "./rehydrate.js";

type Layer1Row = Selectable<Layer1ResultsTable>;
type Layer2Row = Selectable<Layer2ResultsTable>;

function l1(
  field_name: string,
  extracted_value: string | null,
  confidence: "low" | "med" | "hi" = "hi",
  raw: number | null = 0.95,
): Layer1Row {
  return {
    id: 0,
    job_id: 0,
    field_name,
    verdict: "pass",
    extraction_confidence: confidence,
    extraction_confidence_raw: raw,
    message: "",
    extracted_value,
    created_at: new Date(),
  };
}

function l2(field_name: string, extracted_value: string | null): Layer2Row {
  return {
    id: 0,
    job_id: 0,
    field_name,
    verdict: "pass",
    message: "",
    extracted_value,
    application_value: null,
    created_at: new Date(),
  };
}

describe("rehydrateExtractedFields", () => {
  it("prefers layer1 rows for every field they cover", () => {
    const layer1 = [
      l1("brandName", "Cointreau", "hi", 0.95),
      l1("classType", "LIQUEUR", "hi", 0.95),
      l1("alcoholContent", "ALC. 40% BY VOL.", "hi", 0.95),
      l1("netContents", "750 mL", "hi", 0.95),
      l1("producerName", "Rémy Cointreau", "hi", 0.95),
      l1("producerAddress", "Angers, France", "hi", 0.95),
      l1("governmentWarning", "GOVERNMENT WARNING:...", "med", 0.7),
    ];
    const fields = rehydrateExtractedFields(layer1, []);
    expect(fields.brandName.value).toBe("Cointreau");
    expect(fields.brandName.confidence).toBe("hi");
    expect(fields.brandName.confidenceRaw).toBe(0.95);
    expect(fields.governmentWarning.confidence).toBe("med");
    expect(fields.governmentWarning.confidenceRaw).toBe(0.7);
    expect(fields.countryOfOrigin).toBeUndefined();
  });

  it("uses layer2 row for countryOfOrigin when present", () => {
    const fields = rehydrateExtractedFields(
      [l1("brandName", "X")],
      [l2("countryOfOrigin", "PRODUCT OF FRANCE")],
    );
    expect(fields.countryOfOrigin?.value).toBe("PRODUCT OF FRANCE");
    expect(fields.countryOfOrigin?.confidenceRaw).toBeNull();
  });

  it("falls back to empty field when neither layer has the row", () => {
    const fields = rehydrateExtractedFields([], []);
    expect(fields.brandName.value).toBe("");
    expect(fields.brandName.confidence).toBe("low");
    expect(fields.brandName.confidenceRaw).toBeNull();
  });

  it("treats null extracted_value as empty string", () => {
    const fields = rehydrateExtractedFields(
      [l1("governmentWarning", null, "low", null)],
      [],
    );
    expect(fields.governmentWarning.value).toBe("");
  });
});
