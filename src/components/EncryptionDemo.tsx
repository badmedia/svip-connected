// Demo component for testing encryption functionality
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { runEncryptionTests } from "@/lib/encryptionTest";
import { EncryptionService } from "@/lib/encryption";

export const EncryptionDemo = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    passed: number;
    total: number;
    results: boolean[];
  } | null>(null);
  
  // Live encryption demo
  const [demoMessage, setDemoMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [showEncrypted, setShowEncrypted] = useState(false);

  const encryptionService = EncryptionService.getInstance();

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runEncryptionTests();
      setTestResults(results);
    } catch (error) {
      console.error("Test execution failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const encryptDemoMessage = async () => {
    if (!demoMessage.trim()) return;
    
    setIsEncrypting(true);
    try {
      const chatId = "demo-chat-123";
      
      // Generate chat key for demo
      await encryptionService.generateChatKey(chatId, ["demo-user"]);
      
      // Encrypt the message
      const { encryptedMessage: encrypted, keyId, iv } = await encryptionService.encryptMessage(
        demoMessage,
        chatId
      );
      
      setEncryptedMessage(`[ENCRYPTED:${keyId}:${iv}:${encrypted}]`);
      
      // Decrypt to show it works
      const decrypted = await encryptionService.decryptMessage(encrypted, chatId, iv);
      setDecryptedMessage(decrypted);
      
    } catch (error) {
      console.error("Encryption demo failed:", error);
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Suite */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            End-to-End Encryption Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This demo tests the encryption functionality without requiring database access.
            It verifies that messages can be encrypted and decrypted correctly.
          </div>
          
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Run Encryption Tests
              </>
            )}
          </Button>

          {testResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Test Results:</span>
                <Badge variant={testResults.passed === testResults.total ? "default" : "destructive"}>
                  {testResults.passed}/{testResults.total} Passed
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {testResults.results[0] ? (
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">Basic Encryption/Decryption</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {testResults.results[1] ? (
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">User Key Generation</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {testResults.results[2] ? (
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">Key Fingerprint Generation</span>
                </div>
              </div>

              {testResults.passed === testResults.total && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-green-800">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-medium">All tests passed! Encryption system is working correctly.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Encryption Demo */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Live Encryption Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-message">Enter a message to encrypt:</Label>
            <Input
              id="demo-message"
              value={demoMessage}
              onChange={(e) => setDemoMessage(e.target.value)}
              placeholder="Type your message here..."
            />
          </div>
          
          <Button 
            onClick={encryptDemoMessage} 
            disabled={!demoMessage.trim() || isEncrypting}
            className="w-full"
          >
            {isEncrypting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Encrypting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Encrypt Message
              </>
            )}
          </Button>

          {encryptedMessage && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Encrypted Message:</Label>
                <div className="relative">
                  <Input
                    value={showEncrypted ? encryptedMessage : "••••••••••••••••••••••••••••••••"}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowEncrypted(!showEncrypted)}
                  >
                    {showEncrypted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              {decryptedMessage && (
                <div className="space-y-2">
                  <Label>Decrypted Message:</Label>
                  <Input
                    value={decryptedMessage}
                    readOnly
                    className="bg-green-50 border-green-200"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm font-medium">Encryption successful!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};