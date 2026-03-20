import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Square, AlertCircle, RefreshCw, Zap, Copy, Check,
  Gamepad2, Stethoscope, BarChart3, Gauge, Wifi
} from "lucide-react";
import { useSpeedTest, TestPhase } from "@/hooks/use-speed-test";
import { MetricCard } from "@/components/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Speedometer } from "@/components/speedometer";
import { SpeedChart } from "@/components/speed-chart";
import { formatPing, formatSpeed } from "@/lib/utils";
import { playStartSound, playTickSound, playSuccessSound } from "@/lib/sounds";
import {
  analyzeConnection,
  calculatePlanComparison,
  getGamingRating,
  generateShareText,
} from "@/lib/analysis";

// ─── helpers ────────────────────────────────────────────────────────────────

function getStatusText(phase: TestPhase): string {
  switch (phase) {
    case "idle":      return "Ready to measure";
    case "ping":      return "Testing Ping…";
    case "download":  return "Testing Download Speed…";
    case "upload":    return "Testing Upload Speed…";
    case "retrying":  return "Re-testing for accuracy…";
    case "finalizing":return "Finalizing Results…";
    case "complete":  return "⚡ Test Complete!";
    case "error":     return "Test failed";
    default:          return "";
  }
}

function getBackgroundEffect(phase: TestPhase, rating?: string) {
  if (phase === "download") return { color: "#00CFFF", opacity: 0.08 };
  if (phase === "upload")   return { color: "#7A00FF", opacity: 0.08 };
  if (phase === "complete") {
    if (rating === "Excellent") return { color: "#10b981", opacity: 0.08 };
    if (rating === "Good")      return { color: "#00CFFF", opacity: 0.08 };
    if (rating === "Slow")      return { color: "#f97316", opacity: 0.08 };
  }
  return { color: "#0a0a0f", opacity: 0 };
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", damping: 22, stiffness: 100 }}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-[#00CFFF]">{icon}</span>
        <h3 className="text-sm font-bold tracking-widest uppercase text-white/70">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

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
    isRunning,
    jitterMs,
    stabilityScore,
    speedSamples,
  } = useSpeedTest();

  const [planSpeed, setPlanSpeed]     = useState<string>("");
  const [copied, setCopied]           = useState(false);

  // Sound effects
  useEffect(() => {
    if (liveSpeed !== null && liveSpeed > 0) playTickSound();
  }, [liveSpeed]);

  useEffect(() => {
    if (phase === "complete") playSuccessSound();
  }, [phase]);

  const handleStartTest = () => {
    if (isRunning) return;
    playStartSound();
    startTest();
  };

  // ── Derived analysis (only when complete) ────────────────────────────────
  const isComplete = phase === "complete" && insight && downloadMbps !== null && uploadMbps !== null && pingMs !== null;

  const aiDiagnosis = isComplete
    ? analyzeConnection(pingMs!, downloadMbps!, uploadMbps!, stabilityScore, jitterMs)
    : null;

  const gamingRating = isComplete
    ? getGamingRating(pingMs!, jitterMs, stabilityScore)
    : null;

  const planComparison =
    isComplete && planSpeed && Number(planSpeed) > 0
      ? calculatePlanComparison(downloadMbps!, Number(planSpeed))
      : null;

  const handleShare = async () => {
    if (!isComplete) return;
    const text = generateShareText(
      downloadMbps!,
      uploadMbps!,
      pingMs!,
      insight!.rating,
      insight!.emoji,
      stabilityScore
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select the text
    }
  };

  const bgEffect = getBackgroundEffect(phase, insight?.rating);

  // ── Stability label ───────────────────────────────────────────────────────
  const stabilityLabel =
    stabilityScore >= 85 ? "Excellent" :
    stabilityScore >= 70 ? "Good" :
    stabilityScore >= 50 ? "Fair" : "Poor";

  const stabilityColor =
    stabilityScore >= 85 ? "#22c55e" :
    stabilityScore >= 70 ? "#00CFFF" :
    stabilityScore >= 50 ? "#eab308" : "#ef4444";

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 sm:p-8 relative overflow-hidden bg-[#0a0a0f]">

      {/* Dynamic background bloom */}
      <AnimatePresence>
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: bgEffect.opacity, backgroundColor: bgEffect.color }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="fixed inset-0 pointer-events-none blur-[140px]"
        />
      </AnimatePresence>

      <main className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 relative z-10 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
            <Zap className="w-4 h-4 text-[#00CFFF]" />
            <span className="text-xs font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00CFFF] to-[#7A00FF] uppercase">
              SPEEDIX
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Speedix{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00CFFF] to-[#7A00FF]">
              ⚡
            </span>
          </h1>
          <p className="text-white/40 text-sm tracking-wide">Measure the Real Internet</p>
        </motion.div>

        {/* ── Plan Speed Input (shown before test) ─────────────────────── */}
        <AnimatePresence>
          {phase === "idle" || phase === "error" ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3">
                <Wifi className="w-4 h-4 text-[#00CFFF] shrink-0" />
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={planSpeed}
                  onChange={e => setPlanSpeed(e.target.value)}
                  placeholder="Your ISP plan speed (Mbps) — optional"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                />
                {planSpeed && (
                  <span className="text-xs text-white/40 shrink-0">Mbps</span>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Speedometer ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex justify-center"
        >
          <Speedometer
            speed={
              liveSpeed ??
              (phase === "complete"
                ? Math.max(downloadMbps || 0, uploadMbps || 0)
                : null)
            }
          />
        </motion.div>

        {/* ── Status & Progress ─────────────────────────────────────────── */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex justify-between items-end px-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-base font-medium text-white/80 flex items-center gap-3"
              >
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-[#00CFFF] animate-pulse shadow-[0_0_8px_#00CFFF]" />
                )}
                {getStatusText(phase)}
              </motion.div>
            </AnimatePresence>
            <span className="text-xs font-mono text-white/30">{Math.round(progress)}%</span>
          </div>
          <ProgressBar progress={progress} isActive={isRunning} />

          {/* Retrying banner */}
          <AnimatePresence>
            {phase === "retrying" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-400 overflow-hidden"
              >
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                <p className="text-sm font-medium">Re-testing for accuracy… low speed detected</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 overflow-hidden"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Metric Cards ──────────────────────────────────────────────── */}
        <div className="w-full grid grid-cols-3 gap-3">
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

        {/* ── Live Chart ───────────────────────────────────────────────── */}
        <div className="w-full">
          <SpeedChart data={chartData} isVisible={isRunning || phase === "complete"} />
        </div>

        {/* ── Action Button ────────────────────────────────────────────── */}
        <div className="h-20 flex items-center justify-center gap-4">
          {isRunning ? (
            <button
              onClick={cancelTest}
              className="px-8 py-3 rounded-full font-bold text-base bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={handleStartTest}
                disabled={isRunning}
                className="px-10 py-4 rounded-full font-extrabold text-lg text-white bg-gradient-to-r from-[#00CFFF] to-[#7A00FF] shadow-[0_0_30px_rgba(0,207,255,0.35)] hover:shadow-[0_0_40px_rgba(122,0,255,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-3 disabled:opacity-50"
              >
                {phase === "complete" || phase === "error" ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Test Again
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Start Test
                  </>
                )}
              </button>

              {/* Share button — only after complete */}
              {isComplete && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleShare}
                  className="p-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 flex items-center gap-2"
                  title="Copy result to clipboard"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RESULTS SECTION — shown only after complete
        ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-5"
            >

              {/* ── 1. Speedix Result Summary ─────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(0,207,255,0.08) 0%, rgba(122,0,255,0.08) 100%)",
                  border: "1px solid rgba(0,207,255,0.2)",
                }}
              >
                <div className="p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-white">⚡ Speedix Result</h3>
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full border"
                      style={{
                        color: insight!.rating === "Excellent" ? "#22c55e" : insight!.rating === "Good" ? "#00CFFF" : "#f97316",
                        borderColor: insight!.rating === "Excellent" ? "rgba(34,197,94,0.3)" : insight!.rating === "Good" ? "rgba(0,207,255,0.3)" : "rgba(249,115,22,0.3)",
                        background: insight!.rating === "Excellent" ? "rgba(34,197,94,0.1)" : insight!.rating === "Good" ? "rgba(0,207,255,0.1)" : "rgba(249,115,22,0.1)",
                      }}
                    >
                      {insight!.emoji} {insight!.rating}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-mono font-bold text-[#00CFFF]">{formatSpeed(downloadMbps)}</div>
                      <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">Download Mbps</div>
                    </div>
                    <div>
                      <div className="text-3xl font-mono font-bold text-[#7A00FF]">{formatSpeed(uploadMbps)}</div>
                      <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">Upload Mbps</div>
                    </div>
                    <div>
                      <div className="text-3xl font-mono font-bold text-white">{formatPing(pingMs)}</div>
                      <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">Ping ms</div>
                    </div>
                  </div>

                  <p className="text-sm text-white/50 text-center leading-relaxed">{insight!.message}</p>

                  {/* Share copy feedback */}
                  <AnimatePresence>
                    {copied && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-xs text-green-400"
                      >
                        ✓ Result copied to clipboard
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* ── 2. AI Internet Doctor ─────────────────────────────── */}
              <SectionCard icon={<Stethoscope className="w-4 h-4" />} title="Speedix AI Analysis" delay={0.05}>
                <div className="flex flex-col gap-3">
                  {aiDiagnosis!.messages.map((msg, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-sm leading-relaxed rounded-xl px-4 py-3"
                      style={{
                        background:
                          msg.type === "success" ? "rgba(34,197,94,0.08)" :
                          msg.type === "warning" ? "rgba(251,191,36,0.08)" :
                          "rgba(0,207,255,0.06)",
                        borderLeft: `3px solid ${
                          msg.type === "success" ? "#22c55e" :
                          msg.type === "warning" ? "#fbbf24" :
                          "#00CFFF"
                        }`,
                      }}
                    >
                      <span className="leading-snug">{msg.text}</span>
                    </div>
                  ))}

                  {/* Extra stats row */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 px-4 py-3 flex flex-col gap-0.5">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Jitter</span>
                      <span className="text-xl font-mono font-bold text-white">{jitterMs.toFixed(1)} <span className="text-sm font-normal text-white/40">ms</span></span>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/8 px-4 py-3 flex flex-col gap-0.5">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Samples Analyzed</span>
                      <span className="text-xl font-mono font-bold text-white">{speedSamples.length}</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* ── 3. Stability Score ────────────────────────────────── */}
              <SectionCard icon={<BarChart3 className="w-4 h-4" />} title="Speed Stability Score" delay={0.10}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-end justify-between">
                    <span
                      className="text-5xl font-mono font-extrabold"
                      style={{ color: stabilityColor }}
                    >
                      {stabilityScore}
                      <span className="text-2xl text-white/40 font-normal">%</span>
                    </span>
                    <span
                      className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{
                        color: stabilityColor,
                        background: `${stabilityColor}18`,
                        border: `1px solid ${stabilityColor}40`,
                      }}
                    >
                      {stabilityLabel}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stabilityScore}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${stabilityColor}88, ${stabilityColor})` }}
                    />
                  </div>

                  <p className="text-sm text-white/40">
                    Measured from {speedSamples.length} speed sample{speedSamples.length !== 1 ? "s" : ""} taken during your download test.
                    {stabilityScore >= 85
                      ? " Your connection delivers consistent throughput."
                      : stabilityScore >= 70
                      ? " Minor fluctuations detected — generally stable."
                      : " Significant speed variation. May cause buffering or lag."}
                  </p>
                </div>
              </SectionCard>

              {/* ── 4. Gaming Mode ───────────────────────────────────── */}
              <SectionCard icon={<Gamepad2 className="w-4 h-4" />} title="Gaming Performance" delay={0.15}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{gamingRating!.emoji}</span>
                    <div>
                      <div
                        className="text-xl font-bold"
                        style={{ color: gamingRating!.color }}
                      >
                        {gamingRating!.label}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">
                        Based on ping, jitter, and connection stability
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {gamingRating!.details.map((detail, i) => {
                      const [label, value] = detail.split(": ");
                      return (
                        <div
                          key={i}
                          className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2.5 flex flex-col gap-0.5"
                        >
                          <span className="text-xs text-white/40">{label}</span>
                          <span className="text-base font-mono font-bold text-white">{value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Gaming rating colour guide */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-white/30">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Good: ping ≤50ms, jitter ≤15ms
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      Playable: ping ≤100ms
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Poor: high lag or jitter
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* ── 5. Plan vs Actual ─────────────────────────────────── */}
              {planComparison ? (
                <SectionCard icon={<Gauge className="w-4 h-4" />} title="Plan vs Actual Speed" delay={0.20}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-5xl font-mono font-extrabold text-white">
                          {planComparison.percentage}
                          <span className="text-2xl text-white/40 font-normal">%</span>
                        </div>
                        <div className="text-sm text-white/40 mt-1">of your {planSpeed} Mbps plan</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white/40">Actual</div>
                        <div className="text-2xl font-mono font-bold text-[#00CFFF]">{formatSpeed(downloadMbps)} <span className="text-sm text-white/40">Mbps</span></div>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(planComparison.percentage, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: planComparison.isUnderperforming
                            ? "linear-gradient(90deg, #f97316, #ef4444)"
                            : "linear-gradient(90deg, #00CFFF, #22c55e)",
                        }}
                      />
                    </div>

                    <p className="text-sm text-white/50 leading-relaxed">{planComparison.message}</p>

                    {planComparison.warning && (
                      <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                        <span>{planComparison.warning}</span>
                      </div>
                    )}
                  </div>
                </SectionCard>
              ) : (phase === "complete") && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.20 }}
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 flex items-center gap-3"
                >
                  <Gauge className="w-4 h-4 text-white/30 shrink-0" />
                  <p className="text-sm text-white/30">
                    Enter your ISP plan speed above before running the test to see Plan vs Actual comparison.
                  </p>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-xs text-white/20 text-center pb-4">
          Speedix — Smart Internet Analysis Platform
        </p>

      </main>
    </div>
  );
}
