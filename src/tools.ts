import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { AmbienceAPIClient, type ModelInfo } from './api-client.js';
import {
  GenerateImageRequestSchema,
  GenerateImageMultiRequestSchema,
  GenerateVideoRequestSchema,
  GenerateMusicRequestSchema,
  GenerateSpeechRequestSchema,
  GenerateAudioRequestSchema,
  UpscaleImageRequestSchema,
  TranscribeAudioRequestSchema,
  LibraryRequestSchema,
  CreditsResponseSchema
} from './types.js';
import { getCompletionTimeInfo } from './constants.js';

const MIME_TYPE_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

function isFilePath(input: string): boolean {
  return input.startsWith('/') || input.startsWith('~') || input.startsWith('./');
}

function getMimeTypeFromPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase().slice(1);
  return MIME_TYPE_MAP[ext] || 'application/octet-stream';
}

/**
 * Determine media type and MIME type from URL and creation type.
 * MCP SDK only supports 'text', 'image', and 'audio' content types.
 * Video content should be skipped (URL is provided in text response instead).
 */
export function determineMediaType(url: string, creationType: string): {
  skip: boolean;
  contentType?: 'image' | 'audio';
  mimeType?: string;
} {
  // Video check - skip these (MCP SDK doesn't support video)
  if (creationType === 'video' || url.match(/\.(mp4|webm|mov)$/i)) {
    return { skip: true };
  }

  // Extract extension case-insensitively
  const ext = url.split('.').pop()?.toLowerCase();

  // Image detection
  if (creationType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    return {
      skip: false,
      contentType: 'image',
      mimeType: mimeMap[ext || ''] || 'image/jpeg',
    };
  }

  // Audio detection
  if (['speech', 'music'].includes(creationType) || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) {
    const mimeMap: Record<string, string> = {
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/m4a',
      mp3: 'audio/mpeg',
    };
    return {
      skip: false,
      contentType: 'audio',
      mimeType: mimeMap[ext || ''] || 'audio/mpeg',
    };
  }

  // Default to image with generic MIME type
  return { skip: false, contentType: 'image', mimeType: 'application/octet-stream' };
}

// ---------------------------------------------------------------------------
// Dynamic model description helpers
// ---------------------------------------------------------------------------

/** Task types relevant to each MCP tool */
const TOOL_TASK_MAP: Record<string, string[]> = {
  generate_image: ['text_to_image', 'image_to_image'],
  generate_image_multi: ['image_to_image_multi'],
  generate_video: ['text_to_video', 'image_to_video'],
  generate_music: ['text_to_audio_music'],
  generate_speech: ['text_to_audio_speech'],
  upscale_image: ['image_upscale'],
  transcribe_audio: ['audio_transcription'],
};

/** Filter models that support any of the given task types */
export function getModelsForTasks(models: ModelInfo[], taskTypes: string[]): ModelInfo[] {
  return models.filter(m =>
    m.tasks.some(t => taskTypes.includes(t.task))
  );
}

/** Build the model parameter description for multi-model tools */
export function buildModelDescription(
  models: ModelInfo[],
  taskTypes: string[],
  defaultModel: string
): string {
  const relevant = getModelsForTasks(models, taskTypes);
  if (relevant.length === 0) return `The AI model to use (default: "${defaultModel}").`;

  const parts = relevant.map(m => {
    const tasks = m.tasks.filter(t => taskTypes.includes(t.task));
    const costs = [...new Set(tasks.map(t => t.creditCost))];
    const costStr = costs.length === 1 ? `${costs[0]} credits` : `${Math.min(...costs)}-${Math.max(...costs)} credits`;
    const isDefault = m.uiValue === defaultModel ? ', default' : '';
    return `"${m.uiValue}" (${m.displayName}, ${costStr}${isDefault})`;
  });

  let desc = `The AI model to use. Available: ${parts.join(', ')}.`;

  // Add task-specific model hints for image tools
  if (taskTypes.includes('image_to_image')) {
    const editModels = relevant
      .filter(m => m.tasks.some(t => t.task === 'image_to_image'))
      .map(m => `"${m.uiValue}"`);
    if (editModels.length > 0 && editModels.length < relevant.length) {
      desc += ` Models supporting image editing: ${editModels.join(', ')}.`;
    }
  }

  return desc;
}

