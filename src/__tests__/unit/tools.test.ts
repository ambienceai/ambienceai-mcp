import {
  determineMediaType,
  getModelsForTasks,
  buildModelDescription,
  buildToolCostDescription,
} from "../../tools.js";
import type { ModelInfo } from "../../api-client.js";

// Test the file path detection helpers (exported via the module)
// We test these indirectly through the schema + tool behavior

// ---------------------------------------------------------------------------
// Sample model data for helper tests
// ---------------------------------------------------------------------------

const sampleModels: ModelInfo[] = [
  {
    uiValue: "flux_2_pro",
    id: "flux-2-pro",
    displayName: "Flux 2 Pro",
    description: "Fast",
    mediaCategory: "image",
    tier: "standard",
    tasks: [
      {
        task: "text_to_image",
        creditCost: 25,
        estimatedDuration: 30,
        durationDisplay: "~30s",
      },
    ],
  },
  {
    uiValue: "nano_banana",
    id: "nano-banana-pro",
    displayName: "Nano Banana Pro",
    description: "Budget",
    mediaCategory: "image",
    tier: "standard",
    tasks: [
      {
        task: "text_to_image",
        creditCost: 15,
        estimatedDuration: 20,
        durationDisplay: "~20s",
      },
      {
        task: "image_to_image",
        creditCost: 40,
        estimatedDuration: 25,
        durationDisplay: "~25s",
      },
    ],
  },
  {
    uiValue: "flux_kontext",
    id: "flux-kontext",
    displayName: "Flux Kontext",
    description: "Editing",
    mediaCategory: "image",
    tier: "standard",
    tasks: [
      {
        task: "image_to_image",
        creditCost: 40,
        estimatedDuration: 20,
        durationDisplay: "~20s",
      },
      {
        task: "image_to_image_multi",
        creditCost: 40,
        estimatedDuration: 20,
        durationDisplay: "~20s",
      },
    ],
  },
  {
    uiValue: "wan",
    id: "wan-2.1",
    displayName: "WAN 2.1",
    description: "Video",
    mediaCategory: "video",
    tier: "standard",
    tasks: [
      {
        task: "text_to_video",
        creditCost: 100,
        estimatedDuration: 180,
        durationDisplay: "~3m",
      },
      {
        task: "image_to_video",
        creditCost: 70,
        estimatedDuration: 180,
        durationDisplay: "~3m",
      },
    ],
  },
  {
    uiValue: "kokoro",
    id: "kokoro",
    displayName: "Kokoro",
    description: "Speech",
    mediaCategory: "audio",
    tier: "standard",
    tasks: [
      {
        task: "text_to_audio_speech",
        creditCost: 25,
        estimatedDuration: 30,
        durationDisplay: "~30s",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper function tests
// ---------------------------------------------------------------------------

describe("getModelsForTasks", () => {
  it("filters models by task type", () => {
    const result = getModelsForTasks(sampleModels, ["text_to_image"]);
    expect(result.map((m) => m.uiValue)).toEqual(["flux_2_pro", "nano_banana"]);
  });

  it("returns models matching any of multiple task types", () => {
    const result = getModelsForTasks(sampleModels, [
      "text_to_image",
      "image_to_image",
    ]);
    expect(result.map((m) => m.uiValue)).toEqual([
      "flux_2_pro",
      "nano_banana",
      "flux_kontext",
    ]);
  });

  it("returns empty array when no models match", () => {
    const result = getModelsForTasks(sampleModels, ["nonexistent_task"]);
    expect(result).toEqual([]);
  });
});

describe("buildModelDescription", () => {
  it("lists available models with costs and marks default", () => {
    const desc = buildModelDescription(
      sampleModels,
      ["text_to_image"],
      "flux_2_pro",
    );
    expect(desc).toContain('"flux_2_pro"');
    expect(desc).toContain("25 credits");
    expect(desc).toContain("default");
    expect(desc).toContain('"nano_banana"');
    expect(desc).toContain("15 credits");
  });

  it("includes image editing hint when image_to_image is in tasks", () => {
    const desc = buildModelDescription(
      sampleModels,
      ["text_to_image", "image_to_image"],
      "flux_2_pro",
    );
    expect(desc).toContain("Models supporting image editing");
    expect(desc).toContain('"nano_banana"');
    expect(desc).toContain('"flux_kontext"');
  });

  it("returns fallback when no models available", () => {
    const desc = buildModelDescription([], ["text_to_image"], "flux_2_pro");
    expect(desc).toBe('The AI model to use (default: "flux_2_pro").');
  });

  it("marks the server-reported default model", () => {
    const desc = buildModelDescription(
      sampleModels,
      ["text_to_image"],
      "nano_banana",
    );
    expect(desc).toMatch(/"nano_banana"[^)]*default\)/);
    expect(desc).not.toMatch(/"flux_2_pro"[^)]*default\)/);
  });

  it("names no default when the server did not report one", () => {
    const desc = buildModelDescription(sampleModels, ["text_to_image"]);
    expect(desc).not.toContain("default");
  });

  it("uses generic fallback wording when defaults are unknown and no models load", () => {
    const desc = buildModelDescription([], ["text_to_image"]);
    expect(desc).toBe(
      "The AI model to use. Omit to use the server's recommended default.",
    );
  });

  it("shows credit range for models with multiple task costs", () => {
    const desc = buildModelDescription(
      sampleModels,
      ["text_to_image", "image_to_image"],
      "nano_banana",
    );
    // nano_banana has 15 and 40 credit tasks
    expect(desc).toContain("15-40 credits");
  });
});

