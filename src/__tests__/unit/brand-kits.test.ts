import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockGet = jest.fn<any>();
const mockPost = jest.fn<any>();
const mockAxiosGet = jest.fn<any>();

jest.unstable_mockModule("axios", () => ({
  default: {
    create: jest.fn(() => ({ get: mockGet, post: mockPost })),
    isAxiosError: (error: any) => error?.isAxiosError === true,
    get: mockAxiosGet,
  },
}));

const { AmbienceAITools } = await import("../../tools.js");
const { clearModelCache } = await import("../../api-client.js");

function textOf(result: any): string {
  return result.content[0].text;
}

const acmeKit = {
  id: "kit-acme",
  name: "Acme",
  logoUrl: "https://cdn.example.com/acme.png",
  colors: [{ hex: "#112233", role: "primary" }],
  about: "We make anvils.",
  voice: "Dry and confident.",
  guidance:
    "Brand: Acme\nPalette: #112233 (primary)\nWrite dry, confident copy.",
};

describe("get_brand_kit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearModelCache();
    mockAxiosGet.mockResolvedValue({ data: { models: [] } });
    delete process.env.AMBIENCE_API_URL;
  });

  it("returns each kit's id followed by the server's guidance verbatim", async () => {
    const globexKit = {
      ...acmeKit,
      id: "kit-globex",
      name: "Globex",
      guidance: "Brand: Globex\nUse green.",
    };
    mockGet.mockResolvedValue({
      data: { status: "ok", kits: [acmeKit, globexKit] },
    });
    const tools = new AmbienceAITools("token");

    const result = await tools.executeTool("get_brand_kit", {});

    expect(mockGet).toHaveBeenCalledWith("/api/brand-kits");
    expect(textOf(result)).toBe(
      "Kit ID: kit-acme\nBrand: Acme\nPalette: #112233 (primary)\nWrite dry, confident copy.\n\nKit ID: kit-globex\nBrand: Globex\nUse green.",
    );
  });

  it("points to the brand settings page on the configured backend when there are no kits", async () => {
    process.env.AMBIENCE_API_URL = "http://localhost:3000";
    mockGet.mockResolvedValue({ data: { status: "ok", kits: [] } });
    const tools = new AmbienceAITools("token");

    const result = await tools.executeTool("get_brand_kit", {});

    expect(textOf(result)).toBe(
      "No brand kit yet. The user can build one from their website at http://localhost:3000/settings/brand",
    );
  });

  it("uses the production URL in the no-kits message by default", async () => {
    mockGet.mockResolvedValue({ data: { status: "ok", kits: [] } });
    const tools = new AmbienceAITools("token");

    const result = await tools.executeTool("get_brand_kit", {});

    expect(textOf(result)).toBe(
      "No brand kit yet. The user can build one from their website at https://www.ambienceai.com/settings/brand",
    );
  });

  it("states the plan limit without returning kit data when the plan lacks brand kits", async () => {
    mockGet.mockResolvedValue({
      data: { status: "plan_required", kits: [acmeKit] },
    });
    const tools = new AmbienceAITools("token");

    const result = await tools.executeTool("get_brand_kit", {});

    expect(textOf(result)).toBe(
      "Brand kits are part of the Team and Business plans. This account's plan doesn't include them.",
    );
  });

  it("surfaces a backend error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockGet.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { message: "Something broke" } },
      message: "Request failed",
    });
    const tools = new AmbienceAITools("token");

    const result = await tools.executeTool("get_brand_kit", {});

    expect(textOf(result)).toBe("Error getting brand kits: Something broke");
    (console.error as any).mockRestore();
  });

  it("is listed with no inputs", async () => {
    const tools = new AmbienceAITools("token");

    const tool = (await tools.getTools()).find(
      (t) => t.name === "get_brand_kit",
    );

    expect(tool).toEqual({
      name: "get_brand_kit",
      description:
        "Get the user's brand kits: name, logo, colors, about, and voice, plus instructions for applying a kit. Call this before generating anything for the user's brand. Then pass the kit's id as brandKitId on each generate_* call, write the brand into your prompts as the instructions say, and pass logoUrl in referenceImageUrls when the logo belongs in the image.",
      inputSchema: { type: "object", properties: {}, required: [] },
    });
  });
});

const BRANDABLE_TOOLS = [
  "generate_image",
  "generate_image_multi",
  "generate_video",
  "generate_music",
  "generate_speech",
  "generate_audio",
  "generate_chart",
  "upscale_image",
  "transcribe_audio",
];

