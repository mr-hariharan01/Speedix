import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  className?: string;
  isActive?: boolean;
}

export function ProgressBar({ progress, className, isActive }: ProgressBarProps) {
  return (
    <div className={cn("relative h-3 w-full overflow-hidden rounded-full bg-secondary/50", className)}>
      <motion.div
        className="h-full bg-gradient-to-r from-primary to-accent"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {isActive && (
        <motion.div
          className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
      )}
    </div>
  );
}
