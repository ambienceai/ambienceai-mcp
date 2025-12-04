import {
  CreditsResponseSchema,
  CreationSchema,
  GenerateImageRequestSchema,
  GenerateImageMultiRequestSchema,
  GenerateVideoRequestSchema,
  GenerateMusicRequestSchema,
  GenerateSpeechRequestSchema,
  GenerateAudioRequestSchema,
  LibraryRequestSchema,
} from '../../types.js';

describe('CreditsResponseSchema', () => {
  it('parses valid credits response', () => {
    const result = CreditsResponseSchema.parse({ credits: 100 });
    expect(result.credits).toBe(100);
  });

  it('parses zero credits', () => {
    const result = CreditsResponseSchema.parse({ credits: 0 });
    expect(result.credits).toBe(0);
  });

  it('rejects missing credits', () => {
    expect(() => CreditsResponseSchema.parse({})).toThrow();
  });

  it('rejects non-number credits', () => {
    expect(() => CreditsResponseSchema.parse({ credits: '100' })).toThrow();
  });
});

describe('CreationSchema', () => {
  const validCreation = {
    id: 'creation-123',
    user_id: 'user-456',
    prompt: 'test prompt',
    status: 'completed',
    type: 'image',
    created_at: '2024-01-01T00:00:00Z',
  };

  it('parses valid creation', () => {
    const result = CreationSchema.parse(validCreation);
    expect(result.id).toBe('creation-123');
    expect(result.status).toBe('completed');
  });

  it('parses creation with optional fields', () => {
    const result = CreationSchema.parse({
      ...validCreation,
      completed_at: '2024-01-01T00:01:00Z',
      url: 'https://example.com/image.png',
      metadata: { key: 'value' },
      generationType: 'text_to_image',
    });
    expect(result.url).toBe('https://example.com/image.png');
    expect(result.generationType).toBe('text_to_image');
  });

  it('parses creation with error field', () => {
    const result = CreationSchema.parse({
      ...validCreation,
      status: 'failed',
      error: 'Generation failed due to content policy',
    });
    expect(result.error).toBe('Generation failed due to content policy');
  });

  it('validates status enum', () => {
    expect(() => CreationSchema.parse({ ...validCreation, status: 'invalid' })).toThrow();
  });

  it('validates type enum', () => {
    expect(() => CreationSchema.parse({ ...validCreation, type: 'invalid' })).toThrow();
  });

  it('allows all valid statuses', () => {
    ['pending', 'processing', 'completed', 'failed'].forEach((status) => {
      expect(() => CreationSchema.parse({ ...validCreation, status })).not.toThrow();
    });
  });

  it('allows all valid types', () => {
    ['image', 'video', 'speech', 'music'].forEach((type) => {
      expect(() => CreationSchema.parse({ ...validCreation, type })).not.toThrow();
    });
  });
});

describe('GenerateImageRequestSchema', () => {
  it('parses minimal valid request', () => {
    const result = GenerateImageRequestSchema.parse({ prompt: 'a cat' });
    expect(result.prompt).toBe('a cat');
    expect(result.aspectRatio).toBe('16:9'); // default
    expect(result.model).toBe('flux'); // default
  });

  it('parses request with all optional fields', () => {
    const result = GenerateImageRequestSchema.parse({
      prompt: 'a cat',
      aspectRatio: '1:1',
      model: 'gpt_image',
      outputFormat: 'png',
      seed: 12345,
      imageUrl: 'https://example.com/input.jpg',
      guideImageUrl: 'https://example.com/guide.jpg',
    });
    expect(result.aspectRatio).toBe('1:1');
    expect(result.model).toBe('gpt_image');
    expect(result.outputFormat).toBe('png');
    expect(result.seed).toBe(12345);
  });

  it('rejects empty prompt', () => {
    expect(() => GenerateImageRequestSchema.parse({ prompt: '' })).toThrow();
  });

  it('rejects missing prompt', () => {
    expect(() => GenerateImageRequestSchema.parse({})).toThrow();
  });

  it('validates aspectRatio enum', () => {
    expect(() => GenerateImageRequestSchema.parse({ prompt: 'test', aspectRatio: '2:1' })).toThrow();
  });

  it('allows all valid aspect ratios', () => {
    ['16:9', '9:16', '1:1', '4:3', '3:4'].forEach((aspectRatio) => {
      expect(() => GenerateImageRequestSchema.parse({ prompt: 'test', aspectRatio })).not.toThrow();
    });
  });

  it('validates model enum', () => {
    expect(() => GenerateImageRequestSchema.parse({ prompt: 'test', model: 'invalid' })).toThrow();
  });

  it('validates imageUrl format', () => {
    expect(() =>
      GenerateImageRequestSchema.parse({ prompt: 'test', imageUrl: 'not-a-url' })
    ).toThrow();
  });
});

