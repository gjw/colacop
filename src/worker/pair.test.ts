import { describe, expect, it } from "vitest";
import { classifyFile, nextLifecycle, stemOf } from "./pair.js";

describe("classifyFile", () => {
  it("classifies image extensions", () => {
    expect(classifyFile("foo.jpg")).toBe("image");
    expect(classifyFile("foo.JPEG")).toBe("image");
    expect(classifyFile("foo.png")).toBe("image");
    expect(classifyFile("foo.webp")).toBe("image");
  });
  it("classifies json", () => {
    expect(classifyFile("foo.json")).toBe("json");
  });
  it("ignores other extensions", () => {
    expect(classifyFile("foo.txt")).toBe(null);
  });
});

describe("stemOf", () => {
  it("strips directory and extension", () => {
    expect(stemOf("/data/incoming/abc.json")).toBe("abc");
    expect(stemOf("abc.png")).toBe("abc");
  });
});

describe("nextLifecycle — three arrival cases", () => {
  it("Case A: image first → queued (no prior row)", () => {
    const t = nextLifecycle(null, { kind: "image", filePath: "abc.jpg" });
    expect(t).toEqual({
      imagePath: "abc.jpg",
      applicationPath: null,
      lifecycle: "queued",
    });
  });

  it("Case A continued: image processed → awaiting_application; JSON arrives → queued", () => {
    const afterL1: ReturnType<typeof nextLifecycle> = {
      imagePath: "abc.jpg",
      applicationPath: null,
      lifecycle: "awaiting_application",
    };
    const t = nextLifecycle(afterL1, { kind: "json", filePath: "abc.json" });
    expect(t).toEqual({
      imagePath: "abc.jpg",
      applicationPath: "abc.json",
      lifecycle: "queued",
    });
  });

  it("Case B: JSON first → awaiting_label", () => {
    const t = nextLifecycle(null, { kind: "json", filePath: "abc.json" });
    expect(t).toEqual({
      imagePath: null,
      applicationPath: "abc.json",
      lifecycle: "awaiting_label",
    });
  });

  it("Case B continued: image arrives → queued", () => {
    const afterJson: ReturnType<typeof nextLifecycle> = {
      imagePath: null,
      applicationPath: "abc.json",
      lifecycle: "awaiting_label",
    };
    const t = nextLifecycle(afterJson, { kind: "image", filePath: "abc.jpg" });
    expect(t).toEqual({
      imagePath: "abc.jpg",
      applicationPath: "abc.json",
      lifecycle: "queued",
    });
  });

  it("Case C: image while still queued (un-processed) → stays queued with both paths", () => {
    const justImage: ReturnType<typeof nextLifecycle> = {
      imagePath: "abc.jpg",
      applicationPath: null,
      lifecycle: "queued",
    };
    const t = nextLifecycle(justImage, { kind: "json", filePath: "abc.json" });
    expect(t.lifecycle).toBe("queued");
    expect(t.imagePath).toBe("abc.jpg");
    expect(t.applicationPath).toBe("abc.json");
  });
});

describe("nextLifecycle — worker-restart idempotency", () => {
  it("processed pair, image re-fires on restart → preserves processed", () => {
    const current: ReturnType<typeof nextLifecycle> = {
      imagePath: "abc.jpg",
      applicationPath: "abc.json",
      lifecycle: "processed",
    };
    const t = nextLifecycle(current, { kind: "image", filePath: "abc.jpg" });
    expect(t).toBe(current);
  });

  it("processed pair, json re-fires on restart → preserves processed", () => {
    const current: ReturnType<typeof nextLifecycle> = {
      imagePath: "abc.jpg",
      applicationPath: "abc.json",
      lifecycle: "processed",
    };
    const t = nextLifecycle(current, { kind: "json", filePath: "abc.json" });
    expect(t).toBe(current);
  });

  it("awaiting_application, image re-fires on restart → preserves", () => {
    const current: ReturnType<typeof nextLifecycle> = {
      imagePath: "abc.jpg",
      applicationPath: null,
      lifecycle: "awaiting_application",
    };
    const t = nextLifecycle(current, { kind: "image", filePath: "abc.jpg" });
    expect(t).toBe(current);
  });

  it("awaiting_label, json re-fires on restart → preserves", () => {
    const current: ReturnType<typeof nextLifecycle> = {
      imagePath: null,
      applicationPath: "abc.json",
      lifecycle: "awaiting_label",
    };
    const t = nextLifecycle(current, { kind: "json", filePath: "abc.json" });
    expect(t).toBe(current);
  });

  it("failed pair, image re-fires → falls through to re-queue (allow retry)", () => {
    const current: ReturnType<typeof nextLifecycle> = {
      imagePath: "abc.jpg",
      applicationPath: "abc.json",
      lifecycle: "failed",
    };
    const t = nextLifecycle(current, { kind: "image", filePath: "abc.jpg" });
    expect(t.lifecycle).toBe("queued");
  });

  it("processed pair, image arrives at NEW path (replacement) → does not preserve", () => {
    const current: ReturnType<typeof nextLifecycle> = {
      imagePath: "abc.jpg",
      applicationPath: "abc.json",
      lifecycle: "processed",
    };
    const t = nextLifecycle(current, { kind: "image", filePath: "abc-v2.jpg" });
    expect(t.lifecycle).toBe("queued");
    expect(t.imagePath).toBe("abc-v2.jpg");
  });
});
