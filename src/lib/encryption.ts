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
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );

      // Store the key in memory
      this.chatKeys.set(chatId, key);
      
      // In production, you would encrypt this key with each participant's public key
      // and store it in the database
      return chatId;
    } catch (error) {
      console.error("Error generating chat key:", error);
      throw new Error("Failed to generate chat encryption key");
    }
  }

  // Encrypt message for chat
  async encryptMessage(message: string, chatId: string): Promise<EncryptedMessage> {
    try {
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
      const chatKey = await this.getChatKey(chatId);
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedMessage);
      const ivBuffer = this.base64ToArrayBuffer(iv);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        chatKey,
        encryptedBuffer
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error("Error decrypting message:", error);
      throw new Error("Failed to decrypt message");
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

  // Get chat key (load from database if not in memory)
  private async getChatKey(chatId: string): Promise<CryptoKey> {
    if (this.chatKeys.has(chatId)) {
      return this.chatKeys.get(chatId)!;
    }

    // In production, you would fetch and decrypt the key from the database
    // For now, generate a new key
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    
    this.chatKeys.set(chatId, key);
    return key;
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
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
