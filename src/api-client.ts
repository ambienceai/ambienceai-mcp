import axios, { AxiosInstance } from 'axios';
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
  UpscaleImageRequest,
  TranscribeAudioRequest,
  LibraryRequest
} from './types.js';

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

// Module-level cache for models (5-minute TTL to match API Cache-Control)
let modelsCache: ModelInfo[] | null = null;
let modelsCacheExpiry = 0;
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

export class AmbienceAPIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(authToken: string) {
    // Defaults to production so `npx @ambienceai/mcp-server` works out of the
    // box; set AMBIENCE_API_URL (e.g. http://localhost:3000) for local dev.
    const baseURL = process.env['AMBIENCE_API_URL'] || 'https://www.ambienceai.com';
    this.baseURL = baseURL;
    
    this.client = axios.create({
      baseURL,
      timeout: 300000, // 5 minutes for long operations
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AmbienceAI-MCP/1.0.0',
        'Authorization': authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`
      }
    });
  }
  
  /**
   * Get user's credit balance
   */
  async getCredits(): Promise<ApiResponse<CreditsResponse>> {
    try {
      const response = await this.client.get('/api/credits');
      return { success: true, data: response.data as CreditsResponse };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Generate an image
   */
  async generateImage(request: GenerateImageRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
        model: request.model,
      };

      // Add optional parameters only if they exist
      if (request.seed !== undefined) requestBody.seed = request.seed;
      if (request.outputFormat) requestBody.outputFormat = request.outputFormat;
      if (request.imageUrl) requestBody.imageUrl = request.imageUrl;
      if (request.guideImageUrl) requestBody.guideImageUrl = request.guideImageUrl;

      const response = await this.client.post('/api/generate/image', requestBody);
      
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate an image with multiple input images
   */
  async generateImageMulti(request: GenerateImageMultiRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        prompt: request.prompt,
        imageUrls: request.imageUrls,
        aspectRatio: request.aspectRatio,
        model: request.model,
      };

      // Add optional parameters only if they exist
      if (request.seed !== undefined) requestBody.seed = request.seed;
      if (request.outputFormat) requestBody.outputFormat = request.outputFormat;

      // For now, use the first image as imageUrl and second as guideImageUrl
      // This is a simplified approach until the API fully supports multiple images
      requestBody.imageUrl = request.imageUrls[0];
      if (request.imageUrls.length > 1) {
        requestBody.guideImageUrl = request.imageUrls[1];
      }

      const response = await this.client.post('/api/generate/image', requestBody);
      
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Generate a video  
   */
  async generateVideo(request: GenerateVideoRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
        duration: request.duration,
        model: request.model,
      };

      // Add optional parameters
      if (request.imageUrl) requestBody.imageUrl = request.imageUrl;
      if (request.negativePrompt) requestBody.negativePrompt = request.negativePrompt;
      if (request.preprocessImagePrompt) requestBody.preprocessImagePrompt = request.preprocessImagePrompt;

      const response = await this.client.post('/api/generate/video', requestBody);
      
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Generate music
   */
  async generateMusic(request: GenerateMusicRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        type: 'music',
        prompt: request.prompt,
      };

      // Add optional parameters only if they exist
      if (request.genre) requestBody.genre = request.genre;
      if (request.mood) requestBody.mood = request.mood;
      if (request.lyrics) requestBody.lyrics = request.lyrics;

      const response = await this.client.post('/api/generate/audio', requestBody);
      
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate speech
   */
  async generateSpeech(request: GenerateSpeechRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        type: 'speech',
        text: request.text,
        voice: request.voice,
        language: request.language,
      };

      // Add optional parameters only if they exist
      if (request.speed) requestBody.speed = request.speed;

      const response = await this.client.post('/api/generate/audio', requestBody);
      
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upscale an image to higher resolution
   */
  async generateUpscale(request: UpscaleImageRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody: any = {
        imageUrl: request.imageUrl,
        upscaleFactor: request.upscaleFactor,
      };

      if (request.originalPrompt) requestBody.originalPrompt = request.originalPrompt;

      const response = await this.client.post('/api/generate/upscale', requestBody);

      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Transcribe audio to text
   */
  async transcribeAudio(request: TranscribeAudioRequest): Promise<ApiResponse<Creation>> {
    try {
      const response = await this.client.post('/api/generate/transcription', {
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
  async generateAudio(request: GenerateAudioRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody = {
        type: request.type,
        prompt: request.prompt,
        ...(request.voice && { voice: request.voice }),
        ...(request.language && { language: request.language })
      };

      const response = await this.client.post('/api/generate/audio', requestBody);
      
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Upload a file (as data URL) and get back a CDN URL
   */
  async uploadFile(dataUrl: string): Promise<string> {
    const response = await this.client.post('/api/mcp/upload', { imageData: dataUrl });
    const data = response.data as { url: string };
    return data.url;
  }

  /**
   * Get user's library of creations
   */
  async getLibrary(request: LibraryRequest): Promise<ApiResponse<Creation[]>> {
    try {
      const response = await this.client.get('/api/library', {
        params: {
          limit: request.limit,
          type: 'all'
        }
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
      const response = await this.client.get(`/api/creations/${creationId}/status`);
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
    if (modelsCache && Date.now() < modelsCacheExpiry) {
      return modelsCache;
    }

    try {
      const response = await axios.get(`${this.baseURL}/api/models`, {
        timeout: 5000,
        headers: { 'User-Agent': 'AmbienceAI-MCP/1.0.0' },
      });
      const data = response.data as { models: ModelInfo[] };
      modelsCache = data.models;
      modelsCacheExpiry = Date.now() + MODELS_CACHE_TTL_MS;
      return modelsCache;
    } catch (error) {
      console.error('[MCP API Client] Failed to fetch models:', error instanceof Error ? error.message : error);
      return modelsCache ?? [];
    }
  }

  private handleError(error: any): ApiResponse<never> {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const description = data?.error_description || data?.message || data?.error;
      const errorMessage = description || error.message || 'An unknown error occurred';

      console.error('[MCP API Client] Request failed:', {
        status: error.response?.status,
        error: data?.error,
        description: data?.error_description,
        message: error.message,
        url: error.config?.url,
      });

      return { success: false, error: errorMessage };
    }

    console.error('[MCP API Client] Non-HTTP error:', error);
    return {
      success: false,
      error: error?.message || 'An unknown error occurred'
    };
  }
}