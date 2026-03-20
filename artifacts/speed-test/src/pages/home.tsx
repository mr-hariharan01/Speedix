import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Network, AlertCircle, RefreshCw, Zap, ThumbsUp, AlertTriangle } from "lucide-react";
import { useSpeedTest, TestPhase } from "@/hooks/use-speed-test";
import { MetricCard } from "@/components/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Speedometer } from "@/components/speedometer";
import { SpeedChart } from "@/components/speed-chart";
import { formatPing, formatSpeed } from "@/lib/utils";
import { playStartSound, playTickSound, playSuccessSound } from "@/lib/sounds";

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

  const handleStartTest = () => {
    if (isRunning) return;
    playStartSound();
    startTest();
  };

  useEffect(() => {
    if (liveSpeed !== null && liveSpeed > 0) {
      playTickSound();
    }
  }, [liveSpeed]);

  useEffect(() => {
    if (phase === "complete") {
      playSuccessSound();
    }
  }, [phase]);

  const getStatusText = (phase: TestPhase) => {
    switch (phase) {
      case "idle": return "Ready to measure";
      case "ping": return "Testing Ping...";
      case "download": return "Testing Download Speed...";
      case "upload": return "Testing Upload Speed...";
      case "retrying": return "Re-testing for accuracy...";
      case "finalizing": return "Finalizing Results...";
      case "complete": return "⚡ Test Complete!";
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-2 shadow-lg bg-white/5 border-white/10">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold tracking-widest speedix-gradient-text uppercase">SPEEDIX</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight">
            Speedix <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent glow-text">⚡</span>
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide">Measure the Real Internet</p>
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
          
          {/* Retrying Banner */}
          <AnimatePresence>
            {phase === "retrying" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-500 overflow-hidden"
              >
                <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />
                <p className="text-sm font-medium">🔄 Re-testing for accuracy... (low speed detected)</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-destructive overflow-hidden"
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

        {/* Speedix Result Card */}
        <AnimatePresence>
          {phase === "complete" && insight && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -30 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="w-full max-w-2xl mt-4 relative speedix-gradient-border rounded-2xl p-[1px] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00CFFF] to-[#7A00FF] opacity-30" />
              <div className="relative bg-card w-full h-full rounded-2xl p-6 flex flex-col gap-6">
                <h3 className="text-2xl font-display font-extrabold tracking-tight text-white text-center">
                  ⚡ Speedix Result
                </h3>
                
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-white/10">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Download</span>
                    <span className="text-3xl font-mono font-bold text-[#00CFFF]">{formatSpeed(downloadMbps)}</span>
                    <span className="text-xs text-muted-foreground uppercase">Mbps</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Upload</span>
                    <span className="text-3xl font-mono font-bold text-[#7A00FF]">{formatSpeed(uploadMbps)}</span>
                    <span className="text-xs text-muted-foreground uppercase">Mbps</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Ping</span>
                    <span className="text-3xl font-mono font-bold text-white">{formatPing(pingMs)}</span>
                    <span className="text-xs text-muted-foreground uppercase">ms</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 pt-4 border-t border-white/10">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold tracking-wider ${
                    insight.rating === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    insight.rating === 'Good' ? 'bg-[#00CFFF]/20 text-[#00CFFF] border border-[#00CFFF]/30' :
                    'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    <span>{insight.emoji}</span>
                    <span className="uppercase">{insight.rating}</span>
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed text-center">
                    {insight.message}
                  </p>
                </div>
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
            <button
              onClick={handleStartTest}
              disabled={isRunning}
              className="group relative px-10 py-5 rounded-full font-display font-bold text-xl text-white transition-all duration-300 flex items-center gap-3 overflow-hidden shadow-[0_0_30px_rgba(0,207,255,0.4)] hover:shadow-[0_0_40px_rgba(122,0,255,0.5)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed select-none bg-gradient-to-r from-[#00CFFF] to-[#7A00FF]"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {phase === "complete" || phase === "error" ? (
                <>
                  <RefreshCw className="w-6 h-6 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="relative z-10">Test Again</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current relative z-10" />
                  <span className="relative z-10">▶ Start Test</span>
                </>
              )}
            </button>
          )}
        </motion.div>

      </main>
    </div>
  );
}