describe("brandKitId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearModelCache();
    mockAxiosGet.mockResolvedValue({ data: { models: [] } });
  });

  it.each(BRANDABLE_TOOLS)("is an optional input on %s", async (name) => {
    const tools = new AmbienceAITools("token");

    const tool = (await tools.getTools()).find((t) => t.name === name)!;

    expect(tool.inputSchema.properties?.["brandKitId"]).toEqual({
      type: "string",
      description:
        "The id of a brand kit from get_brand_kit. Marks this creation as made for that brand. It does not change the prompt: write the brand into the prompt yourself. (optional)",
    });
    expect(tool.inputSchema.required).not.toContain("brandKitId");
  });

  const requests: Array<{
    tool: string;
    args: Record<string, unknown>;
    endpoint: string;
    body: Record<string, unknown>;
  }> = [
    {
      tool: "generate_image",
      args: { prompt: "a cat" },
      endpoint: "/api/generate/image",
      body: { prompt: "a cat", aspectRatio: "16:9" },
    },
    {
      tool: "generate_image_multi",
      args: { prompt: "mix", imageUrls: ["https://cdn.example.com/1.png"] },
      endpoint: "/api/generate/image",
      body: {
        prompt: "mix",
        aspectRatio: "16:9",
        imageUrl: "https://cdn.example.com/1.png",
      },
    },
    {
      tool: "generate_video",
      args: { prompt: "waves" },
      endpoint: "/api/generate/video",
      body: { prompt: "waves", aspectRatio: "16:9", duration: 5 },
    },
    {
      tool: "generate_music",
      args: { prompt: "jazz" },
      endpoint: "/api/generate/audio",
      body: { type: "music", prompt: "jazz" },
    },
    {
      tool: "generate_speech",
      args: { text: "hello" },
      endpoint: "/api/generate/audio",
      body: {
        type: "speech",
        text: "hello",
        voice: "af_heart",
        language: "american-english",
      },
    },
    {
      tool: "generate_audio",
      args: { prompt: "hello", type: "speech" },
      endpoint: "/api/generate/audio",
      body: { type: "speech", prompt: "hello" },
    },
    {
      tool: "generate_chart",
      args: {
        chartType: "bar",
        title: "Sales",
        data: [{ label: "Q1", value: 1 }],
      },
      endpoint: "/api/generate/chart",
      body: {
        chartType: "bar",
        title: "Sales",
        data: [{ label: "Q1", value: 1 }],
      },
    },
    {
      tool: "upscale_image",
      args: { imageUrl: "https://cdn.example.com/1.png" },
      endpoint: "/api/generate/upscale",
      body: { imageUrl: "https://cdn.example.com/1.png", upscaleFactor: 2 },
    },
    {
      tool: "transcribe_audio",
      args: { audioUrl: "https://cdn.example.com/talk.mp3" },
      endpoint: "/api/generate/transcription",
      body: { audioUrl: "https://cdn.example.com/talk.mp3" },
    },
  ];

  it("covers every brandable tool", () => {
    expect(requests.map((r) => r.tool)).toEqual(BRANDABLE_TOOLS);
  });

  it.each(requests)(
    "$tool sends brandKitId to the backend",
    async ({ tool, args, endpoint, body }) => {
      mockPost.mockResolvedValue({ data: { id: "c1", status: "pending" } });
      const tools = new AmbienceAITools("token");

      await tools.executeTool(tool, { ...args, brandKitId: "kit-acme" });

      expect(mockPost).toHaveBeenCalledWith(endpoint, {
        ...body,
        brandKitId: "kit-acme",
      });
    },
  );

  it.each(requests)(
    "$tool sends today's body when brandKitId is omitted",
    async ({ tool, args, endpoint, body }) => {
      mockPost.mockResolvedValue({ data: { id: "c1", status: "pending" } });
      const tools = new AmbienceAITools("token");

      await tools.executeTool(tool, args);

      expect(mockPost.mock.calls).toHaveLength(1);
      const [sentEndpoint, sentBody] = mockPost.mock.calls[0]!;
      expect(sentEndpoint).toBe(endpoint);
      expect(sentBody).toStrictEqual(body);
    },
  );

  it.each(requests)(
    "$tool names the brand when the response carries one",
    async ({ tool, args }) => {
      mockPost.mockResolvedValue({
        data: {
          id: "c1",
          status: "pending",
          brandKit: { id: "kit-acme", name: "Acme" },
        },
      });
      const tools = new AmbienceAITools("token");

      const result = await tools.executeTool(tool, {
        ...args,
        brandKitId: "kit-acme",
      });

      expect(textOf(result)).toMatch(/^Brand: Acme$/m);
    },
  );

  it.each(requests)(
    "$tool adds no brand line when the response has none",
    async ({ tool, args }) => {
      mockPost.mockResolvedValue({ data: { id: "c1", status: "pending" } });
      const tools = new AmbienceAITools("token");

      const result = await tools.executeTool(tool, args);

      expect(textOf(result)).not.toContain("Brand:");
    },
  );

  it("surfaces a rejected brandKitId as the usual generation error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockPost.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: "invalid_brand_kit", message: "Brand kit not found" },
      },
      message: "Request failed with status code 400",
    });
    const tools = new AmbienceAITools("token");

    const result = await tools.executeTool("generate_image", {
      prompt: "a cat",
      brandKitId: "kit-missing",
    });

    expect(textOf(result)).toBe("Error generating image: Brand kit not found");
    (console.error as any).mockRestore();
  });
});
