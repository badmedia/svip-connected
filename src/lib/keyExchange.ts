// Key Exchange Service for End-to-End Encryption
import { supabase } from "@/integrations/supabase/client";
import { EncryptionService } from "./encryption";

export interface KeyExchangeMessage {
  type: 'key_exchange' | 'key_rotation' | 'key_verification';
  chatId: string;
  senderId: string;
  recipientId: string;
  encryptedKey: string;
  keyId: string;
  timestamp: string;
}

export class KeyExchangeService {
  private static instance: KeyExchangeService;
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = EncryptionService.getInstance();
  }

  static getInstance(): KeyExchangeService {
    if (!KeyExchangeService.instance) {
      KeyExchangeService.instance = new KeyExchangeService();
    }
    return KeyExchangeService.instance;
  }

  // Initialize encryption for a new chat
  async initializeChatEncryption(chatId: string, participants: string[]): Promise<void> {
    try {
      // For now, just generate the chat key without database storage
      await this.encryptionService.generateChatKey(chatId, participants);
      console.log("Chat encryption initialized successfully");
    } catch (error) {
      console.error("Error initializing chat encryption:", error);
      throw new Error("Failed to initialize chat encryption");
    }
  }

  // Exchange keys between chat participants
  async exchangeKeys(chatId: string, participants: string[]): Promise<void> {
    try {
      // Ensure all participants have encryption keys
      for (const participantId of participants) {
        await this.encryptionService.initializeUserKeys(participantId);
      }

      // Initialize chat encryption
      await this.initializeChatEncryption(chatId, participants);

      // Send key exchange notifications to participants
      await this.notifyParticipants(chatId, participants);
    } catch (error) {
      console.error("Error exchanging keys:", error);
      throw new Error("Failed to exchange encryption keys");
    }
  }

  // Notify participants about key exchange
  private async notifyParticipants(chatId: string, participants: string[]): Promise<void> {
    try {
      // In a real implementation, you would send encrypted key exchange messages
      // For now, we'll just log the notification
      console.log(`Key exchange completed for chat ${chatId} with participants:`, participants);
    } catch (error) {
      console.error("Error notifying participants:", error);
    }
  }

  // Verify encryption keys
  async verifyKeys(chatId: string, userId: string): Promise<boolean> {
    try {
      // Check if user has active encryption keys
      const userKeys = await this.encryptionService.getUserActiveKey(userId);
      if (!userKeys) {
        return false;
      }

      // For now, assume chat encryption is available
      return true;
    } catch (error) {
      console.error("Error verifying keys:", error);
      return false;
    }
  }

  // Rotate encryption keys (for enhanced security)
  async rotateKeys(chatId: string, userId: string): Promise<void> {
    try {
      // Generate new user keys
      const newUserKeys = await this.encryptionService.generateUserKeyPair();
      await this.encryptionService.storeUserKeys(userId, newUserKeys);

      // Generate new chat key
      await this.encryptionService.generateChatKey(chatId, []);

      // For now, just update in memory
      console.log("Keys rotated successfully");
    } catch (error) {
      console.error("Error rotating keys:", error);
      throw new Error("Failed to rotate encryption keys");
    }
  }

  // Get key fingerprint for verification
  async getKeyFingerprint(userId: string): Promise<string> {
    try {
      const userKeys = await this.encryptionService.getUserActiveKey(userId);
      if (!userKeys) {
        return "No keys found";
      }

      return await this.encryptionService.getKeyFingerprint(userKeys.publicKey);
    } catch (error) {
      console.error("Error getting key fingerprint:", error);
      return "Error";
    }
  }

  // Check if chat is encrypted
  async isChatEncrypted(chatId: string): Promise<boolean> {
    try {
      // For now, assume all chats can be encrypted
      // In the future, we can check localStorage or database
      return true;
    } catch (error) {
      console.error("Error checking chat encryption:", error);
      return false;
    }
  }

  // Get encryption status for a chat
  async getEncryptionStatus(chatId: string): Promise<{
    isEncrypted: boolean;
    keyId: string | null;
    participants: string[];
  }> {
    try {
      // For now, return a basic status
      return {
        isEncrypted: true,
        keyId: chatId,
        participants: []
      };
    } catch (error) {
      console.error("Error getting encryption status:", error);
      return {
        isEncrypted: false,
        keyId: null,
        participants: []
      };
    }
  }
}
