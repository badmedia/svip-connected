import { Shield, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  score: number;
  verified?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const TrustBadge = ({ score, verified = false, className, size = "md" }: TrustBadgeProps) => {
  const getTrustColor = () => {
    if (score >= 80) return "trust-high";
    if (score >= 50) return "trust-medium";
    return "trust-low";
  };

  const sizeClasses = {
    sm: "w-12 h-12 text-xs",
    md: "w-16 h-16 text-sm",
    lg: "w-20 h-20 text-base",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div
        className={cn(
          "rounded-full glass-card flex flex-col items-center justify-center font-semibold transition-all",
          sizeClasses[size]
        )}
        style={{
          background: `linear-gradient(135deg, hsl(var(--${getTrustColor()})), hsl(var(--${getTrustColor()}) / 0.7))`,
          color: "white",
        }}
      >
        <span className="font-bold">{score}</span>
        <span className="text-[0.6em] opacity-90">Trust</span>
      </div>
      {verified && (
        <div className="absolute -bottom-1 -right-1 bg-trust-verified rounded-full p-1 shadow-lg">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};
