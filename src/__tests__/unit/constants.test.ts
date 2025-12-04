import {
  GENERATION_TYPES,
  ESTIMATED_DURATIONS,
  GENERATION_TIMES_DISPLAY,
  getCompletionTimeInfo,
} from '../../constants.js';

describe('GENERATION_TYPES', () => {
  it('has all expected generation types', () => {
    expect(GENERATION_TYPES.TEXT_TO_IMAGE).toBe('text_to_image');
    expect(GENERATION_TYPES.GPT_IMAGE).toBe('gpt_image');
    expect(GENERATION_TYPES.IMAGE_TO_IMAGE).toBe('image_to_image');
    expect(GENERATION_TYPES.IMAGE_TO_IMAGE_MULTI).toBe('image_to_image_multi');
    expect(GENERATION_TYPES.TEXT_TO_VIDEO).toBe('text_to_video');
    expect(GENERATION_TYPES.TEXT_TO_VIDEO_CINEMATIC).toBe('text_to_video_cinematic');
    expect(GENERATION_TYPES.IMAGE_TO_VIDEO).toBe('image_to_video');
    expect(GENERATION_TYPES.IMAGE_TO_VIDEO_CINEMATIC).toBe('image_to_video_cinematic');
    expect(GENERATION_TYPES.TEXT_TO_AUDIO_SPEECH).toBe('text_to_audio_speech');
    expect(GENERATION_TYPES.TEXT_TO_AUDIO_MUSIC).toBe('text_to_audio_music');
  });
});

describe('ESTIMATED_DURATIONS', () => {
  it('has duration for each generation type', () => {
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.TEXT_TO_IMAGE]).toBe(30);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.GPT_IMAGE]).toBe(90);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.IMAGE_TO_IMAGE]).toBe(35);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.IMAGE_TO_IMAGE_MULTI]).toBe(35);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.TEXT_TO_VIDEO]).toBe(270);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.TEXT_TO_VIDEO_CINEMATIC]).toBe(600);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.IMAGE_TO_VIDEO]).toBe(240);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.IMAGE_TO_VIDEO_CINEMATIC]).toBe(540);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.TEXT_TO_AUDIO_SPEECH]).toBe(30);
    expect(ESTIMATED_DURATIONS[GENERATION_TYPES.TEXT_TO_AUDIO_MUSIC]).toBe(60);
  });
});

describe('getCompletionTimeInfo', () => {
  describe('known generation types', () => {
    it('returns correct info for TEXT_TO_IMAGE', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_IMAGE);
      expect(result.expectedDuration).toBe(30);
      expect(result.displayTime).toBe('~30 seconds');
      // 30 * 0.2 = 6, but min is 15, so buffer = 15
      // 30 + 15 = 45 seconds
      expect(result.pollingSuggestion).toBe('in about 45 seconds');
    });

    it('returns correct info for GPT_IMAGE', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.GPT_IMAGE);
      expect(result.expectedDuration).toBe(90);
      expect(result.displayTime).toBe('~1.5 minutes');
      // 90 * 0.2 = 18, buffer = 18
      // 90 + 18 = 108 seconds = ~2 minutes
      expect(result.pollingSuggestion).toBe('in about 2 minutes');
    });

    it('returns correct info for TEXT_TO_VIDEO', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_VIDEO);
      expect(result.expectedDuration).toBe(270);
      expect(result.displayTime).toBe('~4.5 minutes');
      // 270 * 0.2 = 54, but max is 30, so buffer = 30
      // 270 + 30 = 300 seconds = 5 minutes
      expect(result.pollingSuggestion).toBe('in about 5 minutes');
    });

    it('returns correct info for TEXT_TO_VIDEO_CINEMATIC', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_VIDEO_CINEMATIC);
      expect(result.expectedDuration).toBe(600);
      expect(result.displayTime).toBe('~10 minutes');
      // 600 * 0.2 = 120, but max is 30, so buffer = 30
      // 600 + 30 = 630 seconds = ~11 minutes
      expect(result.pollingSuggestion).toBe('in about 11 minutes');
    });

    it('returns correct info for TEXT_TO_AUDIO_SPEECH', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_AUDIO_SPEECH);
      expect(result.expectedDuration).toBe(30);
      expect(result.displayTime).toBe('~30 seconds');
    });

    it('returns correct info for TEXT_TO_AUDIO_MUSIC', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_AUDIO_MUSIC);
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
      // 60 * 0.2 = 12, but min is 15, so buffer = 15
      // 60 + 15 = 75 seconds = ~1 minute
      expect(result.pollingSuggestion).toBe('in about 1 minutes');
    });

    it('returns correct info for IMAGE_TO_VIDEO', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.IMAGE_TO_VIDEO);
      expect(result.expectedDuration).toBe(240);
      expect(result.displayTime).toBe('~4 minutes');
    });

    it('returns correct info for IMAGE_TO_VIDEO_CINEMATIC', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.IMAGE_TO_VIDEO_CINEMATIC);
      expect(result.expectedDuration).toBe(540);
      expect(result.displayTime).toBe('~9 minutes');
    });
  });

  describe('unknown/missing generation types', () => {
    it('defaults to 60 seconds for unknown type', () => {
      const result = getCompletionTimeInfo('unknown_type');
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
    });

    it('defaults to 60 seconds for undefined', () => {
      const result = getCompletionTimeInfo(undefined);
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
    });

    it('defaults to 60 seconds for empty string', () => {
      const result = getCompletionTimeInfo('');
      expect(result.expectedDuration).toBe(60);
      expect(result.displayTime).toBe('~1 minute');
    });
  });

  describe('polling buffer calculation', () => {
    it('uses minimum buffer of 15 seconds for short durations', () => {
      // TEXT_TO_IMAGE: 30 seconds
      // 30 * 0.2 = 6, but min is 15
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_IMAGE);
      // poll time = 30 + 15 = 45 seconds
      expect(result.pollingSuggestion).toContain('45 seconds');
    });

    it('uses maximum buffer of 30 seconds for long durations', () => {
      // TEXT_TO_VIDEO_CINEMATIC: 600 seconds
      // 600 * 0.2 = 120, but max is 30
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_VIDEO_CINEMATIC);
      // poll time = 600 + 30 = 630 seconds = 10.5 minutes, rounded to 11
      expect(result.pollingSuggestion).toContain('11 minutes');
    });

    it('uses 20% buffer for medium durations', () => {
      // GPT_IMAGE: 90 seconds
      // 90 * 0.2 = 18, which is between 15 and 30
      const result = getCompletionTimeInfo(GENERATION_TYPES.GPT_IMAGE);
      // poll time = 90 + 18 = 108 seconds = 1.8 minutes, rounded to 2
      expect(result.pollingSuggestion).toContain('2 minutes');
    });
  });

  describe('polling suggestion formatting', () => {
    it('formats as seconds when poll time < 60', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_IMAGE);
      expect(result.pollingSuggestion).toMatch(/in about \d+ seconds/);
    });

    it('formats as minutes when poll time >= 60', () => {
      const result = getCompletionTimeInfo(GENERATION_TYPES.TEXT_TO_VIDEO);
      expect(result.pollingSuggestion).toMatch(/in about \d+ minutes/);
    });
  });
});
