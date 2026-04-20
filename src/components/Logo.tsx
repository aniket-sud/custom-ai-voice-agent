import { Link } from "react-router-dom";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
  const text = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };
  return (
    <Link to="/" className={cn("flex items-center gap-2 group", className)}>
      <div className={cn("relative rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow transition-smooth group-hover:scale-105", sizes[size])}>
        <Mic className="h-1/2 w-1/2 text-primary-foreground" />
      </div>
      <span className={cn("font-display font-bold tracking-tight", text[size])}>
        Voice<span className="text-gradient-primary">AI</span>
      </span>
    </Link>
  );
}
