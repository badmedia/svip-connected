import { motion } from "framer-motion";
import { TrustBadge } from "@/components/TrustBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin } from "lucide-react";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    budget: number;
    category: string;
    task_type: string;
    created_at: string;
    profiles: {
      full_name: string;
      college: string;
      trust_score: number;
      avatar_url: string;
    };
  };
  onConnect: () => void;
}

const categoryIcons: Record<string, string> = {
  notes_typing: "📝",
  ppt_design: "🎨",
  tutoring: "👨‍🏫",
  app_testing: "🧪",
  writing_help: "✍️",
};

const categoryLabels: Record<string, string> = {
  notes_typing: "Notes / Typing",
  ppt_design: "PPT / Design",
  tutoring: "Tutoring",
  app_testing: "App Testing",
  writing_help: "Writing Help",
};

export const TaskCard = ({ task, onConnect }: TaskCardProps) => {
  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-card rounded-3xl p-6 space-y-4 hover:shadow-2xl transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img
            src={task.profiles.avatar_url || "/placeholder.svg"}
            alt={task.profiles.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold">{task.profiles.full_name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {task.profiles.college}
            </div>
          </div>
        </div>
        <TrustBadge score={task.profiles.trust_score || 0} size="sm" />
      </div>

      {/* Task Content */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{categoryIcons[task.category]}</span>
          <Badge variant={task.task_type === "offer" ? "default" : "secondary"}>
            {task.task_type === "offer" ? "Offering" : "Requesting"}
          </Badge>
          <Badge variant="outline">{categoryLabels[task.category]}</Badge>
        </div>
        <h4 className="font-bold text-lg">{task.title}</h4>
        <p className="text-muted-foreground text-sm line-clamp-2">{task.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-primary">₹{task.budget}</div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {timeAgo(task.created_at)}
          </div>
        </div>
        <Button
          onClick={onConnect}
          className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-shadow"
        >
          Connect
        </Button>
      </div>
    </motion.div>
  );
};
