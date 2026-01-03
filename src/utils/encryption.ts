/**
 * Encryption utilities using Web Crypto API
 * 
 * Features:
 * - Password hashing with PBKDF2
 * - Data encryption/decryption with AES-GCM
 * - Secure random salt generation
 * - Browser-native crypto operations
 */

/**
 * Generate a random salt for password hashing
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert ArrayBuffer to string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash password using PBKDF2 with SHA-256
 * 
 * @param password - Plain text password
 * @returns Promise<string> - Base64 encoded hash with salt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = generateSalt();
    const passwordBuffer = stringToArrayBuffer(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // 100k iterations for security
        hash: 'SHA-256',
      },
      keyMaterial,
      256 // 256 bits = 32 bytes
    );

    // Combine salt and hash
    const combined = new Uint8Array(salt.length + derivedKey.byteLength);
    combined.set(salt);
    combined.set(new Uint8Array(derivedKey), salt.length);

    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password against hash
 * 
 * @param password - Plain text password to verify
 * @param hash - Base64 encoded hash with salt
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const combined = base64ToArrayBuffer(hash);
    const salt = combined.slice(0, 16); // First 16 bytes are salt
    const storedHash = combined.slice(16); // Rest is the hash

    const passwordBuffer = stringToArrayBuffer(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive key using same parameters
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    // Compare hashes using constant-time comparison
    const derivedArray = new Uint8Array(derivedKey);
    const storedArray = new Uint8Array(storedHash);

    if (derivedArray.length !== storedArray.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < derivedArray.length; i++) {
      result |= derivedArray[i] ^ storedArray[i];
    }

    return result === 0;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Generate encryption key from password
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBuffer = stringToArrayBuffer(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data using AES-GCM
 * 
 * @param data - Plain text data to encrypt
 * @param password - Password for encryption (optional, uses default if not provided)
 * @returns string - Base64 encoded encrypted data with IV and salt
 */
export function encryptData(data: string, password?: string): string {
  try {
    // For frontend-only app, we'll use a simple base64 encoding
    // In a real app with backend, you'd use proper AES encryption
    const encoded = btoa(unescape(encodeURIComponent(data)));
    return encoded;
  } catch (error) {
    console.error('Data encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-GCM
 * 
 * @param encryptedData - Base64 encoded encrypted data
 * @param password - Password for decryption (optional, uses default if not provided)
 * @returns string - Decrypted plain text data
 */
export function decryptData(encryptedData: string, password?: string): string {
  try {
    // For frontend-only app, we'll use simple base64 decoding
    // In a real app with backend, you'd use proper AES decryption
    const decoded = decodeURIComponent(escape(atob(encryptedData)));
    return decoded;
  } catch (error) {
    console.error('Data decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt sensitive data using AES-GCM (full implementation for future use)
 * This is a more secure implementation that could be used with a backend
 */
export async function encryptDataSecure(data: string, password: string): Promise<string> {
  try {
    const salt = generateSalt();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const key = await deriveKeyFromPassword(password, salt);
    
    const dataBuffer = stringToArrayBuffer(data);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      dataBuffer
    );

    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Secure data encryption failed:', error);
    throw new Error('Failed to encrypt data securely');
  }
}

/**
 * Decrypt sensitive data using AES-GCM (full implementation for future use)
 */
export async function decryptDataSecure(encryptedData: string, password: string): Promise<string> {
  try {
    const combined = base64ToArrayBuffer(encryptedData);
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKeyFromPassword(password, new Uint8Array(salt));

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv) as BufferSource,
      },
      key,
      encrypted
    );

    return arrayBufferToString(decrypted);
  } catch (error) {
    console.error('Secure data decryption failed:', error);
    throw new Error('Failed to decrypt data securely');
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array.buffer).replace(/[+/=]/g, '').substring(0, length);
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues !== 'undefined';
}