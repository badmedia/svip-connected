// Rate limiting utility for client-side throttling
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < this.config.windowMs
      );
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }

  isAllowed(identifier: string): boolean {
    this.cleanup();
    
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : identifier;
    
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );
    
    if (validTimestamps.length >= this.config.maxRequests) {
      return false;
    }
    
    // Add current request
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    
    return true;
  }

  getRemainingTime(identifier: string): number {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : identifier;
    
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length < this.config.maxRequests) {
      return 0;
    }
    
    const oldestRequest = Math.min(...timestamps);
    return Math.max(0, this.config.windowMs - (Date.now() - oldestRequest));
  }
}

// Rate limiters for different operations
export const messageRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 messages per minute
  windowMs: 60 * 1000,
  keyGenerator: (userId) => `messages:${userId}`
});

export const taskRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 tasks per hour
  windowMs: 60 * 60 * 1000,
  keyGenerator: (userId) => `tasks:${userId}`
});

export const searchRateLimiter = new RateLimiter({
  maxRequests: 30, // 30 searches per minute
  windowMs: 60 * 1000,
  keyGenerator: (userId) => `search:${userId}`
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 auth attempts per 15 minutes
  windowMs: 15 * 60 * 1000,
  keyGenerator: (email) => `auth:${email.toLowerCase()}`
});

// Utility function to check rate limits
export const checkRateLimit = (
  limiter: RateLimiter, 
  identifier: string
): { allowed: boolean; retryAfter?: number } => {
  const allowed = limiter.isAllowed(identifier);
  if (!allowed) {
    const retryAfter = Math.ceil(limiter.getRemainingTime(identifier) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
};
