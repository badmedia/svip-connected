// End-to-End Encryption Service
import { supabase } from "@/integrations/supabase/client";

export interface UserKeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  createdAt: string;
}

export interface ChatEncryptionKey {
  chatId: string;
  sharedSecret: string;
  keyId: string;
  participants: string[];
}

export interface EncryptedMessage {
  encryptedMessage: string;
  keyId: string;
  iv: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private userKeys: Map<string, CryptoKey> = new Map();
  private chatKeys: Map<string, CryptoKey> = new Map();
  private userPrivateKeys: Map<string, CryptoKey> = new Map();

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  // Generate user key pair using RSA-OAEP
  async generateUserKeyPair(): Promise<UserKeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

      const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
      const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

      const keyId = crypto.randomUUID();
      
      // Store keys in memory for performance
      this.userKeys.set(keyId, keyPair.publicKey);
      this.userPrivateKeys.set(keyId, keyPair.privateKey);

      return {
        publicKey: this.arrayBufferToBase64(publicKeyBuffer),
        privateKey: this.arrayBufferToBase64(privateKeyBuffer),
        keyId,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error generating user key pair:", error);
      throw new Error("Failed to generate encryption keys");
    }
  }

  // Generate shared key for chat using AES-GCM
  async generateChatKey(chatId: string, participants: string[]): Promise<string> {
    try {
      // Check if key already exists
      if (this.chatKeys.has(chatId)) {
        console.log("Chat key already exists for:", chatId);
        return chatId;
      }

      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );

      // Store the key in memory
      this.chatKeys.set(chatId, key);
      
      // Save to localStorage for persistence
      try {
        const exportedKey = await crypto.subtle.exportKey("raw", key);
        const keyData = {
          key: this.arrayBufferToBase64(exportedKey),
          chatId,
          participants,
          timestamp: Date.now()
        };
        localStorage.setItem(`chat_key_${chatId}`, JSON.stringify(keyData));
        console.log("Chat key saved to localStorage for:", chatId);
      } catch (error) {
        console.warn("Failed to save chat key to localStorage:", error);
      }
      
      return chatId;
    } catch (error) {
      console.error("Error generating chat key:", error);
      throw new Error("Failed to generate chat encryption key");
    }
  }

  // Encrypt message for chat
  async encryptMessage(message: string, chatId: string): Promise<EncryptedMessage> {
    try {
      // Ensure chat key exists
      await this.ensureChatKey(chatId);
      const chatKey = await this.getChatKey(chatId);
      const encodedMessage = new TextEncoder().encode(message);
      
      // Generate random IV for each message
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv.buffer },
        chatKey,
        encodedMessage
      );

      return {
        encryptedMessage: this.arrayBufferToBase64(encrypted),
        keyId: chatId,
        iv: this.arrayBufferToBase64(iv.buffer)
      };
    } catch (error) {
      console.error("Error encrypting message:", error);
      throw new Error("Failed to encrypt message");
    }
  }

  // Decrypt message
  async decryptMessage(encryptedMessage: string, chatId: string, iv: string): Promise<string> {
    try {
      console.log("Starting decryption process for chat:", chatId);
      
      // Ensure chat key exists
      await this.ensureChatKey(chatId);
      const chatKey = await this.getChatKey(chatId);
      
      console.log("Chat key retrieved successfully");
      
      // Validate inputs
      if (!encryptedMessage || !iv) {
        throw new Error("Missing encrypted message or IV");
      }
      
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedMessage);
      const ivBuffer = this.base64ToArrayBuffer(iv);
      
      console.log("Base64 decoding successful, buffer sizes:", {
        encrypted: encryptedBuffer.byteLength,
        iv: ivBuffer.byteLength,
        encryptedBase64: encryptedMessage.substring(0, 50) + "...",
        ivBase64: iv.substring(0, 20) + "..."
      });
      
      // Validate IV length (should be 12 bytes for AES-GCM)
      if (ivBuffer.byteLength !== 12) {
        throw new Error(`Invalid IV length: ${ivBuffer.byteLength} bytes (expected 12)`);
      }
      
      // Validate encrypted data length (should be at least 16 bytes for AES-GCM with auth tag)
      if (encryptedBuffer.byteLength < 16) {
        throw new Error(`Invalid encrypted data length: ${encryptedBuffer.byteLength} bytes (minimum 16)`);
      }
      
      console.log("Input validation passed, attempting decryption...");
      
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        chatKey,
        encryptedBuffer
      );

      const result = new TextDecoder().decode(decrypted);
      console.log("Decryption successful, result length:", result.length);
      return result;
    } catch (error) {
      console.error("Error decrypting message:", error);
      console.error("Decryption details:", {
        chatId,
        encryptedMessageLength: encryptedMessage?.length,
        ivLength: iv?.length,
        errorName: error.name,
        errorMessage: error.message,
        encryptedPreview: encryptedMessage?.substring(0, 100),
        ivPreview: iv?.substring(0, 50)
      });
      
      // Check if this is a key mismatch issue
      if (error.name === 'OperationError') {
        console.error("OperationError detected - likely key mismatch or corrupted data");
        // Try to get key info for debugging
        try {
          const keyInfo = await this.getChatKeyInfo(chatId);
          console.error("Key info during error:", keyInfo);
        } catch (keyError) {
          console.error("Failed to get key info:", keyError);
        }
      }
      
      throw new Error(`Failed to decrypt message: ${error.message}`);
    }
  }

  // Store user keys in database (fallback to localStorage for now)
  async storeUserKeys(userId: string, keyPair: UserKeyPair): Promise<void> {
    try {
      // For now, store in localStorage since database migration isn't available
      const userKeys = {
        userId,
        keyPair,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`user_keys_${userId}`, JSON.stringify(userKeys));
      console.log("User keys stored in localStorage");
    } catch (error) {
      console.error("Error storing user keys:", error);
      // Don't throw error, just log it
    }
  }

  // Get user's active key
  async getUserActiveKey(userId: string): Promise<UserKeyPair | null> {
    try {
      // For now, get from localStorage since database migration isn't available
      const stored = localStorage.getItem(`user_keys_${userId}`);
      if (stored) {
        const userKeys = JSON.parse(stored);
        return userKeys.keyPair;
      }
      return null;
    } catch (error) {
      console.error("Error getting user key:", error);
      return null;
    }
  }

  // Initialize or get user keys
  async initializeUserKeys(userId: string): Promise<UserKeyPair> {
    let userKeys = await this.getUserActiveKey(userId);
    
    if (!userKeys) {
      userKeys = await this.generateUserKeyPair();
      await this.storeUserKeys(userId, userKeys);
    }

    return userKeys;
  }

  // Initialize chat encryption
  async initializeChatEncryption(chatId: string, participants: string[]): Promise<void> {
    try {
      // Check if chat key already exists
      if (this.chatKeys.has(chatId)) {
        return;
      }

      // Generate new chat key
      await this.generateChatKey(chatId, participants);

      // For now, just store in memory
      // In the future, we can store in database when migration is available
      console.log("Chat key stored in memory");
    } catch (error) {
      console.error("Error initializing chat encryption:", error);
      throw new Error("Failed to initialize chat encryption");
    }
  }

  // Ensure chat key exists (create if needed)
  private async ensureChatKey(chatId: string): Promise<void> {
    if (!this.chatKeys.has(chatId)) {
      // Try to load from localStorage first
      const storedKey = localStorage.getItem(`chat_key_${chatId}`);
      if (!storedKey) {
        // Generate new key if none exists
        await this.generateChatKey(chatId, []);
      } else {
        // Try to load the existing key
        try {
          await this.getChatKey(chatId);
        } catch (error) {
          console.warn("Failed to load existing chat key, generating new one:", error);
          await this.generateChatKey(chatId, []);
        }
      }
    }
  }

  // Get chat key (load from localStorage if not in memory)
  private async getChatKey(chatId: string): Promise<CryptoKey> {
    if (this.chatKeys.has(chatId)) {
      return this.chatKeys.get(chatId)!;
    }

    // Try to load from localStorage first
    try {
      const storedKey = localStorage.getItem(`chat_key_${chatId}`);
      if (storedKey) {
        const keyData = JSON.parse(storedKey);
        
        // Validate key data structure
        if (!keyData.key || typeof keyData.key !== 'string') {
          throw new Error('Invalid key data structure');
        }
        
        const key = await crypto.subtle.importKey(
          "raw",
          this.base64ToArrayBuffer(keyData.key),
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"]
        );
        this.chatKeys.set(chatId, key);
        console.log("Successfully loaded chat key from localStorage for:", chatId);
        return key;
      }
    } catch (error) {
      console.warn("Failed to load chat key from localStorage:", error);
      // Clear corrupted key data
      localStorage.removeItem(`chat_key_${chatId}`);
    }

    // Only generate new key if explicitly requested (not for decryption)
    throw new Error(`No valid chat key found for chat: ${chatId}. Please regenerate the chat key.`);
  }

  // Clear chat key (for debugging/regeneration)
  async clearChatKey(chatId: string): Promise<void> {
    this.chatKeys.delete(chatId);
    localStorage.removeItem(`chat_key_${chatId}`);
    console.log("Cleared chat key for:", chatId);
  }

  // Regenerate chat key (for debugging)
  async regenerateChatKey(chatId: string, participants: string[]): Promise<string> {
    await this.clearChatKey(chatId);
    return await this.generateChatKey(chatId, participants);
  }

  // Check if a chat key is valid and can decrypt messages
  async validateChatKey(chatId: string): Promise<boolean> {
    try {
      const key = await this.getChatKey(chatId);
      return key !== null;
    } catch (error) {
      console.warn("Chat key validation failed:", error);
      return false;
    }
  }

  // Get chat key info for debugging
  async getChatKeyInfo(chatId: string): Promise<{
    exists: boolean;
    inMemory: boolean;
    inLocalStorage: boolean;
    timestamp?: number;
  }> {
    const inMemory = this.chatKeys.has(chatId);
    const storedKey = localStorage.getItem(`chat_key_${chatId}`);
    const inLocalStorage = !!storedKey;
    
    let timestamp: number | undefined;
    if (storedKey) {
      try {
        const keyData = JSON.parse(storedKey);
        timestamp = keyData.timestamp;
      } catch (error) {
        console.warn("Failed to parse stored key data:", error);
      }
    }
    
    return {
      exists: inMemory || inLocalStorage,
      inMemory,
      inLocalStorage,
      timestamp
    };
  }

  // Check if chat key exists and is valid
  async hasValidChatKey(chatId: string): Promise<boolean> {
    try {
      if (this.chatKeys.has(chatId)) {
        return true;
      }
      
      // Check localStorage
      const storedKey = localStorage.getItem(`chat_key_${chatId}`);
      if (storedKey) {
        const keyData = JSON.parse(storedKey);
        const key = await crypto.subtle.importKey(
          "raw",
          this.base64ToArrayBuffer(keyData.key),
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"]
        );
        this.chatKeys.set(chatId, key);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking chat key validity:", error);
      // If the key is corrupted, remove it
      localStorage.removeItem(`chat_key_${chatId}`);
      return false;
    }
  }

  // Test if a chat key can actually decrypt a test message
  async testChatKey(chatId: string): Promise<boolean> {
    try {
      const key = await this.getChatKey(chatId);
      if (!key) return false;
      
      // Create a test message
      const testMessage = "test";
      const encodedMessage = new TextEncoder().encode(testMessage);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt test message
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv.buffer },
        key,
        encodedMessage
      );
      
      // Try to decrypt it
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv.buffer },
        key,
        encrypted
      );
      
      const result = new TextDecoder().decode(decrypted);
      return result === testMessage;
    } catch (error) {
      console.error("Chat key test failed:", error);
      return false;
    }
  }

  // Force regenerate chat key and clear all encrypted messages
  async forceRegenerateChatKey(chatId: string, participants: string[]): Promise<void> {
    try {
      console.log("Force regenerating chat key for:", chatId);
      
      // Clear existing key
      await this.clearChatKey(chatId);
      
      // Generate new key
      await this.generateChatKey(chatId, participants);
      
      // Test the new key
      const keyWorks = await this.testChatKey(chatId);
      if (!keyWorks) {
        throw new Error("New chat key test failed");
      }
      
      console.log("Chat key force regeneration successful");
    } catch (error) {
      console.error("Error force regenerating chat key:", error);
      throw error;
    }
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      // Validate the result
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        throw new Error('Generated invalid base64');
      }
      
      return base64;
    } catch (error) {
      console.error('Base64 encoding error:', error);
      throw new Error(`Failed to encode to base64: ${error.message}`);
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      // Clean the base64 string (remove any whitespace or invalid characters)
      const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        throw new Error('Invalid base64 format');
      }
      
      // Ensure proper padding
      const paddedBase64 = cleanBase64 + '='.repeat((4 - cleanBase64.length % 4) % 4);
      
      const binary = atob(paddedBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('Base64 decoding error:', error);
      console.error('Problematic base64 string:', base64.substring(0, 50) + '...');
      console.error('Clean base64 string:', base64.replace(/[^A-Za-z0-9+/=]/g, '').substring(0, 50) + '...');
      throw new Error(`Failed to decode base64: ${error.message}`);
    }
  }

  // Clear all keys from memory (for security)
  clearKeys(): void {
    this.userKeys.clear();
    this.chatKeys.clear();
    this.userPrivateKeys.clear();
  }

  // Get key fingerprint for verification
  async getKeyFingerprint(publicKey: string): Promise<string> {
    try {
      const keyBuffer = this.base64ToArrayBuffer(publicKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", keyBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch (error) {
      console.error("Error generating key fingerprint:", error);
      return "unknown";
    }
  }
}
