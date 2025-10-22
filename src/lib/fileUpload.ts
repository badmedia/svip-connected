// Secure file upload validation and processing
export interface FileUploadConfig {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  maxFiles: number;
}

export const DEFAULT_FILE_CONFIG: FileUploadConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx'],
  maxFiles: 5
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFile?: File;
}

export const validateFile = (
  file: File, 
  config: FileUploadConfig = DEFAULT_FILE_CONFIG
): FileValidationResult => {
  // Check file size
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(config.maxSize / 1024 / 1024)}MB`
    };
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = config.allowedExtensions.some(ext => 
    fileName.endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `File extension not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`
    };
  }

  // Sanitize filename
  const sanitizedFileName = sanitizeFileName(file.name);
  
  // Create sanitized file
  const sanitizedFile = new File([file], sanitizedFileName, {
    type: file.type,
    lastModified: file.lastModified
  });

  return {
    valid: true,
    sanitizedFile
  };
};

export const sanitizeFileName = (fileName: string): string => {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '');
  
  // Remove control characters and special characters
  sanitized = sanitized.replace(/[^\w\s.-]/g, '');
  
  // Limit length
  const maxLength = 100;
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop() || '';
    const nameWithoutExt = sanitized.substring(0, maxLength - ext.length - 1);
    sanitized = `${nameWithoutExt}.${ext}`;
  }
  
  return sanitized;
};

export const scanFileContent = async (file: File): Promise<boolean> => {
  // Basic content scanning for malicious patterns
  const text = await file.text();
  
  // Check for script tags and javascript
  const scriptPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /document\./gi,
    /window\./gi
  ];
  
  for (const pattern of scriptPatterns) {
    if (pattern.test(text)) {
      return false; // Potentially malicious content
    }
  }
  
  return true; // Safe content
};

export const generateSecureFileName = (originalName: string, userId: string): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || '';
  return `${userId}_${timestamp}_${randomId}.${extension}`;
};
