import crypto from 'crypto';

// Use environment variable for encryption key in production
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'wispix-default-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a string using AES-256-GCM encryption
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:encryptedData:authTag
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return IV, authTag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a string using AES-256-GCM decryption
 * @param encryptedText - The encrypted text in format: iv:encryptedData:authTag
 * @returns Decrypted string
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    
    if (parts.length === 2) {
      // Legacy format (old encryption)
      const [ivHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } else if (parts.length === 3) {
      // New format (with authTag)
      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } else {
      throw new Error('Invalid encrypted text format');
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypts credentials object
 * @param credentials - The credentials object to encrypt
 * @returns Encrypted credentials string
 */
export function encryptCredentials(credentials: Record<string, any>): string {
  return encrypt(JSON.stringify(credentials));
}

/**
 * Decrypts credentials string back to object
 * @param encryptedCredentials - The encrypted credentials string
 * @returns Decrypted credentials object
 */
export function decryptCredentials(encryptedCredentials: string): Record<string, any> {
  const decrypted = decrypt(encryptedCredentials);
  return JSON.parse(decrypted);
}

/**
 * Validates if a string is encrypted (has the expected format)
 * @param text - The text to validate
 * @returns True if encrypted, false otherwise
 */
export function isEncrypted(text: string): boolean {
  return text.includes(':') && text.split(':').length === 2;
}