/** Build cost string for single-model tools, e.g. " (40 credits)" */
export function buildToolCostDescription(models: ModelInfo[], taskType: string): string {
  const relevant = getModelsForTasks(models, [taskType]);
  if (relevant.length === 0) return '';
  const costs = relevant.flatMap(m => m.tasks.filter(t => t.task === taskType).map(t => t.creditCost));
  if (costs.length === 0) return '';
  const unique = [...new Set(costs)];
  if (unique.length === 1) return ` (${unique[0]} credits)`;
  return ` (${Math.min(...unique)}-${Math.max(...unique)} credits)`;
}

export class AmbienceAITools {
  private apiClient: AmbienceAPIClient;

  constructor(authToken: string) {
    this.apiClient = new AmbienceAPIClient(authToken);
  }

  /**
   * Resolve a file path or URL to a CDN URL.
   * If the input is already an HTTP(S) URL, returns it as-is.
   * If it's a local file path, reads the file, uploads it, and returns the CDN URL.
   */
  private async resolveFileUrl(input: string): Promise<string> {
    if (!isFilePath(input)) {
      return input;
    }

    const filePath = input.startsWith('~')
      ? input.replace(/^~/, process.env['HOME'] || '')
      : input;

    const fileBuffer = await readFile(filePath);
    const mimeType = getMimeTypeFromPath(filePath);
    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    return await this.apiClient.uploadFile(dataUrl);
  }
  
