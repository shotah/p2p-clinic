/**
 * Cryptographic Utilities for P2P Clinic
 *
 * Uses Web Crypto API for all operations:
 * - PBKDF2: Password-based key derivation
 * - AES-GCM: Symmetric encryption for data
 * - HMAC-SHA256: Authentication for challenge-response
 */

// PBKDF2 configuration
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const KEY_LENGTH = 256; // bits

// AES-GCM configuration
const AES_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // bytes (96 bits recommended for GCM)

/**
 * Derive a cryptographic key from a password using PBKDF2
 *
 * @param password - The user's password
 * @param salt - A unique salt (e.g., orgId + purpose)
 * @param usage - What the key will be used for
 */
export async function deriveKey(
  password: string,
  salt: string,
  usage: 'encrypt' | 'auth'
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Import password as a key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive the actual key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    {
      name: usage === 'encrypt' ? AES_ALGORITHM : 'HMAC',
      length: KEY_LENGTH,
      ...(usage === 'auth' ? { hash: 'SHA-256' } : {}),
    },
    false, // not extractable
    usage === 'encrypt' ? ['encrypt', 'decrypt'] : ['sign', 'verify']
  );

  return derivedKey;
}

/**
 * Derive both auth and encryption keys from a single password
 */
export async function deriveKeys(
  password: string,
  orgId: string
): Promise<{ authKey: CryptoKey; encryptionKey: CryptoKey }> {
  const [authKey, encryptionKey] = await Promise.all([
    deriveKey(password, `${orgId}:auth`, 'auth'),
    deriveKey(password, `${orgId}:encrypt`, 'encrypt'),
  ]);

  return { authKey, encryptionKey };
}

/**
 * Encrypt data using AES-GCM
 *
 * @param data - The data to encrypt (will be JSON stringified)
 * @param key - The AES-GCM key
 * @returns Base64-encoded ciphertext with IV prepended
 */
export async function encrypt(data: unknown, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    key,
    plaintext
  );

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 *
 * @param encryptedData - Base64-encoded ciphertext with IV prepended
 * @param key - The AES-GCM key
 * @returns The decrypted and parsed data
 */
export async function decrypt<T = unknown>(
  encryptedData: string,
  key: CryptoKey
): Promise<T> {
  const decoder = new TextDecoder();

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv },
    key,
    ciphertext
  );

  // Parse and return
  return JSON.parse(decoder.decode(plaintext)) as T;
}

/**
 * Generate a random challenge for authentication
 *
 * @returns A 32-byte random challenge as base64
 */
export function generateChallenge(): string {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...challenge));
}

/**
 * Sign a challenge using HMAC-SHA256
 *
 * @param challenge - The challenge (base64)
 * @param key - The HMAC key
 * @returns The signature as base64
 */
export async function signChallenge(
  challenge: string,
  key: CryptoKey
): Promise<string> {
  const challengeBytes = Uint8Array.from(atob(challenge), (c) =>
    c.charCodeAt(0)
  );

  const signature = await crypto.subtle.sign('HMAC', key, challengeBytes);

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify a challenge response
 *
 * @param challenge - The original challenge (base64)
 * @param response - The response to verify (base64)
 * @param key - The HMAC key
 * @returns True if the response is valid
 */
export async function verifyChallenge(
  challenge: string,
  response: string,
  key: CryptoKey
): Promise<boolean> {
  const challengeBytes = Uint8Array.from(atob(challenge), (c) =>
    c.charCodeAt(0)
  );
  const responseBytes = Uint8Array.from(atob(response), (c) => c.charCodeAt(0));

  return crypto.subtle.verify('HMAC', key, responseBytes, challengeBytes);
}

/**
 * Generate a cryptographically random share code
 *
 * @returns A share code in format XXXX-XXXX
 */
export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
  const bytes = crypto.getRandomValues(new Uint8Array(8));

  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
    if (i === 3) code += '-';
  }

  return code;
}

/**
 * Hash a password for storage (not for key derivation)
 * Uses PBKDF2 with a random salt, returns salt:hash
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    256
  );

  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));

  return `${saltB64}:${hashB64}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltB64, expectedHashB64] = storedHash.split(':');
  if (!saltB64 || !expectedHashB64) return false;

  const encoder = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    256
  );

  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));

  return hashB64 === expectedHashB64;
}
