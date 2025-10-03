import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    console.log('🔐 Testing encryption...');
    
    // Check environment variables
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
    console.log('🔐 Encryption key available:', encryptionKey ? 'YES' : 'NO');
    console.log('🔐 Encryption key length:', encryptionKey ? encryptionKey.length : 0);
    
    if (!encryptionKey) {
      return res.status(200).json({
        success: false,
        error: 'CREDENTIAL_ENCRYPTION_KEY not set',
        suggestion: 'Set CREDENTIAL_ENCRYPTION_KEY environment variable in Vercel'
      });
    }
    
    // Test encryption
    const testData = { test: 'data', key: 'value' };
    const testString = JSON.stringify(testData);
    
    console.log('🔐 Testing encryption with data:', testString);
    
    // Use same encryption logic as the main file
    const ENCRYPTION_KEY = encryptionKey;
    const ALGORITHM = 'aes-256-gcm';
    
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(testString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    
    console.log('🔐 Encryption successful');
    
    res.status(200).json({
      success: true,
      message: 'Encryption test successful',
      encryptedLength: result.length,
      originalLength: testString.length
    });
    
  } catch (error) {
    console.error('❌ Encryption test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
