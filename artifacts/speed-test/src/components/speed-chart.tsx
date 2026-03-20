import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";
import { ChartDataPoint } from "@/hooks/use-speed-test";
import { motion } from "framer-motion";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

export function SpeedChart({ data, isVisible }: { data: ChartDataPoint[], isVisible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(6, 182, 212, 0.4)"); // primary
    gradient.addColorStop(1, "rgba(6, 182, 212, 0.0)");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Speed (Mbps)",
            data: [],
            borderColor: "hsl(195, 100%, 50%)",
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
          x: {
            type: "category",
            display: false,
            grid: { display: false },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              display: false,
            },
            border: { display: false }
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    
    chartRef.current.data.labels = data.map(d => d.time.toFixed(0));
    chartRef.current.data.datasets[0].data = data.map(d => d.speed);
    chartRef.current.update();
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: isVisible ? 1 : 0, height: isVisible ? 200 : 0 }}
      className="w-full mt-8 overflow-hidden"
    >
      <div className="relative w-full h-[200px] glass-panel rounded-2xl p-4">
        <canvas ref={canvasRef} />
      </div>
    </motion.div>
  );
}