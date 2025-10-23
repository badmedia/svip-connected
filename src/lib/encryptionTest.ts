// Test file for encryption functionality
import { EncryptionService } from "./encryption";
import { KeyExchangeService } from "./keyExchange";

export class EncryptionTest {
  private encryptionService: EncryptionService;
  private keyExchangeService: KeyExchangeService;

  constructor() {
    this.encryptionService = EncryptionService.getInstance();
    this.keyExchangeService = KeyExchangeService.getInstance();
  }

  // Test basic encryption/decryption
  async testBasicEncryption(): Promise<boolean> {
    try {
      console.log("Testing basic encryption...");
      
      const testMessage = "Hello, this is a test message for encryption!";
      const chatId = "test-chat-123";
      
      // Generate chat key
      await this.encryptionService.generateChatKey(chatId, ["user1", "user2"]);
      
      // Encrypt message
      const { encryptedMessage, keyId, iv } = await this.encryptionService.encryptMessage(
        testMessage,
        chatId
      );
      
      console.log("Encrypted message length:", encryptedMessage.length);
      console.log("Key ID:", keyId);
      console.log("IV length:", iv.length);
      
      // Decrypt message
      const decryptedMessage = await this.encryptionService.decryptMessage(
        encryptedMessage,
        chatId,
        iv
      );
      
      console.log("Original message:", testMessage);
      console.log("Decrypted message:", decryptedMessage);
      
      const success = decryptedMessage === testMessage;
      console.log("Encryption test result:", success ? "PASSED" : "FAILED");
      
      return success;
    } catch (error) {
      console.error("Encryption test failed:", error);
      return false;
    }
  }

  // Test user key generation
  async testUserKeyGeneration(): Promise<boolean> {
    try {
      console.log("Testing user key generation...");
      
      const userKeys = await this.encryptionService.generateUserKeyPair();
      
      console.log("Generated key ID:", userKeys.keyId);
      console.log("Public key length:", userKeys.publicKey.length);
      console.log("Private key length:", userKeys.privateKey.length);
      
      const success = userKeys.keyId && userKeys.publicKey && userKeys.privateKey;
      console.log("User key generation test result:", success ? "PASSED" : "FAILED");
      
      return success;
    } catch (error) {
      console.error("User key generation test failed:", error);
      return false;
    }
  }

  // Test key fingerprint generation
  async testKeyFingerprint(): Promise<boolean> {
    try {
      console.log("Testing key fingerprint generation...");
      
      const userKeys = await this.encryptionService.generateUserKeyPair();
      const fingerprint = await this.encryptionService.getKeyFingerprint(userKeys.publicKey);
      
      console.log("Generated fingerprint:", fingerprint);
      
      const success = fingerprint && fingerprint.length > 0;
      console.log("Key fingerprint test result:", success ? "PASSED" : "FAILED");
      
      return success;
    } catch (error) {
      console.error("Key fingerprint test failed:", error);
      return false;
    }
  }

  // Run all tests
  async runAllTests(): Promise<{ passed: number; total: number; results: boolean[] }> {
    console.log("Starting encryption tests...");
    
    const tests = [
      this.testBasicEncryption(),
      this.testUserKeyGeneration(),
      this.testKeyFingerprint()
    ];
    
    const results = await Promise.all(tests);
    const passed = results.filter(result => result).length;
    
    console.log(`\nTest Results: ${passed}/${results.length} tests passed`);
    
    return {
      passed,
      total: results.length,
      results
    };
  }
}

// Export test function for easy access
export const runEncryptionTests = async () => {
  const test = new EncryptionTest();
  return await test.runAllTests();
};