  /**
   * Get all available tools (fetches model info for dynamic descriptions)
   */
  async getTools(): Promise<Tool[]> {
    let models: ModelInfo[] = [];
    try {
      models = await this.apiClient.getModels();
    } catch {
      // Fall back to empty — descriptions will omit cost info
    }

    const imageModelDesc = models.length > 0
      ? buildModelDescription(models, TOOL_TASK_MAP['generate_image']!, 'flux_2_pro')
      : 'The AI model to use (default: "flux_2_pro").';

    const imageMultiModelDesc = models.length > 0
      ? buildModelDescription(models, TOOL_TASK_MAP['generate_image_multi']!, 'flux_kontext')
      : 'The AI model for multi-image generation (default: "flux_kontext").';

    const videoModelDesc = models.length > 0
      ? buildModelDescription(models, TOOL_TASK_MAP['generate_video']!, 'wan')
      : 'The AI model for video generation (default: "wan").';

    const musicCostStr = buildToolCostDescription(models, 'text_to_audio_music');
    const speechCostStr = buildToolCostDescription(models, 'text_to_audio_speech');
    const upscaleCostStr = buildToolCostDescription(models, 'image_upscale');
    const transcribeCostStr = buildToolCostDescription(models, 'audio_transcription');

    return [
      {
        name: 'get_credits',
        description: 'Check the user\'s credit balance for AI generations',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'generate_image',
        description: 'Generate or edit an image from a text prompt using AI. Supports text-to-image, image-to-image editing, and style transfer. Prompts are automatically enhanced server-side for optimal quality.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt describing the image to generate or how to edit the input image'
            },
            aspectRatio: {
              type: 'string',
              enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
              description: 'The aspect ratio of the generated image',
              default: '16:9'
            },
            model: {
              type: 'string',
              description: imageModelDesc,
              default: 'flux_2_pro'
            },
            outputFormat: {
              type: 'string',
              enum: ['jpeg', 'png'],
              description: 'The output format of the generated image (optional)'
            },
            seed: {
              type: 'number',
              description: 'Random seed for reproducible results (optional)'
            },
            imageUrl: {
              type: 'string',
              description: 'URL or local file path of an input image for image-to-image editing. Supports URLs (https://...) and local paths (/path/to/image.jpg, ~/image.png). (optional)'
            },
            guideImageUrl: {
              type: 'string',
              description: 'URL or local file path of a reference image for style transfer or guidance. Supports URLs (https://...) and local paths (/path/to/image.jpg, ~/image.png). (optional)'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'generate_image_multi',
        description: 'Generate an image using multiple input images for complex editing, composition, or style mixing.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt describing how to combine or edit the input images'
            },
            imageUrls: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 5,
              description: 'Array of image URLs or local file paths to use as inputs (1-5 images). Supports URLs (https://...) and local paths (/path/to/image.jpg, ~/image.png).'
            },
            aspectRatio: {
              type: 'string',
              enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
              description: 'The aspect ratio of the generated image',
              default: '16:9'
            },
            model: {
              type: 'string',
              description: imageMultiModelDesc,
              default: 'flux_kontext'
            },
            outputFormat: {
              type: 'string',
              enum: ['jpeg', 'png'],
              description: 'The output format of the generated image (optional)'
            },
            seed: {
              type: 'number',
              description: 'Random seed for reproducible results (optional)'
            }
          },
          required: ['prompt', 'imageUrls']
        }
      },
      {
        name: 'generate_video',
        description: 'Generate a video from a text prompt or animate an image. Prompts are automatically enhanced server-side for optimal quality.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt describing the video to generate or how to animate the input image'
            },
            aspectRatio: {
              type: 'string',
              enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
              description: 'The aspect ratio of the generated video',
              default: '16:9'
            },
            duration: {
              type: 'number',
              minimum: 1,
              maximum: 30,
              description: 'Duration of the video in seconds',
              default: 5
            },
            model: {
              type: 'string',
              description: videoModelDesc,
              default: 'wan'
            },
            imageUrl: {
              type: 'string',
              description: 'URL or local file path of an input image to animate into video. Supports URLs (https://...) and local paths (/path/to/image.jpg, ~/image.png). (optional)'
            },
            negativePrompt: {
              type: 'string',
              description: 'Elements to suppress from generation (e.g., "camera movement, zoom, pan"). Optional.'
            },
            preprocessImagePrompt: {
              type: 'string',
              description: 'Description of the first frame for text-to-video. Not used for image-to-video. Optional.'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'generate_music',
        description: `Generate music from a text prompt using AI${musicCostStr}. Create instrumental tracks, songs with lyrics, or ambient soundscapes. Prompts are automatically enhanced server-side for optimal quality.`,
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt describing the music to generate (e.g., "upbeat electronic dance music", "calm piano ballad")'
            },
            genre: {
              type: 'string',
              description: 'Musical genre (e.g., "rock", "jazz", "classical", "electronic") (optional)'
            },
            mood: {
              type: 'string',
              description: 'Mood or atmosphere (e.g., "energetic", "melancholic", "peaceful") (optional)'
            },
            lyrics: {
              type: 'string',
              description: 'Lyrics to include in the song (optional)'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'generate_speech',
        description: `Generate speech from text using AI text-to-speech${speechCostStr}. Convert written text into natural-sounding speech.`,
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to convert to speech'
            },
            voice: {
              type: 'string',
              description: 'Voice to use for speech generation',
              default: 'af_heart'
            },
            language: {
              type: 'string',
              enum: [
                'american-english',
                'british-english',
                'japanese',
                'mandarin-chinese',
                'spanish',
                'french',
                'hindi',
                'italian',
                'brazilian-portuguese'
              ],
              description: 'Language for speech generation',
              default: 'american-english'
            },
            speed: {
              type: 'number',
              minimum: 0.25,
              maximum: 4.0,
              description: 'Speech speed multiplier (0.25x to 4.0x) (optional)'
            }
          },
          required: ['text']
        }
      },
      {
        name: 'generate_audio',
        description: 'Generate speech or music from a text prompt using AI (legacy tool - use generate_music or generate_speech for better control)',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt or script for audio generation'
            },
            type: {
              type: 'string',
              enum: ['speech', 'music'],
              description: 'Type of audio to generate'
            },
            voice: {
              type: 'string',
              description: 'Voice to use for speech generation (optional)',
              default: 'af_heart'
            },
            language: {
              type: 'string',
              description: 'Language for speech generation (optional)',
              default: 'american-english'
            },
          },
          required: ['prompt', 'type']
        }
      },
      {
        name: 'transcribe_audio',
        description: `Transcribe audio to text using AI speech recognition${transcribeCostStr}. Converts speech to text, generates subtitles or captions.`,
        inputSchema: {
          type: 'object',
          properties: {
            audioUrl: {
              type: 'string',
              description: 'URL of the audio file to transcribe'
            }
          },
          required: ['audioUrl']
        }
      },
      {
        name: 'upscale_image',
        description: `Upscale an image to higher resolution using AI${upscaleCostStr}. Increase image size up to 4x while preserving quality.`,
        inputSchema: {
          type: 'object',
          properties: {
            imageUrl: {
              type: 'string',
              description: 'URL or local file path of the image to upscale. Supports URLs (https://...) and local paths (/path/to/image.jpg, ~/image.png).'
            },
            upscaleFactor: {
              type: 'number',
              minimum: 1,
              maximum: 4,
              description: 'How much to increase the resolution (1-4x)',
              default: 2
            },
            originalPrompt: {
              type: 'string',
              description: 'The original prompt used to generate the image (optional, improves upscale quality)'
            }
          },
          required: ['imageUrl']
        }
      },
      {
        name: 'get_library',
        description: 'Get a list of the user\'s generated creations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Number of creations to return',
              default: 10
            },
            offset: {
              type: 'number',
              minimum: 0,
              description: 'Number of creations to skip for pagination',
              default: 0
            }
          },
          required: []
        }
      },
      {
        name: 'get_creation_status',
        description: 'Check the status of a specific creation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            creationId: {
              type: 'string',
              description: 'The unique ID of the creation to check'
            }
          },
          required: ['creationId']
        }
      }
    ];
  }
  
  /**
   * Execute a tool by name with given arguments
   */
  async executeTool(name: string, args: any) {
    switch (name) {
      case 'get_credits':
        return await this.getCredits();
        
      case 'generate_image':
        return await this.generateImage(args);

      case 'generate_image_multi':
        return await this.generateImageMulti(args);
        
      case 'generate_video':
        return await this.generateVideo(args);

      case 'generate_music':
        return await this.generateMusic(args);

      case 'generate_speech':
        return await this.generateSpeech(args);
        
      case 'generate_audio':
        return await this.generateAudio(args);

      case 'transcribe_audio':
        return await this.transcribeAudio(args);

      case 'upscale_image':
        return await this.upscaleImage(args);

      case 'get_library':
        return await this.getLibrary(args);
        
      case 'get_creation_status':
        return await this.getCreationStatus(args);
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  
  private async getCredits() {
    const result = await this.apiClient.getCredits();
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting credits: ${result.error}`
        }]
      };
    }
    
    const credits = CreditsResponseSchema.parse(result.data);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Credit Balance: ${credits.credits}

${credits.credits < 10 ? '⚠️ Low credit balance! Visit ambienceai.com to add more credits.' : ''}`
      }]
    };
  }
  
  private async generateImage(args: any) {
    const request = GenerateImageRequestSchema.parse(args);

    // Resolve file paths to CDN URLs
    if (request.imageUrl) {
      request.imageUrl = await this.resolveFileUrl(request.imageUrl);
    }
    if (request.guideImageUrl) {
      request.guideImageUrl = await this.resolveFileUrl(request.guideImageUrl);
    }

    const result = await this.apiClient.generateImage(request);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating image: ${result.error}`
        }]
      };
    }
    
    const timeInfo = getCompletionTimeInfo(result.data?.generationType);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Image generation started successfully!

Creation ID: ${result.data?.id}
Prompt: ${request.prompt}
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The image is being generated. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }
  
  private async generateVideo(args: any) {
    const request = GenerateVideoRequestSchema.parse(args);

    // Resolve file paths to CDN URLs
    if (request.imageUrl) {
      request.imageUrl = await this.resolveFileUrl(request.imageUrl);
    }

    const result = await this.apiClient.generateVideo(request);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating video: ${result.error}`
        }]
      };
    }
    
    const timeInfo = getCompletionTimeInfo(result.data?.generationType);
    
    return {
      content: [{
        type: 'text' as const, 
        text: `Video generation started successfully!

Creation ID: ${result.data?.id}
Prompt: ${request.prompt}
Duration: ${request.duration} seconds
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The video is being generated. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }
  
  private async generateAudio(args: any) {
    const request = GenerateAudioRequestSchema.parse(args);
    const result = await this.apiClient.generateAudio(request);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating ${request.type}: ${result.error}`
        }]
      };
    }
    
    const timeInfo = getCompletionTimeInfo(result.data?.generationType);
    
    return {
      content: [{
        type: 'text' as const,
        text: `${request.type.charAt(0).toUpperCase() + request.type.slice(1)} generation started successfully!

Creation ID: ${result.data?.id}
Prompt: ${request.prompt}
Type: ${request.type}
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The ${request.type} is being generated. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }

  private async generateImageMulti(args: any) {
    const request = GenerateImageMultiRequestSchema.parse(args);

    // Resolve file paths to CDN URLs
    request.imageUrls = await Promise.all(
      request.imageUrls.map(url => this.resolveFileUrl(url))
    );

    const result = await this.apiClient.generateImageMulti(request);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating multi-image: ${result.error}`
        }]
      };
    }
    
    const timeInfo = getCompletionTimeInfo(result.data?.generationType);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Multi-image generation started successfully!

