import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AmbienceAPIClient } from './api-client.js';
import { 
  GenerateImageRequestSchema,
  GenerateImageMultiRequestSchema,
  GenerateVideoRequestSchema,
  GenerateMusicRequestSchema,
  GenerateSpeechRequestSchema,
  GenerateAudioRequestSchema,
  LibraryRequestSchema,
  CreditsResponseSchema
} from './types.js';
import { getCompletionTimeInfo } from './constants.js';

export class AmbienceAITools {
  private apiClient: AmbienceAPIClient;
  
  constructor(authToken: string) {
    this.apiClient = new AmbienceAPIClient(authToken);
  }
  
  /**
   * Get all available tools
   */
  getTools(): Tool[] {
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
        description: 'Generate or edit an image from a text prompt using AI. Supports text-to-image, image-to-image editing, and style transfer.',
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
              enum: ['flux', 'gpt_image'],
              description: 'The AI model to use for generation',
              default: 'flux'
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
              description: 'URL of an input image for image-to-image editing (optional)'
            },
            guideImageUrl: {
              type: 'string', 
              description: 'URL of a reference image for style transfer or guidance (optional)'
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
              description: 'Array of image URLs to use as inputs (1-5 images)'
            },
            aspectRatio: {
              type: 'string',
              enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
              description: 'The aspect ratio of the generated image',
              default: '16:9'
            },
            model: {
              type: 'string',
              enum: ['flux', 'gpt_image'],
              description: 'The AI model to use for generation',
              default: 'flux'
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
        description: 'Generate a video from a text prompt or animate an image using AI. Supports text-to-video and image-to-video.',
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
            quality: {
              type: 'string',
              enum: ['standard', 'cinematic'],
              description: 'The AI model quality to use',
              default: 'standard'
            },
            imageUrl: {
              type: 'string',
              description: 'URL of an input image to animate into video (optional)'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'generate_music',
        description: 'Generate music from a text prompt using AI. Create instrumental tracks, songs with lyrics, or ambient soundscapes.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The text prompt describing the music to generate (e.g., "upbeat electronic dance music", "calm piano ballad")'
            },
            duration: {
              type: 'number',
              minimum: 10,
              maximum: 180,
              description: 'Duration of the music in seconds (10-180 seconds)',
              default: 30
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
        description: 'Generate speech from text using AI text-to-speech. Convert written text into natural-sounding speech.',
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
            duration: {
              type: 'number',
              description: 'Duration in seconds for music generation (optional)'
            }
          },
          required: ['prompt', 'type']
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
${request.duration ? `Duration: ${request.duration} seconds` : ''}
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
    const statusText = `Creation Status:

ID: ${creation.id}
Type: ${creation.type}
Prompt: ${creation.prompt}
Status: ${creation.status}
Created: ${creation.createdAt || creation.created_at || 'Unknown'}
${creation.completedAt || creation.completed_at ? `Completed: ${creation.completedAt || creation.completed_at}` : ''}
${creation.mediaUrl || creation.url ? `URL: ${creation.mediaUrl || creation.url}` : ''}
${creation.error ? `Error: ${creation.error}` : ''}`;

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
      const response = await fetch(url, {
        timeout: 30000 // 30 second timeout
      } as any);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Determine content type and MIME type based on creation type and URL
      let contentType: 'image' | 'video' | 'audio' = 'image';
      let mimeType = 'application/octet-stream';
      
      if (creationType === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        contentType = 'image';
        if (url.includes('.png')) mimeType = 'image/png';
        else if (url.includes('.gif')) mimeType = 'image/gif';
        else if (url.includes('.webp')) mimeType = 'image/webp';
        else mimeType = 'image/jpeg';
      } else if (creationType === 'video' || url.match(/\.(mp4|webm|mov)$/i)) {
        contentType = 'video';
        if (url.includes('.webm')) mimeType = 'video/webm';
        else if (url.includes('.mov')) mimeType = 'video/quicktime';
        else mimeType = 'video/mp4';
      } else if (creationType === 'speech' || creationType === 'music' || url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        contentType = 'audio';
        if (url.includes('.wav')) mimeType = 'audio/wav';
        else if (url.includes('.ogg')) mimeType = 'audio/ogg';
        else if (url.includes('.m4a')) mimeType = 'audio/m4a';
        else mimeType = 'audio/mpeg';
      }

      return {
        type: contentType,
        data: base64,
        mimeType: mimeType
      };
    } catch (error) {
      console.error('Error fetching media:', error);
      return null;
    }
  }
}