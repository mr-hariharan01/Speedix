import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Network, AlertCircle, RefreshCw, Zap, ThumbsUp, AlertTriangle } from "lucide-react";
import { useSpeedTest, TestPhase } from "@/hooks/use-speed-test";
import { MetricCard } from "@/components/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Speedometer } from "@/components/speedometer";
import { SpeedChart } from "@/components/speed-chart";
import { formatPing, formatSpeed } from "@/lib/utils";

export default function Home() {
  const { 
    phase, 
    pingMs, 
    downloadMbps, 
    uploadMbps, 
    liveSpeed,
    chartData,
    progress, 
    error, 
    insight,
    startTest, 
    cancelTest, 
    isRunning 
  } = useSpeedTest();

  // Hold-to-start state
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);
  const HOLD_DURATION = 1500; // 1.5s

  const startHold = () => {
    if (isRunning) return;
    setHoldProgress(0);
    holdStartTimeRef.current = performance.now();
    
    const updateHold = () => {
      if (!holdStartTimeRef.current) return;
      const elapsed = performance.now() - holdStartTimeRef.current;
      const p = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(p);
      
      if (p >= 1) {
        startTest();
        stopHold();
      } else {
        holdTimerRef.current = requestAnimationFrame(updateHold);
      }
    };
    
    holdTimerRef.current = requestAnimationFrame(updateHold);
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartTimeRef.current = null;
    setHoldProgress(0);
  };

  // Cleanup hold timer
  useEffect(() => {
    return () => stopHold();
  }, []);

  const getStatusText = (phase: TestPhase) => {
    switch (phase) {
      case "idle": return "Press Start to begin";
      case "ping": return "Testing Ping...";
      case "download": return "Testing Download Speed...";
      case "upload": return "Testing Upload Speed...";
      case "finalizing": return "Finalizing Results...";
      case "complete": return "Test Complete!";
      case "error": return "Test failed";
      default: return "";
    }
  };

  const getBackgroundEffect = () => {
    if (phase === "download") return { color: "var(--color-primary)", opacity: 0.15 };
    if (phase === "upload") return { color: "var(--color-accent)", opacity: 0.15 };
    if (phase === "complete" && insight) {
      if (insight.rating === "Excellent") return { color: "#10b981", opacity: 0.15 }; // emerald-500
      if (insight.rating === "Good") return { color: "var(--color-primary)", opacity: 0.15 };
      if (insight.rating === "Slow") return { color: "#f97316", opacity: 0.15 }; // orange-500
    }
    return { color: "var(--color-background)", opacity: 0 };
  };

  const bgEffect = getBackgroundEffect();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 selection:bg-primary/30 relative overflow-hidden bg-[#0a0a0f]">
      
      {/* Dynamic Background Effects */}
      <AnimatePresence>
        <motion.div 
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: bgEffect.opacity, backgroundColor: bgEffect.color }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 pointer-events-none blur-[120px]"
        />
      </AnimatePresence>

      <main className="w-full max-w-5xl mx-auto flex flex-col items-center gap-8 relative z-10 py-8">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-2 shadow-lg">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Network Diagnostics</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight">
            Internet <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent glow-text">Speed Test</span>
          </h1>
        </motion.div>

        {/* Speedometer Hero */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex justify-center my-4"
        >
          <Speedometer speed={liveSpeed ?? (phase === 'complete' ? Math.max(downloadMbps || 0, uploadMbps || 0) : null)} />
        </motion.div>

        {/* Status & Progress */}
        <div className="w-full max-w-2xl flex flex-col gap-3 -mt-4">
          <div className="flex justify-between items-end px-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-medium text-foreground flex items-center gap-3"
              >
                {isRunning && <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />}
                {getStatusText(phase)}
              </motion.div>
            </AnimatePresence>
            <div className="text-sm font-mono text-muted-foreground">
              {Math.round(progress)}%
            </div>
          </div>
          <ProgressBar progress={progress} isActive={isRunning} />
          
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-destructive"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Metrics Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <MetricCard
            title="Ping"
            value={formatPing(pingMs)}
            unit="ms"
            icon="ping"
            isActive={phase === "ping"}
            isComplete={["download", "upload", "finalizing", "complete"].includes(phase)}
            delay={0.1}
          />
          <MetricCard
            title="Download"
            value={formatSpeed(downloadMbps)}
            unit="Mbps"
            icon="download"
            isActive={phase === "download"}
            isComplete={["upload", "finalizing", "complete"].includes(phase)}
            delay={0.2}
          />
          <MetricCard
            title="Upload"
            value={formatSpeed(uploadMbps)}
            unit="Mbps"
            icon="upload"
            isActive={phase === "upload"}
            isComplete={["finalizing", "complete"].includes(phase)}
            delay={0.3}
          />
        </div>

        {/* Chart Section */}
        <div className="w-full max-w-4xl">
          <SpeedChart 
            data={chartData} 
            isVisible={isRunning || phase === "complete"} 
          />
        </div>

        {/* AI Insight Box */}
        <AnimatePresence>
          {phase === "complete" && insight && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ type: "spring", damping: 20 }}
              className="w-full max-w-2xl mt-4 glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 border border-white/5"
            >
              <div className={`p-4 rounded-full shrink-0 ${
                insight.rating === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                insight.rating === 'Good' ? 'bg-primary/20 text-primary' :
                'bg-orange-500/20 text-orange-400'
              }`}>
                {insight.rating === 'Excellent' && <Zap className="w-8 h-8" />}
                {insight.rating === 'Good' && <ThumbsUp className="w-8 h-8" />}
                {insight.rating === 'Slow' && <AlertTriangle className="w-8 h-8" />}
              </div>
              <div className="text-center sm:text-left flex-1 space-y-2">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-bold text-foreground tracking-tight">AI Insight</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    insight.rating === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    insight.rating === 'Good' ? 'bg-primary/20 text-primary border border-primary/30' :
                    'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {insight.rating}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {insight.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 h-24 flex items-center justify-center"
        >
          {isRunning ? (
            <button
              onClick={cancelTest}
              className="group relative px-8 py-4 rounded-full font-display font-bold text-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all duration-300 flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.1)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:-translate-y-1"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Cancel Test</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onContextMenu={(e) => e.preventDefault()} // prevent context menu on mobile long press
                className="group relative px-10 py-5 rounded-full font-display font-bold text-xl bg-foreground text-background hover:bg-white transition-all duration-300 flex items-center gap-3 overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] select-none"
              >
                {/* Hold Fill Animation */}
                <div 
                  className="absolute inset-0 bg-primary origin-left transition-none"
                  style={{ transform: `scaleX(${holdProgress})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {phase === "complete" || phase === "error" ? (
                  <>
                    <RefreshCw className="w-6 h-6 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="relative z-10 mix-blend-difference">Test Again</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current relative z-10 mix-blend-difference" />
                    <span className="relative z-10 mix-blend-difference">Hold to Start</span>
                  </>
                )}
              </button>
              
              {/* Hold Indicator Hint */}
              {(phase === "idle" || phase === "complete" || phase === "error") && holdProgress > 0 && (
                <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${holdProgress * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </motion.div>

      </main>
    </div>
  );
}