describe('GenerateImageMultiRequestSchema', () => {
  it('parses valid request with 1 image', () => {
    const result = GenerateImageMultiRequestSchema.parse({
      prompt: 'combine images',
      imageUrls: ['https://example.com/1.jpg'],
    });
    expect(result.imageUrls).toHaveLength(1);
  });

  it('parses valid request with 5 images', () => {
    const result = GenerateImageMultiRequestSchema.parse({
      prompt: 'combine images',
      imageUrls: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
        'https://example.com/5.jpg',
      ],
    });
    expect(result.imageUrls).toHaveLength(5);
  });

  it('rejects empty imageUrls array', () => {
    expect(() =>
      GenerateImageMultiRequestSchema.parse({ prompt: 'test', imageUrls: [] })
    ).toThrow();
  });

  it('rejects more than 5 images', () => {
    expect(() =>
      GenerateImageMultiRequestSchema.parse({
        prompt: 'test',
        imageUrls: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
          'https://example.com/5.jpg',
          'https://example.com/6.jpg',
        ],
      })
    ).toThrow();
  });

  it('validates each URL in array', () => {
    expect(() =>
      GenerateImageMultiRequestSchema.parse({
        prompt: 'test',
        imageUrls: ['https://example.com/1.jpg', 'not-a-url'],
      })
    ).toThrow();
  });
});

describe('GenerateVideoRequestSchema', () => {
  it('parses minimal valid request', () => {
    const result = GenerateVideoRequestSchema.parse({ prompt: 'a video' });
    expect(result.prompt).toBe('a video');
    expect(result.duration).toBe(30); // default
    expect(result.quality).toBe('standard'); // default
  });

  it('parses request with custom duration', () => {
    const result = GenerateVideoRequestSchema.parse({ prompt: 'test', duration: 15 });
    expect(result.duration).toBe(15);
  });

  it('rejects duration less than 1', () => {
    expect(() => GenerateVideoRequestSchema.parse({ prompt: 'test', duration: 0 })).toThrow();
  });

  it('rejects duration greater than 30', () => {
    expect(() => GenerateVideoRequestSchema.parse({ prompt: 'test', duration: 31 })).toThrow();
  });

  it('allows minimum duration of 1', () => {
    const result = GenerateVideoRequestSchema.parse({ prompt: 'test', duration: 1 });
    expect(result.duration).toBe(1);
  });

  it('allows maximum duration of 30', () => {
    const result = GenerateVideoRequestSchema.parse({ prompt: 'test', duration: 30 });
    expect(result.duration).toBe(30);
  });

  it('validates quality enum', () => {
    expect(() => GenerateVideoRequestSchema.parse({ prompt: 'test', quality: 'ultra' })).toThrow();
  });

  it('allows cinematic quality', () => {
    const result = GenerateVideoRequestSchema.parse({ prompt: 'test', quality: 'cinematic' });
    expect(result.quality).toBe('cinematic');
  });
});

describe('GenerateMusicRequestSchema', () => {
  it('parses minimal valid request', () => {
    const result = GenerateMusicRequestSchema.parse({ prompt: 'upbeat music' });
    expect(result.prompt).toBe('upbeat music');
  });

  it('parses request with all optional fields', () => {
    const result = GenerateMusicRequestSchema.parse({
      prompt: 'jazz',
      duration: 60,
      genre: 'jazz',
      mood: 'relaxed',
      lyrics: 'la la la',
    });
    expect(result.duration).toBe(60);
    expect(result.genre).toBe('jazz');
    expect(result.mood).toBe('relaxed');
    expect(result.lyrics).toBe('la la la');
  });

  it('rejects duration less than 10', () => {
    expect(() => GenerateMusicRequestSchema.parse({ prompt: 'test', duration: 9 })).toThrow();
  });

  it('rejects duration greater than 180', () => {
    expect(() => GenerateMusicRequestSchema.parse({ prompt: 'test', duration: 181 })).toThrow();
  });

  it('allows minimum duration of 10', () => {
    const result = GenerateMusicRequestSchema.parse({ prompt: 'test', duration: 10 });
    expect(result.duration).toBe(10);
  });

  it('allows maximum duration of 180', () => {
    const result = GenerateMusicRequestSchema.parse({ prompt: 'test', duration: 180 });
    expect(result.duration).toBe(180);
  });
});

