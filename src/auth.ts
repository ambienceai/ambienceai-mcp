/**
 * Simple token extraction and forwarding for MCP server
 * No validation - let the backend handle authentication
 */

/**
 * Extracts the access token from MCP request context
 * Returns the token to be forwarded to the backend API
 */
export function extractAccessToken(extra: any): string | null {
  // Check for auth token in MCP transport context
  if (extra?.auth?.accessToken) {
    return extra.auth.accessToken;
  }
  
  // Check for Bearer token in headers
  if (extra?.headers?.authorization) {
    const bearerToken = extra.headers.authorization.replace(/^Bearer\s+/i, '');
    return bearerToken || null;
  }
  
  // Fallback to environment variable for development/testing
  if (process.env.AMBIENCE_ACCESS_TOKEN) {
    return process.env.AMBIENCE_ACCESS_TOKEN;
  }
  
  return null;
}

/**
 * Creates authorization header for backend API requests
 */
export function createAuthHeader(token: string): { Authorization: string } | {} {
  if (!token) {
    return {};
  }
  
  // Ensure Bearer format
  const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  return { Authorization: bearerToken };
}