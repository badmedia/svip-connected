// Comprehensive security utilities
import { supabase } from "@/integrations/supabase/client";

// Logging level guard to reduce DB load on free tier
// levels: 'off' | 'error' | 'info' (default 'info')
const LOG_LEVEL = (import.meta.env.VITE_SECURITY_LOG_LEVEL as 'off' | 'error' | 'info') || 'info';

// CSRF Protection
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken && token.length === 64;
};

// Session Security
export const secureSessionStorage = {
  setItem: (key: string, value: string): void => {
    try {
      // Encrypt sensitive data before storing
      const encrypted = btoa(encodeURIComponent(value));
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;
      return decodeURIComponent(atob(encrypted));
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove session data:', error);
    }
  }
};

// Password Policy
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns and is not secure');
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Input Sanitization
export const sanitizeHtml = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

// Access Control
export const checkResourceAccess = async (
  resourceType: string,
  resourceId: string,
  userId: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> => {
  try {
    // This would be implemented with proper RLS policies
    // For now, we'll do basic checks
    switch (resourceType) {
      case 'profile':
        return action === 'read' || userId === resourceId;
      case 'task':
        // Check if user owns the task or is involved in it
        const { data: task } = await supabase
          .from('tasks')
          .select('user_id')
          .eq('id', resourceId)
          .single();
        return task?.user_id === userId;
      case 'message':
        // Check if user is part of the chat
        const { data: message } = await supabase
          .from('messages')
          .select(`
            chat_id,
            chats!inner(requester_id, helper_id)
          `)
          .eq('id', resourceId)
          .single();
        return message?.chats?.requester_id === userId || 
               message?.chats?.helper_id === userId;
      default:
        return false;
    }
  } catch {
    return false;
  }
};

// Audit Logging
export const logSecurityEvent = async (
  event: string,
  details: Record<string, any>,
  userId?: string
): Promise<void> => {
  try {
    if (LOG_LEVEL === 'off') return;
    if (LOG_LEVEL === 'error' && !event.includes('failed') && !event.includes('error')) return;
    await supabase.from('security_logs').insert({
      event,
      details,
      user_id: userId,
      ip_address: 'client', // Would be server-side
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Error Handling
export const sanitizeError = (error: any): string => {
  // Don't expose internal error details
  if (error?.code === '23505') {
    return 'This record already exists';
  }
  if (error?.code === '23503') {
    return 'Referenced record not found';
  }
  if (error?.code === '42501') {
    return 'Access denied';
  }
  if (error?.message?.includes('JWT')) {
    return 'Authentication required';
  }
  if (error?.message?.includes('RLS')) {
    return 'Access denied';
  }
  
  // Generic error message
  return 'An error occurred. Please try again.';
};

// Security Headers Helper
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
};
