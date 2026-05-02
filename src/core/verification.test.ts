import { describe, expect, it } from "vitest";
import {
  REGULATION_WARNING,
  abvTolerance,
  normalizeBrand,
  parseAbv,
  runLayer1,
  runLayer2,
  verifyLabel,
} from "./verification.js";
import type { ApplicationData, ExtractedFields } from "./schemas.js";

const hi = (value: string) => ({
  value,
  confidence: "hi" as const,
  confidenceRaw: 0.95,
});

const baseExtracted: ExtractedFields = {
  brandName: hi("Stone's Throw"),
  classType: hi("Merlot"),
  alcoholContent: hi("13.5% alc/vol"),
  netContents: hi("750 mL"),
  producerName: hi("Stone's Throw Vineyards"),
  producerAddress: hi("Napa, California"),
  governmentWarning: hi(REGULATION_WARNING),
};

const baseApp: ApplicationData = {
  brandName: "Stone's Throw",
  classType: "Merlot",
  alcoholContent: 13.5,
  netContents: "750 mL",
  producerName: "Stone's Throw Vineyards",
  producerAddress: "Napa, California",
};

describe("parseAbv", () => {
  it("parses 'Alcohol 13.5% by volume'", () => {
    expect(parseAbv("Alcohol 13.5% by volume")).toBe(13.5);
  });
  it("parses '13.5% alc/vol'", () => {
    expect(parseAbv("13.5% alc/vol")).toBe(13.5);
  });
  it("parses 'alc. 14% vol.'", () => {
    expect(parseAbv("alc. 14% vol.")).toBe(14);
  });
  it("returns null for malformed text", () => {
    expect(parseAbv("really strong")).toBe(null);
  });
});

describe("abvTolerance", () => {
  it("returns 1.0 above 14%", () => {
    expect(abvTolerance(14.5)).toBe(1.0);
  });
  it("returns 1.5 at 14% or below", () => {
    expect(abvTolerance(14)).toBe(1.5);
    expect(abvTolerance(11)).toBe(1.5);
  });
});

describe("normalizeBrand", () => {
  it("normalizes case + punctuation per F-030", () => {
    expect(normalizeBrand("STONE'S THROW")).toBe(
      normalizeBrand("Stone's Throw"),
    );
  });
});

describe("runLayer1", () => {
  it("passes a clean label", () => {
    const results = runLayer1(baseExtracted);
    expect(results.every((r) => r.verdict === "pass")).toBe(true);
  });

  it("fails on title-case GOVERNMENT WARNING (F-048)", () => {
    const r = runLayer1({
      ...baseExtracted,
      governmentWarning: hi(REGULATION_WARNING.replace("GOVERNMENT WARNING", "Government Warning")),
    });
    const warning = r.find((x) => x.fieldName === "governmentWarning");
    expect(warning?.verdict).toBe("fail");
  });

  it("fails on missing mandatory field", () => {
    const r = runLayer1({ ...baseExtracted, brandName: hi("") });
    const brand = r.find((x) => x.fieldName === "brandName");
    expect(brand?.verdict).toBe("fail");
  });

  it("flags low extraction confidence as needs_review", () => {
    const r = runLayer1({
      ...baseExtracted,
      brandName: { value: "Stone's Throw", confidence: "low", confidenceRaw: 0.3 },
    });
    const brand = r.find((x) => x.fieldName === "brandName");
    expect(brand?.verdict).toBe("needs_review");
    expect(brand?.extractionConfidence).toBe("low");
  });

  it("fails on malformed ABV", () => {
    const r = runLayer1({
      ...baseExtracted,
      alcoholContent: hi("really strong"),
    });
    const abv = r.find((x) => x.fieldName === "alcoholContent");
    expect(abv?.verdict).toBe("fail");
  });
});

describe("runLayer2", () => {
  it("returns needs_application_data for every field when application is null", () => {
    const r = runLayer2(baseExtracted, null);
    expect(r.every((x) => x.verdict === "needs_application_data")).toBe(true);
  });

  it("passes brand-name case/punctuation drift per F-030", () => {
    const r = runLayer2(
      { ...baseExtracted, brandName: hi("STONE'S THROW") },
      baseApp,
    );
    const brand = r.find((x) => x.fieldName === "brandName");
    expect(brand?.verdict).toBe("pass");
  });

  it("passes ABV within tolerance (≤14% gets ±1.5%)", () => {
    const r = runLayer2(
      { ...baseExtracted, alcoholContent: hi("12.5% alc/vol") },
      baseApp,
    );
    const abv = r.find((x) => x.fieldName === "alcoholContent");
    expect(abv?.verdict).toBe("pass");
  });

  it("fails ABV out of tolerance", () => {
    const r = runLayer2(
      { ...baseExtracted, alcoholContent: hi("11% alc/vol") },
      baseApp,
    );
    const abv = r.find((x) => x.fieldName === "alcoholContent");
    expect(abv?.verdict).toBe("fail");
  });

  it("uses ±1.0% tolerance above 14% ABV", () => {
    const highApp = { ...baseApp, alcoholContent: 15 };
    const r = runLayer2(
      { ...baseExtracted, alcoholContent: hi("16.5% alc/vol") },
      highApp,
    );
    const abv = r.find((x) => x.fieldName === "alcoholContent");
    expect(abv?.verdict).toBe("fail");
  });
});

describe("runLayer2 — countryOfOrigin", () => {
  it("reports needs_application_data when application omits it (domestic)", () => {
    const r = runLayer2(baseExtracted, baseApp);
    const c = r.find((x) => x.fieldName === "countryOfOrigin");
    expect(c?.verdict).toBe("needs_application_data");
  });

  it("compares when both extraction and application have it", () => {
    const r = runLayer2(
      { ...baseExtracted, countryOfOrigin: hi("France") },
      { ...baseApp, countryOfOrigin: "France" },
    );
    const c = r.find((x) => x.fieldName === "countryOfOrigin");
    expect(c?.verdict).toBe("pass");
  });

  it("fails when application says one country and extraction shows another", () => {
    const r = runLayer2(
      { ...baseExtracted, countryOfOrigin: hi("Mexico") },
      { ...baseApp, countryOfOrigin: "France" },
    );
    const c = r.find((x) => x.fieldName === "countryOfOrigin");
    expect(c?.verdict).toBe("fail");
  });

  it("needs_review when application has it but extraction does not", () => {
    const r = runLayer2(baseExtracted, { ...baseApp, countryOfOrigin: "France" });
    const c = r.find((x) => x.fieldName === "countryOfOrigin");
    expect(c?.verdict).toBe("needs_review");
  });
});

describe("runLayer2 — absent ABV in application", () => {
  it("reports needs_application_data when application omits alcoholContent", () => {
    const appNoAbv: ApplicationData = {
      brandName: baseApp.brandName,
      classType: baseApp.classType,
      netContents: baseApp.netContents,
      producerName: baseApp.producerName,
      producerAddress: baseApp.producerAddress,
    };
    const r = runLayer2(baseExtracted, appNoAbv);
    const a = r.find((x) => x.fieldName === "alcoholContent");
    expect(a?.verdict).toBe("needs_application_data");
  });
});

describe("verifyLabel integration", () => {
  it("returns both layers", () => {
    const r = verifyLabel(baseExtracted, baseApp);
    expect(r.layer1.length).toBeGreaterThan(0);
    expect(r.layer2.length).toBeGreaterThan(0);
  });
});
