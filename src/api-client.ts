import axios, { AxiosInstance } from "axios";
import type {
  ApiResponse,
  CreditsResponse,
  Creation,
  GenerateImageRequest,
  GenerateImageMultiRequest,
  GenerateVideoRequest,
  GenerateMusicRequest,
  GenerateSpeechRequest,
  GenerateAudioRequest,
  GenerateChartRequest,
  UpscaleImageRequest,
  TranscribeAudioRequest,
  LibraryRequest,
} from "./types.js";

// ---------------------------------------------------------------------------
// Model info types (matches GET /api/models response)
// ---------------------------------------------------------------------------

export interface ModelTaskInfo {
  task: string;
  creditCost: number;
  estimatedDuration: number;
  durationDisplay: string;
}

export interface ModelInfo {
  uiValue: string;
  id: string;
  displayName: string;
  description: string;
  mediaCategory: string;
  tier: string;
  tasks: ModelTaskInfo[];
}

/** A generator from GET /api/models `generators` (e.g. charts). */
export interface GeneratorInfo {
  key: string;
  mediaCategory: string;
  creditCost: number;
  estimatedDuration: number;
  durationDisplay: string;
}

/** Per-task default model uiValues, as served by GET /api/models `defaults`. */
export type ModelDefaults = Record<string, string>;

// Module-level cache for models (5-minute TTL to match API Cache-Control)
let modelsCache: ModelInfo[] | null = null;
let modelDefaultsCache: ModelDefaults | null = null;
let generatorsCache: GeneratorInfo[] | null = null;
let modelsCacheExpiry = 0;
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

/** Clear the module-level model cache (used by tests). */
export function clearModelCache(): void {
  modelsCache = null;
  modelDefaultsCache = null;
  generatorsCache = null;
  modelsCacheExpiry = 0;
}

export class AmbienceAPIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(authToken: string) {
    // Defaults to production so `npx @ambienceai/mcp-server` works out of the
    // box; set AMBIENCE_API_URL (e.g. http://localhost:3000) for local dev.
    const baseURL =
      process.env["AMBIENCE_API_URL"] || "https://www.ambienceai.com";
    this.baseURL = baseURL;

