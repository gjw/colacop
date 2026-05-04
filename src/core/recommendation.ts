import type {
  Layer1Verdict,
  Layer2Verdict,
  Recommendation,
} from "../db/schema.js";

export function computeRecommendation(
  layer1Verdicts: readonly Layer1Verdict[],
  layer2Verdicts: readonly Layer2Verdict[],
): Recommendation {
  const all: Array<Layer1Verdict | Layer2Verdict> = [
    ...layer1Verdicts,
    ...layer2Verdicts,
  ];
  if (all.length === 0) return "pending";
  if (all.includes("fail")) return "reject";
  if (all.includes("needs_review")) return "send_back";
  if (all.every((v) => v === "pass")) return "approve";
  return "pending";
}

export function isOverride(
  outcome: "approve" | "reject" | "send_back",
  recommendation: Recommendation | null,
): boolean {
  if (recommendation === null || recommendation === "pending") return false;
  return outcome !== recommendation;
}
