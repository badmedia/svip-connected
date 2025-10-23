import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";
import { checkRateLimit, taskRateLimiter } from "@/lib/rateLimiter";
import { logSecurityEvent, sanitizeError } from "@/lib/security";

const taskSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.number().min(20, "Minimum budget is ₹20").max(200, "Maximum budget is ₹200"),
  category: z.enum(["notes_typing", "ppt_design", "tutoring", "app_testing", "writing_help"]),
  task_type: z.enum(["offer", "request"]),
});

interface PostTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
}

export const PostTaskModal = ({ open, onOpenChange, onTaskCreated }: PostTaskModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "50",
    category: "",
    task_type: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Check rate limit for task creation
      const rateLimitCheck = checkRateLimit(taskRateLimiter, user.id);
      if (!rateLimitCheck.allowed) {
        toast({
          title: "Rate Limit Exceeded",
          description: `Please wait ${rateLimitCheck.retryAfter} seconds before posting another task.`,
          variant: "destructive",
        });
        return;
      }

      const validatedData = taskSchema.parse({
        ...formData,
        budget: parseInt(formData.budget),
      });

      const { error } = await supabase.from("tasks").insert({
        user_id: user?.id,
        title: sanitizeText(validatedData.title, { maxLen: 120 }),
        description: sanitizeText(validatedData.description, { maxLen: 2000 }),
        budget: validatedData.budget,
        category: validatedData.category,
        task_type: validatedData.task_type,
        status: "open",
      });

      if (error) throw error;

      // Log security event
      await logSecurityEvent('task_created', {
        task_title: validatedData.title,
        budget: validatedData.budget,
        category: validatedData.category
      }, user.id);

      toast({
        title: "Task posted!",
        description: "Your task is now live on the feed.",
      });

      onOpenChange(false);
      onTaskCreated();
      setFormData({ title: "", description: "", budget: "50", category: "", task_type: "" });
    } catch (error: any) {
      // Log security event for failed task creation
      await logSecurityEvent('task_creation_failed', {
        error: error.message,
        form_data: formData
      }, user?.id);

      toast({
        title: "Error",
        description: sanitizeError(error) || "Failed to post task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Post a Quick Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task_type" className="text-sm font-medium">I want to...</Label>
            <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="request">Request help</SelectItem>
                <SelectItem value="offer">Offer my services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notes_typing">📝 Notes / Typing</SelectItem>
                <SelectItem value="ppt_design">🎨 PPT / Design</SelectItem>
                <SelectItem value="tutoring">👨‍🏫 Tutoring</SelectItem>
                <SelectItem value="app_testing">🧪 App Testing</SelectItem>
                <SelectItem value="writing_help">✍️ Writing Help</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Task Title</Label>
            <Input
              id="title"
              placeholder="e.g., Need PPT for Marketing presentation"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you need or what you can do..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="text-sm font-medium">Budget (₹20 - ₹200)</Label>
            <Input
              id="budget"
              type="number"
              min="20"
              max="200"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              className="h-10"
              required
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Posting..." : "Post Task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
