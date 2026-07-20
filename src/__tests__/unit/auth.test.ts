import { extractAccessToken, createAuthHeader } from "../../auth.js";

describe("extractAccessToken", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AMBIENCE_ACCESS_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("from MCP auth context", () => {
    it("extracts token from extra.auth.accessToken", () => {
      const extra = { auth: { accessToken: "test-token-123" } };
      expect(extractAccessToken(extra)).toBe("test-token-123");
    });

    it("prioritizes auth.accessToken over headers", () => {
      const extra = {
        auth: { accessToken: "auth-token" },
        headers: { authorization: "Bearer header-token" },
      };
      expect(extractAccessToken(extra)).toBe("auth-token");
    });
  });

  describe("from headers", () => {
    it("extracts token from Bearer authorization header", () => {
      const extra = { headers: { authorization: "Bearer my-token" } };
      expect(extractAccessToken(extra)).toBe("my-token");
    });

    it("extracts token from authorization header without Bearer prefix", () => {
      const extra = { headers: { authorization: "raw-token" } };
      expect(extractAccessToken(extra)).toBe("raw-token");
    });

    it("handles case-insensitive Bearer prefix", () => {
      const extra = { headers: { authorization: "BEARER uppercase-token" } };
      expect(extractAccessToken(extra)).toBe("uppercase-token");
    });

    it("returns null for empty authorization header", () => {
      const extra = { headers: { authorization: "" } };
      expect(extractAccessToken(extra)).toBe(null);
    });

    it("returns null for Bearer-only header (no token)", () => {
      const extra = { headers: { authorization: "Bearer " } };
      expect(extractAccessToken(extra)).toBe(null);
    });
  });

  describe("from environment variable", () => {
    it("falls back to AMBIENCE_ACCESS_TOKEN env var", () => {
      process.env.AMBIENCE_ACCESS_TOKEN = "env-token";
      expect(extractAccessToken({})).toBe("env-token");
    });

    it("uses env var when extra is null", () => {
      process.env.AMBIENCE_ACCESS_TOKEN = "env-token";
      expect(extractAccessToken(null)).toBe("env-token");
    });

    it("uses env var when extra is undefined", () => {
      process.env.AMBIENCE_ACCESS_TOKEN = "env-token";
      expect(extractAccessToken(undefined)).toBe("env-token");
    });
  });

  describe("edge cases", () => {
    it("returns null when no token source available", () => {
      expect(extractAccessToken({})).toBe(null);
    });

    it("returns null for null input", () => {
      expect(extractAccessToken(null)).toBe(null);
    });

    it("returns null for undefined input", () => {
      expect(extractAccessToken(undefined)).toBe(null);
    });

    it("handles extra with empty auth object", () => {
      const extra = { auth: {} };
      expect(extractAccessToken(extra)).toBe(null);
    });

    it("handles extra with empty headers object", () => {
      const extra = { headers: {} };
      expect(extractAccessToken(extra)).toBe(null);
    });
  });
});

describe("createAuthHeader", () => {
  it("creates Bearer header from token", () => {
    expect(createAuthHeader("my-token")).toEqual({
      Authorization: "Bearer my-token",
    });
  });

  it("does not double-prefix token that already has Bearer", () => {
    expect(createAuthHeader("Bearer already-prefixed")).toEqual({
      Authorization: "Bearer already-prefixed",
    });
  });

  it("returns empty object for empty token", () => {
    expect(createAuthHeader("")).toEqual({});
  });

  it("handles token with spaces", () => {
    expect(createAuthHeader("token with spaces")).toEqual({
      Authorization: "Bearer token with spaces",
    });
  });
});
