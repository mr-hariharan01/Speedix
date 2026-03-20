import { motion } from "framer-motion";

export function Speedometer({ speed }: { speed: number | null }) {
  const displaySpeed = speed ?? 0;
  
  // Angle range: -120 to 120 (240 degrees total)
  // Value range: 0 to 200 Mbps
  const maxSpeed = 200;
  const clampedSpeed = Math.min(Math.max(displaySpeed, 0), maxSpeed);
  const rotation = -120 + (clampedSpeed / maxSpeed) * 240;

  // Circle path for SVG
  const radius = 120;
  const cx = 150;
  const cy = 150;
  const strokeWidth = 16;
  
  // Calculate dash array and offset for a 240 degree arc
  const circumference = 2 * Math.PI * radius;
  const arcLength = (240 / 360) * circumference;
  const dashOffset = circumference - arcLength;

  return (
    <div className="relative w-[300px] h-[300px] mx-auto flex items-center justify-center">
      {/* Background Arc */}
      <svg className="absolute inset-0 w-full h-full -rotate-[210deg]">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      
      {/* Colored Zones Arc */}
      <svg className="absolute inset-0 w-full h-full -rotate-[210deg]">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#speedGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <defs>
          <linearGradient id="speedGradient" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />   {/* Red */}
            <stop offset="40%" stopColor="#eab308" />  {/* Yellow */}
            <stop offset="100%" stopColor="#22c55e" /> {/* Green */}
          </linearGradient>
        </defs>
      </svg>

      {/* Animated Needle */}
      <motion.div
        className="absolute w-1 h-[140px] origin-bottom bottom-1/2 left-[calc(50%-2px)] rounded-full bg-foreground shadow-lg"
        initial={{ rotate: -120 }}
        animate={{ rotate: rotation }}
        transition={{ type: "spring", stiffness: 60, damping: 15 }}
      >
        <div className="w-4 h-4 bg-primary rounded-full absolute -bottom-2 -left-[6px] shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
      </motion.div>

      {/* Digital Display */}
      <div className="absolute top-[60%] flex flex-col items-center">
        <div className="text-5xl font-mono font-bold tracking-tight text-foreground glow-text">
          {displaySpeed.toFixed(1)}
        </div>
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Mbps
        </div>
      </div>
    </div>
  );
}