Creation ID: ${result.data?.id}
Prompt: ${request.prompt}
Input Images: ${request.imageUrls.length} images
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The multi-image composition is being generated. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }

  private async generateMusic(args: any) {
    const request = GenerateMusicRequestSchema.parse(args);
    const result = await this.apiClient.generateMusic(request);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating music: ${result.error}`
        }]
      };
    }
    
    const timeInfo = getCompletionTimeInfo(result.data?.generationType);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Music generation started successfully!

Creation ID: ${result.data?.id}
Prompt: ${request.prompt}
${request.genre ? `Genre: ${request.genre}` : ''}
${request.mood ? `Mood: ${request.mood}` : ''}
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The music is being generated. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }

  private async generateSpeech(args: any) {
    const request = GenerateSpeechRequestSchema.parse(args);
    const result = await this.apiClient.generateSpeech(request);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating speech: ${result.error}`
        }]
      };
    }
    
    const timeInfo = getCompletionTimeInfo(result.data?.generationType);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Speech generation started successfully!

Creation ID: ${result.data?.id}
Text: ${request.text.length > 100 ? request.text.substring(0, 100) + '...' : request.text}
Voice: ${request.voice}
Language: ${request.language}
${request.speed ? `Speed: ${request.speed}x` : ''}
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The speech is being generated. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }
  
  private async transcribeAudio(args: any) {
    const request = TranscribeAudioRequestSchema.parse(args);
    const result = await this.apiClient.transcribeAudio(request);

    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error transcribing audio: ${result.error}`
        }]
      };
    }

    const timeInfo = getCompletionTimeInfo(result.data?.generationType);

    return {
      content: [{
        type: 'text' as const,
        text: `Transcription started successfully!

Creation ID: ${result.data?.id}
Audio URL: ${request.audioUrl}
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The transcription is being processed. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }

  private async upscaleImage(args: any) {
    const request = UpscaleImageRequestSchema.parse(args);

    // Resolve file paths to CDN URLs
    request.imageUrl = await this.resolveFileUrl(request.imageUrl);

    const result = await this.apiClient.generateUpscale(request);

    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error upscaling image: ${result.error}`
        }]
      };
    }

    const timeInfo = getCompletionTimeInfo(result.data?.generationType);

    return {
      content: [{
        type: 'text' as const,
        text: `Image upscale started successfully!

Creation ID: ${result.data?.id}
Image URL: ${request.imageUrl}
Upscale Factor: ${request.upscaleFactor}x
Status: ${result.data?.status}
Expected completion: ${timeInfo.displayTime}

The image is being upscaled. You can check its status using the get_creation_status tool ${timeInfo.pollingSuggestion}.`
      }]
    };
  }

  private async getLibrary(args: any) {
    const request = LibraryRequestSchema.parse(args || {});
    const result = await this.apiClient.getLibrary(request);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting library: ${result.error}`
        }]
      };
    }
    
    const creations = result.data || [];
    
    if (creations.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No creations found in your library.'
        }]
      };
    }
    
    const libraryText = creations.map(creation => 
      `• ${creation.id} - ${creation.type} - "${creation.prompt}" - ${creation.status} (${creation.created_at})`
    ).join('\n');
    
    return {
      content: [{
        type: 'text' as const,
        text: `Your Library (${creations.length} creations):

${libraryText}`
      }]
    };
  }
  
  private async getCreationStatus(args: any) {
    const { creationId } = args;
    
    if (!creationId) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Error: creationId is required'
        }]
      };
    }
    
    const result = await this.apiClient.getCreationStatus(creationId);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting creation status: ${result.error}`
        }]
      };
    }
    
    const creation = result.data! as any; // Use any to access both camelCase and snake_case fields

    // Build text response with correct field names
    let statusText = `Creation Status:

