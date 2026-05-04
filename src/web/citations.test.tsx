import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderWithCitations } from "./citations.js";

function asAnchor(node: unknown): ReactElement<{ href: string; children: string }> {
  return node as ReactElement<{ href: string; children: string }>;
}

describe("renderWithCitations", () => {
  it("passes plain text through unchanged", () => {
    const out = renderWithCitations("Just plain text, no citation here.");
    expect(out).toEqual(["Just plain text, no citation here."]);
  });

  it("links '27 CFR 16.22' to ecfr.gov", () => {
    const out = renderWithCitations(
      "Must begin with 'GOVERNMENT WARNING:' in all caps (27 CFR 16.22).",
    );
    expect(out[0]).toBe("Must begin with 'GOVERNMENT WARNING:' in all caps (");
    const a = asAnchor(out[1]);
    expect(a.props.href).toBe(
      "https://www.ecfr.gov/current/title-27/section-16.22",
    );
    expect(a.props.children).toBe("27 CFR 16.22");
    expect(out[2]).toBe(").");
  });

  it("links '27 CFR 16.21'", () => {
    const out = renderWithCitations(
      "Warning text does not match the wording required by 27 CFR 16.21.",
    );
    const a = asAnchor(out[1]);
    expect(a.props.href).toBe(
      "https://www.ecfr.gov/current/title-27/section-16.21",
    );
  });

  it("links '27 CFR 4.36' (wine ABV format)", () => {
    const out = renderWithCitations(
      "Alcohol content does not conform to 27 CFR 4.36 format (e.g., '13.5% alc/vol').",
    );
    const a = asAnchor(out[1]);
    expect(a.props.href).toBe(
      "https://www.ecfr.gov/current/title-27/section-4.36",
    );
    expect(a.props.children).toBe("27 CFR 4.36");
  });

  it("links multiple citations in one string", () => {
    const out = renderWithCitations(
      "See 27 CFR 16.22 and 27 CFR 16.21 for the warning rules.",
    );
    const anchors = out.filter(
      (n): n is ReactElement<{ href: string }> =>
        typeof n === "object" && n !== null && "props" in (n as object),
    );
    expect(anchors.length).toBe(2);
    expect(asAnchor(anchors[0]).props.href).toBe(
      "https://www.ecfr.gov/current/title-27/section-16.22",
    );
    expect(asAnchor(anchors[1]).props.href).toBe(
      "https://www.ecfr.gov/current/title-27/section-16.21",
    );
  });

  it("does not match 'CFR' alone or stray digits", () => {
    const out = renderWithCitations(
      "CFR is the Code of Federal Regulations. Section 16.22 alone is not a citation.",
    );
    expect(out.length).toBe(1);
    expect(out[0]).toBe(
      "CFR is the Code of Federal Regulations. Section 16.22 alone is not a citation.",
    );
  });
});
