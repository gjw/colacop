import { describe, expect, it } from "vitest";
import { computeRecommendation, isOverride } from "./recommendation.js";

describe("computeRecommendation", () => {
  it("returns 'pending' when there are no verdicts", () => {
    expect(computeRecommendation([], [])).toBe("pending");
  });

  it("returns 'reject' when any L1 verdict is 'fail'", () => {
    expect(computeRecommendation(["pass", "fail"], ["pass"])).toBe("reject");
  });

  it("returns 'reject' when any L2 verdict is 'fail'", () => {
    expect(computeRecommendation(["pass"], ["pass", "fail"])).toBe("reject");
  });

  it("returns 'reject' even when needs_review is also present", () => {
    expect(computeRecommendation(["needs_review"], ["fail"])).toBe("reject");
  });

  it("returns 'send_back' when any verdict is 'needs_review' and none are fail", () => {
    expect(computeRecommendation(["pass", "needs_review"], ["pass"])).toBe(
      "send_back",
    );
  });

  it("returns 'approve' when every verdict is 'pass'", () => {
    expect(computeRecommendation(["pass", "pass"], ["pass", "pass"])).toBe(
      "approve",
    );
  });

  it("returns 'pending' when L2 has only needs_application_data and no L1", () => {
    expect(computeRecommendation([], ["needs_application_data"])).toBe(
      "pending",
    );
  });

  it("returns 'pending' when verdicts mix pass with needs_application_data only", () => {
    expect(
      computeRecommendation(
        ["pass"],
        ["needs_application_data", "needs_application_data"],
      ),
    ).toBe("pending");
  });

  it("treats needs_application_data as non-blocking when fail also present", () => {
    expect(
      computeRecommendation(["pass"], ["fail", "needs_application_data"]),
    ).toBe("reject");
  });
});

describe("isOverride", () => {
  it("is false when recommendation is null", () => {
    expect(isOverride("approve", null)).toBe(false);
  });

  it("is false when recommendation is 'pending'", () => {
    expect(isOverride("reject", "pending")).toBe(false);
  });

  it("is false when outcome matches recommendation", () => {
    expect(isOverride("approve", "approve")).toBe(false);
    expect(isOverride("reject", "reject")).toBe(false);
    expect(isOverride("send_back", "send_back")).toBe(false);
  });

  it("is true when outcome diverges from a concrete recommendation", () => {
    expect(isOverride("approve", "reject")).toBe(true);
    expect(isOverride("reject", "approve")).toBe(true);
    expect(isOverride("send_back", "approve")).toBe(true);
  });
});
