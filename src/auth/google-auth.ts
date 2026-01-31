/**
 * Google Auth Module for docgen-mcp
 *
 * Handles OAuth2 authentication for Google Docs API.
 * Shares encrypted tokens with gmail-mcp.
 * Uses same TOKEN_ENCRYPTION_KEY and encryption scheme as gmail-mcp.
 */

import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { readFileSync, existsSync, createReadStream, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname, basename, extname } from 'path';
import { pbkdf2Sync } from 'crypto';
// @ts-ignore - fernet doesn't have types
import fernet from 'fernet';

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
];

// Token path from env or default
function getTokenPath(): string {
  const envPath = process.env.TOKEN_STORAGE_PATH;
  if (envPath) {
    return envPath.startsWith('~') ? envPath.replace('~', homedir()) : envPath;
  }
  return join(homedir(), '.gmail-mcp', 'tokens.json');
}

// Salt is stored alongside the token file (same directory)
function getSaltPath(): string {
  return join(dirname(getTokenPath()), 'encryption_salt');
}

let cachedClient: OAuth2Client | null = null;
let cachedTokenExpiry: number | null = null;

/**
 * Derive encryption key using PBKDF2 (matches gmail-mcp)
 */
function deriveKey(password: string, salt: Buffer): string {
  // PBKDF2 with SHA256, 100000 iterations, 32 bytes output
  const derivedKey = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  // Return as base64url (what Fernet expects)
  return derivedKey.toString('base64url');
}

/**
 * Decrypt token using Fernet
 */
function decryptToken(encryptedToken: string, fernetKey: string): string {
  const secret = new fernet.Secret(fernetKey);
  const token = new fernet.Token({ secret, token: encryptedToken, ttl: 0 });
  return token.decode();
}

/**
 * Encrypt token data using Fernet (matches gmail-mcp)
 */
function encryptToken(tokenJson: string, fernetKey: string): string {
  const secret = new fernet.Secret(fernetKey);
  const token = new fernet.Token({ secret });
  return token.encode(tokenJson);
}

/**
 * Save tokens to encrypted storage
 * Uses read-merge-write to preserve fields we don't have (token_uri, client_id, etc.)
 */
function saveTokens(newCredentials: Credentials): void {
  const tokenPath = getTokenPath();
  const saltPath = getSaltPath();

  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error('Cannot save tokens: TOKEN_ENCRYPTION_KEY not set');
    return;
  }

  try {
    // Read existing token data to preserve fields we don't have
    const salt = readFileSync(saltPath);
    const fernetKey = deriveKey(encryptionKey, salt);

    let tokenData: Record<string, any> = {};

    if (existsSync(tokenPath)) {
      const encryptedToken = readFileSync(tokenPath, 'utf-8');
      const decrypted = decryptToken(encryptedToken, fernetKey);
      tokenData = JSON.parse(decrypted);
    }

    // Update only the token fields
    if (newCredentials.access_token) {
      tokenData.token = newCredentials.access_token;
    }
    if (newCredentials.refresh_token) {
      tokenData.refresh_token = newCredentials.refresh_token;
    }
    if (newCredentials.expiry_date) {
      tokenData.expiry = new Date(newCredentials.expiry_date).toISOString();
    }

    // Encrypt and write
    const tokenJson = JSON.stringify(tokenData);
    const encrypted = encryptToken(tokenJson, fernetKey);

    writeFileSync(tokenPath, encrypted, { mode: 0o600 });

    console.error('Tokens saved to encrypted storage');
  } catch (err) {
    console.error('Failed to save tokens:', err);
  }
}

/**
 * Get OAuth2 client credentials from environment
 */
function getClientConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'
    );
  }

  return { clientId, clientSecret };
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client(): OAuth2Client {
  const { clientId, clientSecret } = getClientConfig();
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3847/callback'
  );
}

/**
 * Load and decrypt stored tokens from gmail-mcp's encrypted storage
 */
