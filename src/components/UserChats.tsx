import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";

interface ChatItem {
  id: string;
  task_id: string;
  requester_id: string;
  helper_id: string;
  created_at: string;
  tasks: { title: string } | null;
  last_message?: { message: string; created_at: string; sender_id: string } | null;
}

export const UserChats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatItem[]>([]);

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

      setChats(items);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (chatId: string, taskId: string) => {
    navigate(`/chat?task=${taskId}&chat=${chatId}`);
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
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {c.last_message?.message || "No messages yet"}
              </p>
            </div>
            <Button onClick={() => openChat(c.id, c.task_id)} variant="outline" size="sm">
              Open
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


