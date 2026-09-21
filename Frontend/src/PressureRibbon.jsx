import React, { useMemo, useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence, press } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Palmtree, Pill, Cake, Award, ShieldCheck, User, Search,
} from "lucide-react";

export default function PressureRibbon({ pressures, totalDays, DAY_W }) {

  const gradId = useId(); 
  const blurId = useId(); 

  function smooth(arr, radius = 2) {
    return arr.map((_, i) => {
      let sum = 0,
        weight = 0;
      for (let j = i - radius; j <= i + radius; j++) {
        if (j < 0 || j >= arr.length) continue;
        const w = 1 / (Math.abs(j - i) + 1);
        sum += arr[j] * w;
        weight += w;
      }
      return sum / weight;
    });
  }

  // Build SVG path for the pressure ribbon
  function buildRibbonPath(pressures, height = 40) {
    const n = pressures.length;
    const pts = pressures.map((p, i) => ({
      x: i * DAY_W + DAY_W / 2,
      y: height - p * (height - 4) - 2,
    }));
    // catmull-rom → cubic bezier
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const W = totalDays * DAY_W;
  const H = 52;
  const smoothed = smooth(pressures);
  const path = buildRibbonPath(smoothed, H - 12);

  // area fill path (closed)
  const areaPath =
    path +
    ` L ${(totalDays - 1) * DAY_W + DAY_W / 2} ${H} L ${DAY_W / 2} ${H} Z`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
      id="pressureRibbon"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0.02" />
        </linearGradient>
        <filter id={blurId}>
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      {/* Soft filled area */}
      <path d={areaPath} fill={`url(#${gradId})`} filter={`url(#${blurId})`} />
      {/* Pressure line */}
      <motion.path
        d={path}
        fill="none"
        stroke="#F97316"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
      {/* Dots on peaks */}
      {smoothed.map((p, i) => {
        if (p < 0.65) return null;
        return (
          <motion.circle
            key={i}
            cx={i * DAY_W + DAY_W / 2}
            cy={H - 12 - p * (H - 16) - 2}
            r="3"
            fill="#EF4444"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2 + i * 0.02 }}
          />
        );
      })}
    </svg>
  );
}