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
  LibraryRequest
} from './types.js';

export class AmbienceAPIClient {
  private client: AxiosInstance;
  
  constructor(authToken: string) {
    const baseURL = process.env['AMBIENCE_API_URL'] || 'http://localhost:3000';
    
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
        quality: request.quality
      };

      // Add optional imageUrl parameter for image-to-video
      if (request.imageUrl) {
        requestBody.imageUrl = request.imageUrl;
      }

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
      if (request.duration) requestBody.duration = request.duration;
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
   * Generate audio (speech or music) - Legacy method for backward compatibility
   */
  async generateAudio(request: GenerateAudioRequest): Promise<ApiResponse<Creation>> {
    try {
      const requestBody = {
        type: request.type,
        prompt: request.prompt,
        ...(request.voice && { voice: request.voice }),
        ...(request.language && { language: request.language }),
        ...(request.duration && { duration: request.duration })
      };

      const response = await this.client.post('/api/generate/audio', requestBody);
      
      return { success: true, data: response.data as Creation };
    } catch (error) {
      return this.handleError(error);
    }
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
  
  private handleError(error: any): ApiResponse<never> {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.error || 
               error.response?.data?.message ||
               error.message ||
               'An unknown error occurred'
      };
    }
    
    return {
      success: false,
      error: error?.message || 'An unknown error occurred'
    };
  }
}