function loadStoredTokens(): Credentials | null {
  const tokenPath = getTokenPath();
  const saltPath = getSaltPath();

  if (!existsSync(tokenPath)) {
    console.error(`Token file not found: ${tokenPath}`);
    return null;
  }

  if (!existsSync(saltPath)) {
    console.error(`Salt file not found: ${saltPath}`);
    return null;
  }

  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY environment variable is required. ' +
      'This must match the key used by gmail-mcp.'
    );
  }

  try {
    // Read salt and encrypted token
    const salt = readFileSync(saltPath);
    const encryptedToken = readFileSync(tokenPath, 'utf-8');

    // Derive Fernet key using same method as gmail-mcp
    const fernetKey = deriveKey(encryptionKey, salt);

    // Decrypt the token
    const decrypted = decryptToken(encryptedToken, fernetKey);
    const tokenData = JSON.parse(decrypted);

    // Convert to Credentials format expected by google-auth-library
    return {
      access_token: tokenData.token,
      refresh_token: tokenData.refresh_token,
      token_type: 'Bearer',
      expiry_date: tokenData.expiry ? new Date(tokenData.expiry).getTime() : undefined,
    };
  } catch (err) {
    console.error('Failed to decrypt tokens:', err);
    return null;
  }
}

/**
 * Get authenticated OAuth2 client
 *
 * Returns cached client if available and not expired, otherwise loads from gmail-mcp's encrypted storage.
 */
export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  // Check if cached client exists and token is not expired (with 5 minute buffer)
  const now = Date.now();
  if (cachedClient && cachedTokenExpiry && cachedTokenExpiry > now + 5 * 60 * 1000) {
    return cachedClient;
  }

  // Clear stale cache
  cachedClient = null;
  cachedTokenExpiry = null;

  const oauth2Client = createOAuth2Client();
  const tokens = loadStoredTokens();

  if (tokens) {
    oauth2Client.setCredentials(tokens);

    // Set up token refresh handler
    oauth2Client.on('tokens', (newTokens) => {
      // Update cached expiry
      if (newTokens.expiry_date) {
        cachedTokenExpiry = newTokens.expiry_date;
      }

      // Persist to encrypted storage
      saveTokens(newTokens);
    });

    cachedClient = oauth2Client;
    cachedTokenExpiry = tokens.expiry_date ?? null;
    return oauth2Client;
  }

  // No tokens - need to authenticate via gmail-mcp first
  throw new Error(
    'Not authenticated with Google. Run gmail-mcp authenticate tool first, ' +
    'or ensure TOKEN_ENCRYPTION_KEY matches gmail-mcp configuration.'
  );
}

/**
 * Check if we have valid stored credentials
 */
export function hasStoredCredentials(): boolean {
  try {
    return loadStoredTokens() !== null;
  } catch {
    return false;
  }
}

/**
 * Clear cached client (for testing)
 */
export function clearCredentials(): void {
  cachedClient = null;
}

/**
 * Get Google Docs service
 */
export async function getDocsService() {
  const auth = await getAuthenticatedClient();
  return google.docs({ version: 'v1', auth });
}

/**
 * Get Google Drive service
 */
export async function getDriveService() {
  const auth = await getAuthenticatedClient();
  return google.drive({ version: 'v3', auth });
}

/**
 * Upload a local image file to Drive and make it publicly accessible
 *
 * Returns the URL that can be used in Google Docs insertInlineImage
 */
export async function uploadImageToDrive(filePath: string): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }

  const driveService = await getDriveService();
  const fileName = basename(filePath);
  const ext = extname(filePath).toLowerCase();

  // Determine MIME type
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  // Upload file to Drive
  const response = await driveService.files.create({
    requestBody: {
      name: fileName,
      mimeType,
    },
    media: {
      mimeType,
      body: createReadStream(filePath),
    },
    fields: 'id',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('Failed to upload image - no file ID returned');
  }

  // Make the file publicly readable (required for Google Docs to access it)
  await driveService.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Small delay to allow permission to propagate
  await new Promise(resolve => setTimeout(resolve, 500));

  // Get file info including webContentLink
  const fileInfo = await driveService.files.get({
    fileId,
    fields: 'webContentLink',
  });

  // webContentLink format: https://drive.google.com/uc?id=xxx&export=download
  // This works for insertInlineImage with public files
  return fileInfo.data.webContentLink || `https://drive.google.com/uc?export=view&id=${fileId}`;
}
