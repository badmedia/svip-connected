import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, Trash2, Shield, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { KeyExchangeService } from "@/lib/keyExchange";

interface ChatItem {
  id: string;
  task_id: string;
  requester_id: string;
  helper_id: string;
  created_at: string;
  tasks: { title: string } | null;
  last_message?: { message: string; created_at: string; sender_id: string } | null;
  isEncrypted?: boolean;
}

export const UserChats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const keyExchangeService = KeyExchangeService.getInstance();

  useEffect(() => {
    if (!user) return;
    fetchChats();
  }, [user]);

  const fetchChats = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("chats")
        .select(`
          id, task_id, requester_id, helper_id, created_at,
          tasks(title),
          messages:messages!messages_chat_id_fkey(created_at)
        `)
        .or(`requester_id.eq.${user!.id},helper_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const items: ChatItem[] = (data || []).map((c: any) => ({ ...c }));

      // For now, assume all chats can be encrypted
      const chatsWithEncryption = items.map(chat => ({
        ...chat,
        isEncrypted: true // Assume all chats are encrypted for now
      }));

      setChats(chatsWithEncryption);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (chatId: string, taskId: string) => {
    navigate(`/chat?task=${taskId}&chat=${chatId}`);
  };

  const deleteChat = async (chatId: string) => {
    try {
      setDeletingChatId(chatId);
      
      const { error } = await supabase
        .from("chats")
        .delete()
        .eq("id", chatId);

      if (error) {
        throw error;
      }

      // Remove the chat from local state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      toast({
        title: "Chat deleted",
        description: "The chat has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingChatId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading your chats...
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No chats yet. Start by posting a task or replying to one.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {chats.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <p className="font-medium truncate">
                  {c.tasks?.title || "Task"}
                </p>
                {c.isEncrypted && (
                  <div className="flex items-center gap-1 text-green-600">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-xs">E2E</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {c.last_message?.message || "No messages yet"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => openChat(c.id, c.task_id)} variant="outline" size="sm">
                Open
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    disabled={deletingChatId === c.id}
                  >
                    {deletingChatId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this chat? This action cannot be undone.
                      All messages in this chat will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteChat(c.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