ID: ${creation.id}
Type: ${creation.type}
Prompt: ${creation.prompt}
Status: ${creation.status}
Created: ${creation.createdAt || creation.created_at || 'Unknown'}`;

    // Add polling guidance for pending/processing creations
    if ((creation.status === 'pending' || creation.status === 'processing') && creation.estimatedCompletionAt) {
      const estimatedCompletion = new Date(creation.estimatedCompletionAt);
      // Validate the date is valid before calculating
      if (!isNaN(estimatedCompletion.getTime())) {
        const now = new Date();
        const remainingSeconds = Math.max(0, Math.round((estimatedCompletion.getTime() - now.getTime()) / 1000));
        statusText += `\nExpected completion: ${creation.estimatedCompletionAt} (in ~${remainingSeconds} seconds)`;
      }

      if (creation.retryAfterSeconds && typeof creation.retryAfterSeconds === 'number') {
        statusText += `\nPoll again in: ${creation.retryAfterSeconds} seconds`;
      }
    }

    // Add completed/URL/error info
    if (creation.completedAt || creation.completed_at) {
      statusText += `\nCompleted: ${creation.completedAt || creation.completed_at}`;
    }
    if (creation.mediaUrl || creation.url) {
      statusText += `\nURL: ${creation.mediaUrl || creation.url}`;
    }
    if (creation.error) {
      statusText += `\nError: ${creation.error}`;
    }

    const content: any[] = [{
      type: 'text' as const,
      text: statusText
    }];

    // If creation is completed and has media URL, fetch and include the media
    if (creation.status === 'completed' && (creation.mediaUrl || creation.url)) {
      try {
        const mediaUrl = creation.mediaUrl || creation.url;
        const mediaContent = await this.fetchMediaAsBase64(mediaUrl, creation.type);
        if (mediaContent) {
          content.push(mediaContent);
        }
      } catch (error) {
        // Fail silently - still return text status if media fetch fails
        console.error('Failed to fetch media content:', error);
      }
    }
    
    return { content };
  }

  /**
   * Fetch media content and convert to base64 for MCP response
   */
  private async fetchMediaAsBase64(url: string, creationType: string) {
    try {
      const mediaType = determineMediaType(url, creationType);

      // Skip unsupported content types (e.g., video)
      if (mediaType.skip) {
        return null;
      }

      const response = await fetch(url, {
        timeout: 30000 // 30 second timeout
      } as any);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      return {
        type: mediaType.contentType,
        data: base64,
        mimeType: mediaType.mimeType,
      };
    } catch (error) {
      console.error('Error fetching media:', error);
      return null;
    }
  }
}