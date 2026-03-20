import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, ArrowDown, ArrowUp, Loader2, TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | null;
  unit: string;
  icon: "ping" | "download" | "upload";
  isActive: boolean;
  isComplete: boolean;
  delay?: number;
}

export function MetricCard({ title, value, unit, icon, isActive, isComplete, delay = 0 }: MetricCardProps) {
  const IconMap = {
    ping: Activity,
    download: ArrowDown,
    upload: ArrowUp,
  };
  
  const ColorMap = {
    ping: "text-emerald-400",
    download: "text-primary",
    upload: "text-accent",
  };

  const IconComponent = IconMap[icon];
  const colorClass = ColorMap[icon];

  const prevValueRef = useRef<number | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value !== null) {
      const numValue = parseFloat(value);
      if (prevValueRef.current !== null) {
        if (numValue > prevValueRef.current) setTrend("up");
        else if (numValue < prevValueRef.current) setTrend("down");
      }
      prevValueRef.current = numValue;
    }
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "glass-panel relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
        isActive ? "ring-2 ring-primary/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] scale-105" : "hover:bg-white/[0.02]",
        isComplete && !isActive ? "opacity-80" : ""
      )}
    >
      {isActive && (
        <motion.div 
          className="absolute -inset-10 bg-primary/10 blur-[50px] rounded-full z-0"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
          </h3>
          <div className={cn("p-2 rounded-xl bg-white/5 border border-white/10", colorClass)}>
            {isActive && value === null ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <IconComponent className="w-5 h-5" />
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-4">
          <div className="text-4xl md:text-5xl font-mono font-bold text-foreground tracking-tight flex items-center gap-2">
            {value !== null ? value : <span className="text-muted-foreground/30">--</span>}
            {isActive && trend === "up" && <TrendingUp className="w-6 h-6 text-emerald-500 animate-pulse" />}
            {isActive && trend === "down" && <TrendingDown className="w-6 h-6 text-destructive animate-pulse" />}
          </div>
          <div className="text-lg font-medium text-muted-foreground">
            {unit}
          </div>
        </div>
      </div>
      
      <motion.div 
        className={cn("absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent")}
        initial={{ width: 0, left: "50%", x: "-50%" }}
        animate={{ width: isActive ? "100%" : 0, opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}