    this.client = axios.create({
      baseURL,
      timeout: 300000, // 5 minutes for long operations
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AmbienceAI-MCP/1.0.0",
        Authorization: authToken.startsWith("Bearer ")
          ? authToken
          : `Bearer ${authToken}`,
      },
    });
  }

  /**
   * Get user's credit balance
   */
  async getCredits(): Promise<ApiResponse<CreditsResponse>> {
    try {
      const response = await this.client.get("/api/credits");
      return { success: true, data: response.data as CreditsResponse };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate an image
   */
  async generateImage(
    request: GenerateImageRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
      };

      // Add optional parameters only if they exist. An omitted model lets the
      // API apply its current server-side default.
      if (request.model) requestBody.model = request.model;
      if (request.seed !== undefined) requestBody.seed = request.seed;
      if (request.outputFormat) requestBody.outputFormat = request.outputFormat;
      if (request.imageUrl) requestBody.imageUrl = request.imageUrl;
      if (request.guideImageUrl)
        requestBody.guideImageUrl = request.guideImageUrl;

      const response = await this.client.post(
        "/api/generate/image",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate an image with multiple input images
   */
  async generateImageMulti(
    request: GenerateImageMultiRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        prompt: request.prompt,
        imageUrls: request.imageUrls,
        aspectRatio: request.aspectRatio,
      };

      // Add optional parameters only if they exist. An omitted model lets the
      // API apply its current server-side default.
      if (request.model) requestBody.model = request.model;
      if (request.seed !== undefined) requestBody.seed = request.seed;
      if (request.outputFormat) requestBody.outputFormat = request.outputFormat;

      // For now, use the first image as imageUrl and second as guideImageUrl
      // This is a simplified approach until the API fully supports multiple images
      requestBody.imageUrl = request.imageUrls[0];
      if (request.imageUrls.length > 1) {
        requestBody.guideImageUrl = request.imageUrls[1];
      }

      const response = await this.client.post(
        "/api/generate/image",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate a video
   */
  async generateVideo(
    request: GenerateVideoRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
        duration: request.duration,
      };

      // Add optional parameters. An omitted model lets the API apply its
      // current server-side default.
      if (request.model) requestBody.model = request.model;
      if (request.imageUrl) requestBody.imageUrl = request.imageUrl;
      if (request.negativePrompt)
        requestBody.negativePrompt = request.negativePrompt;
      if (request.preprocessImagePrompt)
        requestBody.preprocessImagePrompt = request.preprocessImagePrompt;

      const response = await this.client.post(
        "/api/generate/video",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate music
   */
  async generateMusic(
    request: GenerateMusicRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        type: "music",
        prompt: request.prompt,
      };

      // Add optional parameters only if they exist
      if (request.genre) requestBody.genre = request.genre;
      if (request.mood) requestBody.mood = request.mood;
      if (request.lyrics) requestBody.lyrics = request.lyrics;

      const response = await this.client.post(
        "/api/generate/audio",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate speech
   */
  async generateSpeech(
    request: GenerateSpeechRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        type: "speech",
        text: request.text,
        voice: request.voice,
        language: request.language,
      };

      // Add optional parameters only if they exist
      if (request.speed) requestBody.speed = request.speed;

      const response = await this.client.post(
        "/api/generate/audio",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /** Generate a chart (static image or animated video). */
  async generateChart(
    request: GenerateChartRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        chartType: request.chartType,
        title: request.title,
      };

      if (request.format) requestBody.format = request.format;
      if (request.data) requestBody.data = request.data;
      if (request.value !== undefined) requestBody.value = request.value;
      if (request.subtitle) requestBody.subtitle = request.subtitle;
      if (request.caption) requestBody.caption = request.caption;
      if (request.valuePrefix) requestBody.valuePrefix = request.valuePrefix;
      if (request.valueSuffix) requestBody.valueSuffix = request.valueSuffix;
      if (request.aspectRatio) requestBody.aspectRatio = request.aspectRatio;
      if (request.accentColor) requestBody.accentColor = request.accentColor;
      if (request.backgroundColor)
        requestBody.backgroundColor = request.backgroundColor;

      const response = await this.client.post(
        "/api/generate/chart",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upscale an image to higher resolution
   */
  async generateUpscale(
    request: UpscaleImageRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        imageUrl: request.imageUrl,
        upscaleFactor: request.upscaleFactor,
      };

      if (request.originalPrompt)
        requestBody.originalPrompt = request.originalPrompt;

      const response = await this.client.post(
        "/api/generate/upscale",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Transcribe audio to text
   */
  async transcribeAudio(
    request: TranscribeAudioRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const response = await this.client.post("/api/generate/transcription", {
        audioUrl: request.audioUrl,
      });

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate audio (speech or music) - Legacy method for backward compatibility
   */
  async generateAudio(
    request: GenerateAudioRequest,
  ): Promise<ApiResponse<Creation>> {
    try {
      const requestBody = {
        type: request.type,
        prompt: request.prompt,
        ...(request.voice && { voice: request.voice }),
        ...(request.language && { language: request.language }),
      };

      const response = await this.client.post(
        "/api/generate/audio",
        requestBody,
      );

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upload a file (as data URL) and get back a CDN URL
   */
  async uploadFile(dataUrl: string): Promise<string> {
    const response = await this.client.post("/api/mcp/upload", {
      imageData: dataUrl,
    });
    const data = response.data as { url: string };
    return data.url;
  }

  /**
   * Get user's library of creations
   */
  async getLibrary(request: LibraryRequest): Promise<ApiResponse<Creation[]>> {
    try {
      const response = await this.client.get("/api/library", {
        params: {
          limit: request.limit,
          type: "all",
        },
      });

      // Extract creations array from API response format { creations: [], total: number, ... }
      const apiResponse = response.data as { creations: Creation[] };
      return { success: true, data: apiResponse.creations };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get creation status by ID
   */
  async getCreationStatus(creationId: string): Promise<ApiResponse<Creation>> {
    try {
      const response = await this.client.get(
        `/api/creations/${creationId}/status`,
      );
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get available models with pricing info (public endpoint, no auth needed).
   * Results are cached for 5 minutes.
   */
  async getModels(): Promise<ModelInfo[]> {
    await this.fetchModelData();
    return modelsCache ?? [];
  }

  /**
   * Get the server's per-task default models (from /api/models `defaults`).
   * Returns an empty map on older API versions or fetch failure, in which
   * case callers should avoid naming a specific default.
   */
  async getModelDefaults(): Promise<ModelDefaults> {
    await this.fetchModelData();
    return modelDefaultsCache ?? {};
  }

  /**
   * Get generators (e.g. charts) from /api/models `generators`. Empty when the
   * backend doesn't serve the key, so callers fall back to generic descriptions.
   */
  async getGenerators(): Promise<GeneratorInfo[]> {
    await this.fetchModelData();
    return generatorsCache ?? [];
  }

  private async fetchModelData(): Promise<void> {
    if (modelsCache && Date.now() < modelsCacheExpiry) {
      return;
    }

    try {
      const response = await axios.get(`${this.baseURL}/api/models`, {
        timeout: 5000,
        headers: { "User-Agent": "AmbienceAI-MCP/1.0.0" },
      });
      const data = response.data as {
        models: ModelInfo[];
        defaults?: ModelDefaults;
        generators?: GeneratorInfo[];
      };
      modelsCache = data.models;
      modelDefaultsCache = data.defaults ?? null;
      generatorsCache = data.generators ?? null;
      modelsCacheExpiry = Date.now() + MODELS_CACHE_TTL_MS;
    } catch (error) {
      console.error(
        "[MCP API Client] Failed to fetch models:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  private handleError(error: any): ApiResponse<never> {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const status = error.response?.status;
      const description =
        data?.error_description || data?.message || data?.error;
      let errorMessage =
        description || error.message || "An unknown error occurred";

      // Creators often discover this server straight from the NPM package
      // page, so auth failures explain how to get set up.
      if (status === 401) {
        errorMessage +=
          " Your access token is missing, invalid, or expired. Create a fresh token in your Ambience AI settings (https://www.ambienceai.com/settings/api-token) and update your Claude configuration. Setup guide: https://www.ambienceai.com/guides/connect-claude-mcp";
      } else if (data?.error === "subscription_required") {
        errorMessage +=
          " MCP access is included with the Ambience AI Premium, Team, and Business plans. Sign up at https://www.ambienceai.com/pricing, then create an API token in Settings. Setup guide: https://www.ambienceai.com/guides/connect-claude-mcp";
      }

      console.error("[MCP API Client] Request failed:", {
        status,
        error: data?.error,
        description: data?.error_description,
        message: error.message,
        url: error.config?.url,
      });

      return { success: false, error: errorMessage };
    }

    console.error("[MCP API Client] Non-HTTP error:", error);
    return {
      success: false,
      error: error?.message || "An unknown error occurred",
    };
  }
}
