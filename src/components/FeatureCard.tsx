import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export const FeatureCard = ({ icon: Icon, title, description, className }: FeatureCardProps) => {
  return (
    <div
      className={cn(
        "glass-card p-8 rounded-3xl hover-lift group cursor-pointer",
        "border border-border/50 transition-all duration-300",
        className
      )}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-8 h-8 text-primary-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
