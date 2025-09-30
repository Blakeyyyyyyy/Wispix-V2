const TOKEN_PATTERNS = /(sk-[\w-]{20,}|pk_[\w-]{20,}|pat\w{10,}|xox[baprs]-[\w-]{20,}|secret_[\w]{32}|whsec_[\w]{32})/gi;

export const mask = (str: string): string => {
  if (!str) return str;
  
  return str.replace(TOKEN_PATTERNS, '<TOKEN>');
};

export const maskObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return mask(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(maskObject);
  }
  
  if (obj && typeof obj === 'object') {
    const masked: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Mask values that look like secrets
        if (typeof obj[key] === 'string' && (
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password')
        )) {
          masked[key] = '<TOKEN>';
        } else {
          masked[key] = maskObject(obj[key]);
        }
      }
    }
    return masked;
  }
  
  return obj;
};