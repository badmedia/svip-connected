import { Shield, Star, Award } from "lucide-react";
import { motion } from "framer-motion";

interface BadgeDisplayProps {
  trustScore: number;
  className?: string;
}

export const Badge = ({ trustScore, className }: BadgeDisplayProps) => {
  const getBadgeInfo = () => {
    if (trustScore >= 10) {
      return {
        icon: Award,
        label: "Campus Legend",
        color: "from-yellow-400 to-orange-500",
        description: "10+ completed tasks",
      };
    }
    if (trustScore >= 4) {
      return {
        icon: Star,
        label: "Reliable",
        color: "from-blue-400 to-cyan-500",
        description: "4-10 completed tasks",
      };
    }
    return {
      icon: Shield,
      label: "New Helper",
      color: "from-green-400 to-emerald-500",
      description: "0-3 completed tasks",
    };
  };

  const badge = getBadgeInfo();
  const Icon = badge.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${badge.color} text-white shadow-lg ${className}`}
    >
      <Icon className="w-5 h-5" />
      <div>
        <div className="font-bold text-sm">{badge.label}</div>
        <div className="text-xs opacity-90">{badge.description}</div>
      </div>
    </motion.div>
  );
};
