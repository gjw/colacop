import type { ExtractedFields } from "../schemas.js";

export interface LabelProvider {
  analyzeLabel(imagePath: string): Promise<ExtractedFields>;
}