describe('GenerateSpeechRequestSchema', () => {
  it('parses minimal valid request', () => {
    const result = GenerateSpeechRequestSchema.parse({ text: 'hello world' });
    expect(result.text).toBe('hello world');
    expect(result.voice).toBe('af_heart'); // default
    expect(result.language).toBe('american-english'); // default
  });

  it('parses request with custom language', () => {
    const result = GenerateSpeechRequestSchema.parse({
      text: 'bonjour',
      language: 'french',
    });
    expect(result.language).toBe('french');
  });

  it('rejects empty text', () => {
    expect(() => GenerateSpeechRequestSchema.parse({ text: '' })).toThrow();
  });

  it('validates language enum', () => {
    expect(() =>
      GenerateSpeechRequestSchema.parse({ text: 'test', language: 'klingon' })
    ).toThrow();
  });

  it('allows all valid languages', () => {
    const languages = [
      'american-english',
      'british-english',
      'japanese',
      'mandarin-chinese',
      'spanish',
      'french',
      'hindi',
      'italian',
      'brazilian-portuguese',
    ];
    languages.forEach((language) => {
      expect(() => GenerateSpeechRequestSchema.parse({ text: 'test', language })).not.toThrow();
    });
  });

  it('rejects speed less than 0.25', () => {
    expect(() => GenerateSpeechRequestSchema.parse({ text: 'test', speed: 0.1 })).toThrow();
  });

  it('rejects speed greater than 4.0', () => {
    expect(() => GenerateSpeechRequestSchema.parse({ text: 'test', speed: 5 })).toThrow();
  });

  it('allows minimum speed of 0.25', () => {
    const result = GenerateSpeechRequestSchema.parse({ text: 'test', speed: 0.25 });
    expect(result.speed).toBe(0.25);
  });

  it('allows maximum speed of 4.0', () => {
    const result = GenerateSpeechRequestSchema.parse({ text: 'test', speed: 4.0 });
    expect(result.speed).toBe(4.0);
  });
});

describe('GenerateAudioRequestSchema (legacy)', () => {
  it('parses speech type', () => {
    const result = GenerateAudioRequestSchema.parse({ prompt: 'hello', type: 'speech' });
    expect(result.type).toBe('speech');
  });

  it('parses music type', () => {
    const result = GenerateAudioRequestSchema.parse({ prompt: 'beat', type: 'music' });
    expect(result.type).toBe('music');
  });

  it('rejects invalid type', () => {
    expect(() =>
      GenerateAudioRequestSchema.parse({ prompt: 'test', type: 'video' })
    ).toThrow();
  });

  it('requires type field', () => {
    expect(() => GenerateAudioRequestSchema.parse({ prompt: 'test' })).toThrow();
  });
});

describe('LibraryRequestSchema', () => {
  it('parses empty object with defaults', () => {
    const result = LibraryRequestSchema.parse({});
    expect(result.limit).toBe(10); // default
    expect(result.offset).toBe(0); // default
  });

  it('parses custom limit and offset', () => {
    const result = LibraryRequestSchema.parse({ limit: 50, offset: 100 });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(100);
  });

  it('rejects limit less than 1', () => {
    expect(() => LibraryRequestSchema.parse({ limit: 0 })).toThrow();
  });

  it('rejects limit greater than 100', () => {
    expect(() => LibraryRequestSchema.parse({ limit: 101 })).toThrow();
  });

  it('allows minimum limit of 1', () => {
    const result = LibraryRequestSchema.parse({ limit: 1 });
    expect(result.limit).toBe(1);
  });

  it('allows maximum limit of 100', () => {
    const result = LibraryRequestSchema.parse({ limit: 100 });
    expect(result.limit).toBe(100);
  });

  it('rejects negative offset', () => {
    expect(() => LibraryRequestSchema.parse({ offset: -1 })).toThrow();
  });

  it('allows zero offset', () => {
    const result = LibraryRequestSchema.parse({ offset: 0 });
    expect(result.offset).toBe(0);
  });
});
