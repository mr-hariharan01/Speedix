import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Network, AlertCircle, RefreshCw } from "lucide-react";
import { useSpeedTest, TestPhase } from "@/hooks/use-speed-test";
import { MetricCard } from "@/components/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatPing, formatSpeed } from "@/lib/utils";

export default function Home() {
  const { 
    phase, 
    pingMs, 
    downloadMbps, 
    uploadMbps, 
    progress, 
    error, 
    startTest, 
    cancelTest, 
    isRunning 
  } = useSpeedTest();

  const getStatusText = (phase: TestPhase) => {
    switch (phase) {
      case "idle": return "Ready to test";
      case "ping": return "Measuring latency...";
      case "download": return "Testing download speed...";
      case "upload": return "Testing upload speed...";
      case "complete": return "Test complete!";
      case "error": return "Test failed";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 selection:bg-primary/30">
      
      {/* Decorative top blurred elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="fixed top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      <main className="w-full max-w-5xl mx-auto flex flex-col items-center gap-12 relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-4">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Network Diagnostics</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight">
            Internet <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent glow-text">Speed Test</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Measure your real-world connection speed with an actual 20MB payload transfer.
          </p>
        </motion.div>

        {/* Status & Progress */}
        <div className="w-full max-w-2xl flex flex-col gap-4">
          <div className="flex justify-between items-end px-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-sm font-medium text-muted-foreground flex items-center gap-2"
              >
                {isRunning && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
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
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Ping"
            value={formatPing(pingMs)}
            unit="ms"
            icon="ping"
            isActive={phase === "ping"}
            isComplete={["download", "upload", "complete"].includes(phase)}
            delay={0.1}
          />
          <MetricCard
            title="Download"
            value={formatSpeed(downloadMbps)}
            unit="MB/s"
            icon="download"
            isActive={phase === "download"}
            isComplete={["upload", "complete"].includes(phase)}
            delay={0.2}
          />
          <MetricCard
            title="Upload"
            value={formatSpeed(uploadMbps)}
            unit="MB/s"
            icon="upload"
            isActive={phase === "upload"}
            isComplete={phase === "complete"}
            delay={0.3}
          />
        </div>

        {/* Action Button */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          {isRunning ? (
            <button
              onClick={cancelTest}
              className="group relative px-8 py-4 rounded-2xl font-display font-bold text-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all duration-300 flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.1)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:-translate-y-1"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Cancel Test</span>
            </button>
          ) : (
            <button
              onClick={startTest}
              className="group relative px-10 py-5 rounded-2xl font-display font-bold text-xl bg-foreground text-background hover:bg-white transition-all duration-300 flex items-center gap-3 overflow-hidden btn-pulse hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {phase === "complete" || phase === "error" ? (
                <>
                  <RefreshCw className="w-6 h-6 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="relative z-10">Test Again</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current relative z-10" />
                  <span className="relative z-10">Start Test</span>
                </>
              )}
            </button>
          )}
        </motion.div>

      </main>
    </div>
  );
}
