import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// For ESM, we need to mock before importing
const mockGet = jest.fn<any>();
const mockPost = jest.fn<any>();
const mockCreate = jest.fn(() => ({
  get: mockGet,
  post: mockPost,
}));
const mockIsAxiosError = jest.fn<any>();

jest.unstable_mockModule('axios', () => ({
  default: {
    create: mockCreate,
    isAxiosError: mockIsAxiosError,
  },
}));

// Import after mocking
const { AmbienceAPIClient } = await import('../../api-client.js');

describe('AmbienceAPIClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAxiosError.mockImplementation((error: any) => error?.isAxiosError === true);
  });

  describe('constructor', () => {
    it('creates axios instance with default baseURL', () => {
      delete process.env.AMBIENCE_API_URL;
      new AmbienceAPIClient('test-token');

      expect(mockCreate).toHaveBeenCalled();
      const config = (mockCreate.mock.calls as any[][])[0]?.[0];
      expect(config.baseURL).toBe('http://localhost:3000');
    });

    it('uses AMBIENCE_API_URL env var when set', () => {
      process.env.AMBIENCE_API_URL = 'https://api.ambience.ai';
      new AmbienceAPIClient('test-token');

      const config = (mockCreate.mock.calls as any[][])[0]?.[0];
      expect(config.baseURL).toBe('https://api.ambience.ai');
      delete process.env.AMBIENCE_API_URL;
    });

    it('adds Bearer prefix to token', () => {
      new AmbienceAPIClient('my-token');

      const config = (mockCreate.mock.calls as any[][])[0]?.[0];
      expect(config.headers.Authorization).toBe('Bearer my-token');
    });

    it('does not double-prefix token with Bearer', () => {
      new AmbienceAPIClient('Bearer already-prefixed');

      const config = (mockCreate.mock.calls as any[][])[0]?.[0];
      expect(config.headers.Authorization).toBe('Bearer already-prefixed');
    });

    it('sets correct timeout and headers', () => {
      new AmbienceAPIClient('test-token');

      const config = (mockCreate.mock.calls as any[][])[0]?.[0];
      expect(config.timeout).toBe(300000);
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.headers['User-Agent']).toBe('AmbienceAI-MCP/1.0.0');
    });
  });

  describe('getCredits', () => {
    it('returns credits on success', async () => {
      mockGet.mockResolvedValue({ data: { credits: 100 } });
      const client = new AmbienceAPIClient('test-token');

      const result = await client.getCredits();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ credits: 100 });
      expect(mockGet).toHaveBeenCalledWith('/api/credits');
    });

    it('handles error response', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { data: { error: 'Unauthorized' } },
        message: 'Request failed',
      };
      mockGet.mockRejectedValue(axiosError);
      const client = new AmbienceAPIClient('test-token');

      const result = await client.getCredits();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('generateImage', () => {
    it('sends required parameters', async () => {
      mockPost.mockResolvedValue({
        data: { id: 'creation-123', status: 'pending' },
      });
      const client = new AmbienceAPIClient('test-token');

      await client.generateImage({
        prompt: 'a cat',
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/image', {
        prompt: 'a cat',
        aspectRatio: '16:9',
        model: 'flux',
      });
    });

    it('includes optional parameters when provided', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateImage({
        prompt: 'a cat',
        aspectRatio: '1:1',
        model: 'gpt_image',
        seed: 12345,
        outputFormat: 'png',
        imageUrl: 'https://example.com/input.jpg',
        guideImageUrl: 'https://example.com/guide.jpg',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/image', {
        prompt: 'a cat',
        aspectRatio: '1:1',
        model: 'gpt_image',
        seed: 12345,
        outputFormat: 'png',
        imageUrl: 'https://example.com/input.jpg',
        guideImageUrl: 'https://example.com/guide.jpg',
      });
    });

    it('excludes undefined optional parameters', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateImage({
        prompt: 'a cat',
        aspectRatio: '16:9',
        model: 'flux',
        seed: undefined,
        outputFormat: undefined,
      });

      const callArgs = mockPost.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty('seed');
      expect(callArgs).not.toHaveProperty('outputFormat');
    });
  });

  describe('generateImageMulti', () => {
    it('maps first image to imageUrl', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateImageMulti({
        prompt: 'combine images',
        imageUrls: ['https://example.com/1.jpg'],
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/image', expect.anything());
      const body = mockPost.mock.calls[0]?.[1] as any;
      expect(body.imageUrl).toBe('https://example.com/1.jpg');
    });

    it('maps second image to guideImageUrl', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateImageMulti({
        prompt: 'combine images',
        imageUrls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/image', expect.anything());
      const body = mockPost.mock.calls[0]?.[1] as any;
      expect(body.imageUrl).toBe('https://example.com/1.jpg');
      expect(body.guideImageUrl).toBe('https://example.com/2.jpg');
    });
  });

  describe('generateVideo', () => {
    it('sends required parameters', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateVideo({
        prompt: 'a video',
        aspectRatio: '16:9',
        duration: 10,
        quality: 'standard',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/video', {
        prompt: 'a video',
        aspectRatio: '16:9',
        duration: 10,
        quality: 'standard',
      });
    });

    it('includes imageUrl for image-to-video', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateVideo({
        prompt: 'animate this',
        aspectRatio: '16:9',
        duration: 5,
        quality: 'cinematic',
        imageUrl: 'https://example.com/source.jpg',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/video', expect.anything());
      const body = mockPost.mock.calls[0]?.[1] as any;
      expect(body.imageUrl).toBe('https://example.com/source.jpg');
    });
  });

  describe('generateMusic', () => {
    it('sends required parameters with type music', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateMusic({ prompt: 'upbeat electronic' });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/audio', {
        type: 'music',
        prompt: 'upbeat electronic',
      });
    });

    it('includes optional parameters', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateMusic({
        prompt: 'jazz ballad',
        duration: 60,
        genre: 'jazz',
        mood: 'relaxed',
        lyrics: 'la la la',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/audio', {
        type: 'music',
        prompt: 'jazz ballad',
        duration: 60,
        genre: 'jazz',
        mood: 'relaxed',
        lyrics: 'la la la',
      });
    });
  });

  describe('generateSpeech', () => {
    it('sends required parameters with type speech', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateSpeech({
        text: 'Hello world',
        voice: 'af_heart',
        language: 'american-english',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/audio', {
        type: 'speech',
        text: 'Hello world',
        voice: 'af_heart',
        language: 'american-english',
      });
    });

    it('includes speed when provided', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateSpeech({
        text: 'Fast talking',
        voice: 'af_heart',
        language: 'american-english',
        speed: 1.5,
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/audio', expect.anything());
      const body = mockPost.mock.calls[0]?.[1] as any;
      expect(body.speed).toBe(1.5);
    });
  });

  describe('generateAudio (legacy)', () => {
    it('sends speech request', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateAudio({
        prompt: 'Hello',
        type: 'speech',
        voice: 'af_heart',
        language: 'american-english',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/audio', {
        type: 'speech',
        prompt: 'Hello',
        voice: 'af_heart',
        language: 'american-english',
      });
    });

    it('sends music request', async () => {
      mockPost.mockResolvedValue({ data: { id: 'creation-123' } });
      const client = new AmbienceAPIClient('test-token');

      await client.generateAudio({
        prompt: 'Rock music',
        type: 'music',
        duration: 30,
      });

      expect(mockPost).toHaveBeenCalledWith('/api/generate/audio', {
        type: 'music',
        prompt: 'Rock music',
        duration: 30,
      });
    });
  });

  describe('getLibrary', () => {
    it('extracts creations from response', async () => {
      const mockCreations = [
        { id: '1', prompt: 'test', status: 'completed' },
        { id: '2', prompt: 'test2', status: 'pending' },
      ];
      mockGet.mockResolvedValue({
        data: { creations: mockCreations, total: 2 },
      });
      const client = new AmbienceAPIClient('test-token');

      const result = await client.getLibrary({ limit: 10, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreations);
      expect(mockGet).toHaveBeenCalledWith('/api/library', {
        params: { limit: 10, type: 'all' },
      });
    });
  });

  describe('getCreationStatus', () => {
    it('fetches creation by ID', async () => {
      mockGet.mockResolvedValue({
        data: { id: 'creation-123', status: 'completed', url: 'https://cdn.example.com/image.png' },
      });
      const client = new AmbienceAPIClient('test-token');

      const result = await client.getCreationStatus('creation-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('creation-123');
      expect(mockGet).toHaveBeenCalledWith('/api/creations/creation-123/status');
    });
  });

  describe('error handling', () => {
    it('extracts error from response.data.error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { data: { error: 'Invalid prompt' } },
        message: 'Request failed',
      };
      mockPost.mockRejectedValue(axiosError);
      const client = new AmbienceAPIClient('test-token');

      const result = await client.generateImage({
        prompt: 'test',
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid prompt');
    });

    it('falls back to response.data.message', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { data: { message: 'Rate limited' } },
        message: 'Request failed',
      };
      mockPost.mockRejectedValue(axiosError);
      const client = new AmbienceAPIClient('test-token');

      const result = await client.generateImage({
        prompt: 'test',
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limited');
    });

    it('falls back to error.message', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { data: {} },
        message: 'Network Error',
      };
      mockPost.mockRejectedValue(axiosError);
      const client = new AmbienceAPIClient('test-token');

      const result = await client.generateImage({
        prompt: 'test',
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('handles non-axios errors', async () => {
      const genericError = new Error('Something went wrong');
      mockPost.mockRejectedValue(genericError);
      const client = new AmbienceAPIClient('test-token');

      const result = await client.generateImage({
        prompt: 'test',
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    it('returns unknown error for null/undefined', async () => {
      mockPost.mockRejectedValue(null);
      const client = new AmbienceAPIClient('test-token');

      const result = await client.generateImage({
        prompt: 'test',
        aspectRatio: '16:9',
        model: 'flux',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unknown error occurred');
    });
  });
});