describe("buildToolCostDescription", () => {
  it("returns cost string for single-model tools", () => {
    const result = buildToolCostDescription(
      sampleModels,
      "text_to_audio_speech",
    );
    expect(result).toBe(" (25 credits)");
  });

  it("returns empty string when no models match", () => {
    const result = buildToolCostDescription(sampleModels, "nonexistent_task");
    expect(result).toBe("");
  });

  it("returns range for multiple models with different costs", () => {
    const result = buildToolCostDescription(sampleModels, "text_to_image");
    // flux_2_pro: 25, nano_banana: 15
    expect(result).toBe(" (15-25 credits)");
  });
});

describe("isFilePath detection", () => {
  // We can test this via the relaxed schemas - file paths should now parse successfully
  it("absolute paths are accepted by relaxed schemas", async () => {
    const { GenerateImageRequestSchema } = await import("../../types.js");
    const result = GenerateImageRequestSchema.parse({
      prompt: "test",
      imageUrl: "/Users/test/image.png",
    });
    expect(result.imageUrl).toBe("/Users/test/image.png");
  });

  it("tilde paths are accepted by relaxed schemas", async () => {
    const { GenerateImageRequestSchema } = await import("../../types.js");
    const result = GenerateImageRequestSchema.parse({
      prompt: "test",
      imageUrl: "~/Desktop/photo.jpg",
    });
    expect(result.imageUrl).toBe("~/Desktop/photo.jpg");
  });

  it("relative paths are accepted by relaxed schemas", async () => {
    const { GenerateImageRequestSchema } = await import("../../types.js");
    const result = GenerateImageRequestSchema.parse({
      prompt: "test",
      imageUrl: "./images/photo.jpg",
    });
    expect(result.imageUrl).toBe("./images/photo.jpg");
  });

  it("URLs are still accepted", async () => {
    const { GenerateImageRequestSchema } = await import("../../types.js");
    const result = GenerateImageRequestSchema.parse({
      prompt: "test",
      imageUrl: "https://example.com/image.png",
    });
    expect(result.imageUrl).toBe("https://example.com/image.png");
  });
});

describe("determineMediaType", () => {
  describe("video content (should skip - MCP SDK does not support video)", () => {
    it("skips video creationType", () => {
      expect(
        determineMediaType("https://cdn.example.com/video.mp4", "video"),
      ).toEqual({ skip: true });
    });

    it("skips .mp4 files regardless of creationType", () => {
      expect(
        determineMediaType("https://cdn.example.com/media.mp4", "unknown"),
      ).toEqual({ skip: true });
    });

    it("skips .webm files", () => {
      expect(
        determineMediaType("https://cdn.example.com/media.webm", "unknown"),
      ).toEqual({ skip: true });
    });

    it("skips .mov files", () => {
      expect(
        determineMediaType("https://cdn.example.com/media.mov", "unknown"),
      ).toEqual({ skip: true });
    });

    it("skips video extensions case-insensitively", () => {
      expect(
        determineMediaType("https://cdn.example.com/media.MP4", "unknown"),
      ).toEqual({ skip: true });
      expect(
        determineMediaType("https://cdn.example.com/media.MOV", "unknown"),
      ).toEqual({ skip: true });
    });
  });

  describe("image content", () => {
    it("handles image creationType", () => {
      const result = determineMediaType(
        "https://cdn.example.com/image.png",
        "image",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/png");
    });

    it("handles .jpg files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/photo.jpg",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("handles .jpeg files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/photo.jpeg",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("handles .png files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/image.png",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/png");
    });

    it("handles .gif files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/animation.gif",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/gif");
    });

    it("handles .webp files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/image.webp",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/webp");
    });

    it("handles uppercase extensions case-insensitively", () => {
      const result = determineMediaType(
        "https://cdn.example.com/image.PNG",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/png");
    });

    it("handles mixed case extensions", () => {
      const result = determineMediaType(
        "https://cdn.example.com/image.JpG",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/jpeg");
    });
  });

  describe("audio content", () => {
    it("handles speech creationType", () => {
      const result = determineMediaType(
        "https://cdn.example.com/speech.mp3",
        "speech",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("audio");
      expect(result.mimeType).toBe("audio/mpeg");
    });

    it("handles music creationType", () => {
      const result = determineMediaType(
        "https://cdn.example.com/music.mp3",
        "music",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("audio");
      expect(result.mimeType).toBe("audio/mpeg");
    });

    it("handles .mp3 files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/audio.mp3",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("audio");
      expect(result.mimeType).toBe("audio/mpeg");
    });

    it("handles .wav files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/audio.wav",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("audio");
      expect(result.mimeType).toBe("audio/wav");
    });

    it("handles .ogg files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/audio.ogg",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("audio");
      expect(result.mimeType).toBe("audio/ogg");
    });

    it("handles .m4a files", () => {
      const result = determineMediaType(
        "https://cdn.example.com/audio.m4a",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("audio");
      expect(result.mimeType).toBe("audio/m4a");
    });
  });

  describe("edge cases", () => {
    it("defaults to image with generic MIME type for unknown extensions", () => {
      const result = determineMediaType(
        "https://cdn.example.com/file.xyz",
        "unknown",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("application/octet-stream");
    });

    it("handles URLs with query parameters", () => {
      // Note: current implementation extracts extension after last dot,
      // which may include query params - this test documents current behavior
      const result = determineMediaType(
        "https://cdn.example.com/image.png?token=abc",
        "image",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
    });

    it("handles image creationType even with unrecognized extension", () => {
      const result = determineMediaType(
        "https://cdn.example.com/file",
        "image",
      );
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe("image");
      expect(result.mimeType).toBe("image/jpeg");
    });
  });
});
