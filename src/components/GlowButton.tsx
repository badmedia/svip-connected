import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => {
    const variantStyles = {
      primary: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:shadow-2xl hover:scale-105",
      secondary: "bg-gradient-to-r from-accent to-accent-glow text-accent-foreground hover:shadow-2xl hover:scale-105",
    };

    return (
      <Button
        ref={ref}
        className={cn(
          "rounded-full px-8 py-6 text-base font-semibold transition-all duration-300 shadow-lg",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

GlowButton.displayName = "GlowButton";
