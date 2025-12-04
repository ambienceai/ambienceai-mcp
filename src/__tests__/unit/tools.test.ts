import { determineMediaType } from '../../tools.js';

describe('determineMediaType', () => {
  describe('video content (should skip - MCP SDK does not support video)', () => {
    it('skips video creationType', () => {
      expect(determineMediaType('https://cdn.example.com/video.mp4', 'video')).toEqual({ skip: true });
    });

    it('skips .mp4 files regardless of creationType', () => {
      expect(determineMediaType('https://cdn.example.com/media.mp4', 'unknown')).toEqual({ skip: true });
    });

    it('skips .webm files', () => {
      expect(determineMediaType('https://cdn.example.com/media.webm', 'unknown')).toEqual({ skip: true });
    });

    it('skips .mov files', () => {
      expect(determineMediaType('https://cdn.example.com/media.mov', 'unknown')).toEqual({ skip: true });
    });

    it('skips video extensions case-insensitively', () => {
      expect(determineMediaType('https://cdn.example.com/media.MP4', 'unknown')).toEqual({ skip: true });
      expect(determineMediaType('https://cdn.example.com/media.MOV', 'unknown')).toEqual({ skip: true });
    });
  });

  describe('image content', () => {
    it('handles image creationType', () => {
      const result = determineMediaType('https://cdn.example.com/image.png', 'image');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/png');
    });

    it('handles .jpg files', () => {
      const result = determineMediaType('https://cdn.example.com/photo.jpg', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('handles .jpeg files', () => {
      const result = determineMediaType('https://cdn.example.com/photo.jpeg', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('handles .png files', () => {
      const result = determineMediaType('https://cdn.example.com/image.png', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/png');
    });

    it('handles .gif files', () => {
      const result = determineMediaType('https://cdn.example.com/animation.gif', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/gif');
    });

    it('handles .webp files', () => {
      const result = determineMediaType('https://cdn.example.com/image.webp', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/webp');
    });

    it('handles uppercase extensions case-insensitively', () => {
      const result = determineMediaType('https://cdn.example.com/image.PNG', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/png');
    });

    it('handles mixed case extensions', () => {
      const result = determineMediaType('https://cdn.example.com/image.JpG', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('audio content', () => {
    it('handles speech creationType', () => {
      const result = determineMediaType('https://cdn.example.com/speech.mp3', 'speech');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('audio');
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('handles music creationType', () => {
      const result = determineMediaType('https://cdn.example.com/music.mp3', 'music');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('audio');
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('handles .mp3 files', () => {
      const result = determineMediaType('https://cdn.example.com/audio.mp3', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('audio');
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('handles .wav files', () => {
      const result = determineMediaType('https://cdn.example.com/audio.wav', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('audio');
      expect(result.mimeType).toBe('audio/wav');
    });

    it('handles .ogg files', () => {
      const result = determineMediaType('https://cdn.example.com/audio.ogg', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('audio');
      expect(result.mimeType).toBe('audio/ogg');
    });

    it('handles .m4a files', () => {
      const result = determineMediaType('https://cdn.example.com/audio.m4a', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('audio');
      expect(result.mimeType).toBe('audio/m4a');
    });
  });

  describe('edge cases', () => {
    it('defaults to image with generic MIME type for unknown extensions', () => {
      const result = determineMediaType('https://cdn.example.com/file.xyz', 'unknown');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('handles URLs with query parameters', () => {
      // Note: current implementation extracts extension after last dot,
      // which may include query params - this test documents current behavior
      const result = determineMediaType('https://cdn.example.com/image.png?token=abc', 'image');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
    });

    it('handles image creationType even with unrecognized extension', () => {
      const result = determineMediaType('https://cdn.example.com/file', 'image');
      expect(result.skip).toBe(false);
      expect(result.contentType).toBe('image');
      expect(result.mimeType).toBe('image/jpeg');
    });
  });
});
