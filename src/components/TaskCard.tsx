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
      className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 hover:shadow-2xl transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src={task.profiles.avatar_url || "/placeholder.svg"}
            alt={task.profiles.full_name}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-sm sm:text-base">{task.profiles.full_name}</h3>
            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-32 sm:max-w-none">{task.profiles.college}</span>
            </div>
          </div>
        </div>
        <TrustBadge score={task.profiles.trust_score || 0} size="sm" />
      </div>

      {/* Task Content */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl sm:text-2xl">{categoryIcons[task.category]}</span>
          <Badge variant={task.task_type === "offer" ? "default" : "secondary"} className="text-xs">
            {task.task_type === "offer" ? "Offering" : "Requesting"}
          </Badge>
          <Badge variant="outline" className="text-xs">{categoryLabels[task.category]}</Badge>
        </div>
        <h4 className="font-bold text-base sm:text-lg line-clamp-2">{task.title}</h4>
        <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">{task.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-lg sm:text-2xl font-bold text-primary">₹{task.budget}</div>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            {timeAgo(task.created_at)}
          </div>
        </div>
        <Button
          onClick={onConnect}
          className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-shadow text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
        >
          Connect
        </Button>
      </div>
    </motion.div>
  );
};
