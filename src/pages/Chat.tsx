import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Check, Shield, ShieldCheck, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeText } from "@/lib/sanitize";
import { checkRateLimit, messageRateLimiter } from "@/lib/rateLimiter";
import { logSecurityEvent, sanitizeError } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EncryptionService } from "@/lib/encryption";
import { KeyExchangeService } from "@/lib/keyExchange";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  encrypted_message?: string;
  encryption_key_id?: string;
  message_type?: string;
  encryption_iv?: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface Chat {
  id: string;
  task_id: string;
  requester_id: string;
  helper_id: string;
  tasks: {
    title: string;
    budget: number;
    status: string;
  };
}

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("task");
  const chatIdParam = searchParams.get("chat");
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<{
    isEncrypted: boolean;
    keyId: string | null;
    participants: string[];
  }>({ isEncrypted: false, keyId: null, participants: [] });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const encryptionService = EncryptionService.getInstance();
  const keyExchangeService = KeyExchangeService.getInstance();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!taskId && !chatIdParam) {
      navigate("/");
      return;
    }
    
    // Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables:", {
        url: supabaseUrl,
        key: supabaseKey ? "present" : "missing"
      });
      toast({
        title: "Configuration Error",
        description: "Missing Supabase configuration. Please check your environment variables.",
        variant: "destructive",
      });
      return;
    }
    
    initializeChat();
  }, [user, authLoading, taskId, chatIdParam, navigate]);

  useEffect(() => {
    if (!chat) return;
    fetchMessages();
    const unsubscribe = subscribeToMessages();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeChat = async () => {
    try {
      console.log("Initializing chat for task:", taskId, "user:", user?.id);
      
      // If a chat id is provided, load that chat if the user is a participant
      if (chatIdParam) {
        const { data: chatById, error: chatByIdError } = await supabase
          .from("chats")
          .select("*, tasks(title, budget, status)")
          .eq("id", chatIdParam)
          .or(`requester_id.eq.${user!.id},helper_id.eq.${user!.id}`)
          .single();

        if (chatByIdError || !chatById) {
          throw new Error("Chat not found or you are not a participant");
        }
        setChat(chatById);
        
        // Initialize encryption for existing chat
        await initializeEncryption(chatById);
        
        setLoading(false);
        return;
      }

      // No chat id, proceed based on task id
      // Check if a chat exists for this task where current user participates
      const { data: existingChat, error: chatError } = await supabase
        .from("chats")
        .select("*, tasks(title, budget, status)")
        .eq("task_id", taskId!)
        .or(`requester_id.eq.${user?.id},helper_id.eq.${user?.id}`)
        .maybeSingle();

      if (existingChat) {
        setChat(existingChat);
        
        // Initialize encryption for existing chat
        await initializeEncryption(existingChat);
        
        setLoading(false);
        return;
      }

      // Get task details
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("user_id")
        .eq("id", taskId!)
        .single();

      console.log("Task data:", task, "Error:", taskError);

      if (taskError || !task) {
        throw new Error("Task not found");
      }

      // If current user is the task owner, do not create a new chat without a helper context
      if (task.user_id === user!.id) {
        // Try to find any existing chats for this task where user is requester
        const { data: ownerChats } = await supabase
          .from("chats")
          .select("*, tasks(title, budget, status)")
          .eq("task_id", taskId!)
          .eq("requester_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (ownerChats && ownerChats.length > 0) {
          setChat(ownerChats[0]);
          
          // Initialize encryption for existing chat
          await initializeEncryption(ownerChats[0]);
          
          setLoading(false);
          return;
        }

        toast({
          title: "No chat available",
          description: "You can open existing conversations from the Chats tab.",
        });
        navigate("/chats");
        return;
      }

      // Check if a chat already exists for this exact requester/helper pair
      const { data: existingPairChat } = await supabase
        .from("chats")
        .select("*, tasks(title, budget, status)")
        .eq("task_id", taskId!)
        .eq("requester_id", task.user_id)
        .eq("helper_id", user!.id)
        .maybeSingle();

      if (existingPairChat) {
        setChat(existingPairChat);
        
        // Initialize encryption for existing chat
        await initializeEncryption(existingPairChat);
        
        setLoading(false);
        return;
      }

      // Create or fetch chat atomically to avoid unique constraint errors
      const { data: newChat, error: insertError } = await supabase
        .from("chats")
        .upsert(
          {
            task_id: taskId!,
            requester_id: task.user_id,
            helper_id: user!.id,
          },
          { onConflict: "task_id,requester_id,helper_id" }
        )
        .select("*, tasks(title, budget, status)")
        .single();

      console.log("New chat created:", newChat, "Error:", insertError);

      if (insertError) {
        console.error("Insert error details:", insertError);
        throw insertError;
      }

      setChat(newChat);
      
      // Initialize encryption for the new chat
      await initializeEncryption(newChat);
    } catch (error: any) {
      console.error("Chat initialization error:", error);
      toast({
        title: "Error",
        description: `Failed to initialize chat: ${error.message}`,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Initialize encryption for chat
  const initializeEncryption = async (chatData: Chat) => {
    try {
      if (!user) return;

      // Initialize user keys if not already done
      await encryptionService.initializeUserKeys(user.id);

      // Get chat participants
      const participants = [chatData.requester_id, chatData.helper_id];

      // Check if we have a valid chat key
      const hasValidKey = await encryptionService.hasValidChatKey(chatData.id);
      if (!hasValidKey) {
        console.log("No valid chat key found, generating new one for:", chatData.id);
        await encryptionService.generateChatKey(chatData.id, participants);
      } else {
        console.log("Valid chat key found for:", chatData.id);
        
        // Test if the key actually works
        const keyWorks = await encryptionService.testChatKey(chatData.id);
        if (!keyWorks) {
          console.warn("Chat key exists but doesn't work, regenerating for:", chatData.id);
          await encryptionService.clearChatKey(chatData.id);
          await encryptionService.generateChatKey(chatData.id, participants);
        }
      }

      // Set encryption status
      setEncryptionStatus({
        isEncrypted: true,
        keyId: chatData.id,
        participants
      });
      setIsEncrypted(true);

      console.log("Encryption initialized for chat:", chatData.id);
    } catch (error) {
      console.error("Error initializing encryption:", error);
      // Don't show error to user as encryption is optional for now
      setIsEncrypted(false);
    }
  };

  const fetchMessages = async () => {
    if (!chat) return;
    console.log("Fetching messages for chat:", chat.id);
    
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id, message, sender_id, created_at, 
          profiles(full_name, avatar_url)
        `)
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true })
        .limit(100);
      
      console.log("Messages fetched:", data, "Error:", error);
      
      if (data) {
        // Decrypt messages if they are encrypted
        const decryptedMessages = await Promise.all(
          data.map(async (msg: Message) => {
            // Check if message is encrypted (starts with [ENCRYPTED:)
            if (msg.message.startsWith('[ENCRYPTED:')) {
              try {
                // Parse the encrypted message format: [ENCRYPTED:keyId:iv:encryptedMessage]
                const parts = msg.message.substring(11).split(':'); // Remove [ENCRYPTED:
                if (parts.length >= 3) {
                  const keyId = parts[0];
                  const iv = parts[1];
                  const encryptedMessage = parts.slice(2).join(':'); // Join remaining parts
                  
                  console.log("Attempting to decrypt message:", { 
                    keyId, 
                    iv: iv.substring(0, 10) + "...", 
                    encryptedMessage: encryptedMessage.substring(0, 20) + "...",
                    chatId: chat.id,
                    fullMessage: msg.message.substring(0, 100) + "..."
                  });
                  
                  // Check if we have a valid chat key before attempting decryption
                  const keyInfo = await encryptionService.getChatKeyInfo(chat.id);
                  console.log("Chat key info:", keyInfo);
                  
                  if (!keyInfo.exists) {
                    console.warn("No chat key found for decryption");
                    return { ...msg, message: "[Encrypted message - no decryption key available. Please refresh the page.]" };
                  }
                  
                  const decryptedText = await encryptionService.decryptMessage(
                    encryptedMessage,
                    chat.id,
                    iv
                  );
                  
                  console.log("Successfully decrypted message");
                  return { ...msg, message: decryptedText };
                } else {
                  console.error("Invalid encrypted message format:", msg.message);
                  return { ...msg, message: "[Encrypted message - invalid format]" };
                }
              } catch (decryptError) {
                console.error("Failed to decrypt message:", decryptError);
                console.error("Message details:", { 
                  messageId: msg.id, 
                  chatId: chat.id, 
                  encryptedMessage: msg.message.substring(0, 50) + "..." 
                });
                
                // Check if this is a key-related error
                if (decryptError.message.includes("No valid chat key found")) {
                  return { ...msg, message: "[Encrypted message - decryption key missing. Please refresh the page.]" };
                } else if (decryptError.message.includes("OperationError")) {
                  // This is likely a key mismatch - the message was encrypted with a different key
                  console.warn("OperationError detected - likely key mismatch for message:", msg.id);
                  return { ...msg, message: "[Encrypted message - cannot decrypt. This message was encrypted with a different key or has corrupted data. Use 'Clear Corrupted' to remove it.]" };
                } else if (decryptError.message.includes("Invalid IV length") || decryptError.message.includes("Invalid encrypted data length")) {
                  return { ...msg, message: "[Encrypted message - corrupted data. Please use 'Clear Corrupted' to remove this message.]" };
                } else {
                  return { ...msg, message: "[Encrypted message - decryption failed. Please refresh the page or start a new chat.]" };
                }
              }
            }
            return msg;
          })
        );
        
        // Check if we have a mix of successful and failed decryptions
        const encryptedMessages = data.filter(msg => msg.message.startsWith('[ENCRYPTED:'));
        const failedDecryptions = decryptedMessages.filter(msg => 
          msg.message.includes('[Encrypted message -') && 
          (msg.message.includes('key mismatch') || msg.message.includes('OperationError'))
        );
        const successfulDecryptions = decryptedMessages.filter(msg => 
          !msg.message.includes('[Encrypted message -') && 
          encryptedMessages.some(orig => orig.id === msg.id)
        );
        
        if (encryptedMessages.length > 0) {
          if (failedDecryptions.length === encryptedMessages.length) {
            console.warn("All encrypted messages failed to decrypt - likely key mismatch for entire chat");
            toast({
              title: "Encryption Key Mismatch",
              description: "All encrypted messages failed to decrypt. This usually means the encryption key has changed. Use 'Clear Corrupted' to remove old messages and start fresh.",
              variant: "destructive",
            });
          } else if (failedDecryptions.length > 0 && successfulDecryptions.length > 0) {
            console.warn("Mixed decryption results - some messages encrypted with different key");
            toast({
              title: "Mixed Encryption Keys",
              description: `${failedDecryptions.length} messages failed to decrypt (likely encrypted with a different key), but ${successfulDecryptions.length} messages decrypted successfully. Use 'Clear Corrupted' to remove the problematic messages.`,
              variant: "destructive",
            });
          }
        }
        
        setMessages(decryptedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  const subscribeToMessages = () => {
    if (!chat) return;
    console.log("Subscribing to messages for chat:", chat.id);
    const channel = supabase
      .channel(`chat-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Unsubscribing from messages");
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat || !user) return;

    // Check rate limit
    const rateLimitCheck = checkRateLimit(messageRateLimiter, user.id);
    if (!rateLimitCheck.allowed) {
      toast({
        title: "Rate Limit Exceeded",
        description: `Please wait ${rateLimitCheck.retryAfter} seconds before sending another message.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const sanitized = sanitizeText(newMessage.trim(), { maxLen: 1000 });
      if (!sanitized) return;
      
      let messageToSend = sanitized;

      // Encrypt message if encryption is enabled
      if (isEncrypted) {
        try {
          const { encryptedMessage, keyId, iv } = await encryptionService.encryptMessage(
            sanitized,
            chat.id
          );
          
          // For now, we'll store the encrypted message in the regular message field
          // In the future, we can use dedicated encryption fields
          messageToSend = `[ENCRYPTED:${keyId}:${iv}:${encryptedMessage}]`;
          
          console.log("Message encrypted successfully");
        } catch (encryptError) {
          console.error("Encryption failed, sending as plain text:", encryptError);
          // Fall back to plain text if encryption fails
        }
      }
      
      const { data, error } = await supabase.from("messages").insert({
        chat_id: chat.id,
        sender_id: user?.id,
        message: messageToSend,
      }).select();

      if (error) {
        throw error;
      }
      
      // Log security event
      await logSecurityEvent('message_sent', {
        chat_id: chat.id,
        message_length: sanitized.length,
        encrypted: isEncrypted
      }, user.id);
      
      setNewMessage("");
    } catch (error: any) {
      // Log security event for failed message
      await logSecurityEvent('message_send_failed', {
        error: error.message,
        chat_id: chat.id
      }, user.id);
      
      toast({
        title: "Error",
        description: `Failed to send message: ${sanitizeError(error)}`,
        variant: "destructive",
      });
    }
  };

  // Method to fix encryption issues by regenerating chat key
  const fixEncryptionIssues = async () => {
    if (!chat || !user) return;
    
    try {
      console.log("Attempting to fix encryption issues for chat:", chat.id);
      
      // Get current key info for debugging
      const keyInfo = await encryptionService.getChatKeyInfo(chat.id);
      console.log("Current key info before fix:", keyInfo);
      
      // Use force regeneration to ensure a completely fresh key
      const participants = [chat.requester_id, chat.helper_id];
      await encryptionService.forceRegenerateChatKey(chat.id, participants);
      
      // Verify the new key works
      const newKeyInfo = await encryptionService.getChatKeyInfo(chat.id);
      console.log("New key info after fix:", newKeyInfo);
      
      // Refresh messages
      await fetchMessages();
      
      toast({
        title: "Encryption Fixed",
        description: "Chat encryption has been completely reset. Try sending a new message.",
      });
    } catch (error) {
      console.error("Error fixing encryption:", error);
      toast({
        title: "Error",
        description: "Failed to fix encryption issues. Please try clearing corrupted messages.",
        variant: "destructive",
      });
    }
  };

  // Method to clear all encrypted messages and start fresh
  const clearEncryptedMessages = async () => {
    if (!chat || !user) return;
    
    try {
      console.log("Clearing all encrypted messages for chat:", chat.id);
      
      // Get all messages for this chat
      const { data: messages, error } = await supabase
        .from("messages")
        .select("id, message")
        .eq("chat_id", chat.id);
      
      if (error) throw error;
      
      // Find encrypted messages and delete them
      const encryptedMessageIds = messages
        .filter(msg => msg.message.startsWith('[ENCRYPTED:'))
        .map(msg => msg.id);
      
      if (encryptedMessageIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("messages")
          .delete()
          .in("id", encryptedMessageIds);
        
        if (deleteError) throw deleteError;
        
        console.log(`Deleted ${encryptedMessageIds.length} encrypted messages`);
      }
      
      // Clear chat key and regenerate with force regeneration
      const participants = [chat.requester_id, chat.helper_id];
      await encryptionService.forceRegenerateChatKey(chat.id, participants);
      
      // Refresh messages
      await fetchMessages();
      
      toast({
        title: "Messages Cleared",
        description: `Cleared ${encryptedMessageIds.length} corrupted encrypted messages. You can now send new messages.`,
      });
    } catch (error) {
      console.error("Error clearing encrypted messages:", error);
      toast({
        title: "Error",
        description: "Failed to clear encrypted messages",
        variant: "destructive",
      });
    }
  };

  // Method to clear only the problematic encrypted messages (keep the ones that work)
  const clearProblematicMessages = async () => {
    if (!chat || !user) return;
    
    try {
      console.log("Clearing only problematic encrypted messages for chat:", chat.id);
      
      // Get all messages for this chat
      const { data: messages, error } = await supabase
        .from("messages")
        .select("id, message")
        .eq("chat_id", chat.id);
      
      if (error) throw error;
      
      // Find encrypted messages and test which ones fail to decrypt
      const encryptedMessages = messages.filter(msg => msg.message.startsWith('[ENCRYPTED:'));
      const problematicMessageIds: string[] = [];
      
      for (const msg of encryptedMessages) {
        try {
          // Parse the encrypted message format: [ENCRYPTED:keyId:iv:encryptedMessage]
          const parts = msg.message.substring(11).split(':');
          if (parts.length >= 3) {
            const keyId = parts[0];
            const iv = parts[1];
            const encryptedMessage = parts.slice(2).join(':');
            
            // Try to decrypt to see if it works
            await encryptionService.decryptMessage(encryptedMessage, chat.id, iv);
            console.log("Message decrypts successfully:", msg.id);
          }
        } catch (decryptError) {
          console.log("Message fails to decrypt, marking for deletion:", msg.id);
          problematicMessageIds.push(msg.id);
        }
      }
      
      if (problematicMessageIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("messages")
          .delete()
          .in("id", problematicMessageIds);
        
        if (deleteError) throw deleteError;
        
        console.log(`Deleted ${problematicMessageIds.length} problematic encrypted messages`);
      }
      
      // Refresh messages
      await fetchMessages();
      
      toast({
        title: "Problematic Messages Cleared",
        description: `Cleared ${problematicMessageIds.length} problematic encrypted messages. Messages that could be decrypted were kept.`,
      });
    } catch (error) {
      console.error("Error clearing problematic messages:", error);
      toast({
        title: "Error",
        description: "Failed to clear problematic messages",
        variant: "destructive",
      });
    }
  };

  const markAsCompleted = async () => {
    if (!chat || !user) return;
    try {
      // Only the requester (task poster) can mark as complete
      const { data: task } = await supabase
        .from("tasks")
        .select("user_id")
        .eq("id", chat.task_id)
        .single();

      const isPoster = task?.user_id === user.id;

      if (!isPoster) {
        toast({
          title: "Not permitted",
          description: "Only the task requester can mark this as complete.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", chat.task_id);

      if (error) throw error;

      toast({
        title: "Task completed!",
        description: "Don't forget to endorse each other.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to mark task as completed",
        variant: "destructive",
      });
    }
  };

  // Delete chat and all its messages
  const deleteChat = async () => {
    if (!chat || !user) return;
    
    try {
      // Get message count before deletion
      const { count: messageCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("chat_id", chat.id);

      // Delete the chat (cascade will delete all messages and chat keys)
      const { error } = await supabase
        .from("chats")
        .delete()
        .eq("id", chat.id);

      if (error) throw error;

      // Log the deletion
      console.log("Chat deleted from chat interface:", {
        chatId: chat.id,
        taskId: chat.task_id,
        messagesDeleted: messageCount || 0
      });

      toast({
        title: "Chat deleted",
        description: `The chat and ${messageCount || 0} messages have been deleted.`,
      });

      // Navigate back to dashboard
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="glass-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold">{chat?.tasks.title}</h2>
                {isEncrypted && (
                  <div className="flex items-center gap-1 text-green-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-medium">End-to-End Encrypted</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Budget: ₹{chat?.tasks.budget}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEncrypted && (
              <div className="flex items-center gap-1 text-amber-600">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Not Encrypted</span>
              </div>
            )}
            {isEncrypted && (
              <div className="flex gap-2">
                <Button 
                  onClick={fixEncryptionIssues} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Fix Encryption
                </Button>
                <Button 
                  onClick={clearProblematicMessages} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Clear Bad Messages
                </Button>
                <Button 
                  onClick={clearEncryptedMessages} 
                  variant="destructive" 
                  size="sm"
                  className="text-xs"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Clear All Encrypted
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              {chat?.tasks.status === "open" && (
                <Button onClick={markAsCompleted} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Mark Completed
                </Button>
              )}
              <Button 
                onClick={deleteChat} 
                variant="destructive" 
                size="sm"
                className="text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                    <img
                      src={message.profiles.avatar_url || "/placeholder.svg"}
                      alt={message.profiles.full_name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div
                        className={`glass-card p-3 rounded-2xl ${
                          isOwn ? "bg-primary text-primary-foreground" : ""
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-2">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="glass-card border-t border-border p-4 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
