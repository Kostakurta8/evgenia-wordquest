"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MascotState } from "@/lib/types";

/**
 * Искра — an original glowing firefly guide (no Tolkien IP).
 * Pure SVG + framer-motion; reduced-motion users get a static glow.
 */
export default function Mascot({
  state = "idle",
  size = 72,
  className,
}: {
  state?: MascotState;
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  const float = reduced
    ? {}
    : state === "celebrate"
      ? { y: [0, -14, 0], rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }
      : state === "happy"
        ? { y: [0, -8, 0], scale: [1, 1.06, 1] }
        : state === "encourage"
          ? { rotate: [0, -4, 4, 0] }
          : { y: [0, -5, 0] };

  const dur = state === "celebrate" ? 0.9 : state === "happy" ? 1.4 : 2.6;

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={float}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* glow */}
        <defs>
          <radialGradient id="iskra-glow" cx="50%" cy="62%" r="50%">
            <stop offset="0%" stopColor="#FFE9A3" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#FFD34D" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFD34D" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="60" r="38" fill="url(#iskra-glow)" />
        {/* wings */}
        <g opacity="0.75">
          <ellipse cx="33" cy="42" rx="16" ry="9" fill="#BFE8F5" transform="rotate(-28 33 42)" />
          <ellipse cx="67" cy="42" rx="16" ry="9" fill="#BFE8F5" transform="rotate(28 67 42)" />
        </g>
        {/* body */}
        <ellipse cx="50" cy="58" rx="15" ry="19" fill="#3A2E22" />
        {/* lantern tail */}
        <ellipse cx="50" cy="69" rx="11" ry="9" fill="#FFCB3D" />
        <ellipse cx="50" cy="69" rx="6.5" ry="5.5" fill="#FFF1B8" />
        {/* head */}
        <circle cx="50" cy="38" r="11" fill="#4A3A2A" />
        {/* eyes — state-dependent */}
        {state === "celebrate" || state === "happy" ? (
          <g stroke="#1c140d" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M43 37 q3 -4 6 0" />
            <path d="M51 37 q3 -4 6 0" />
          </g>
        ) : (
          <g fill="#1c140d">
            <circle cx="46" cy="37" r="2.6" />
            <circle cx="54" cy="37" r="2.6" />
          </g>
        )}
        {/* smile */}
        <path
          d={state === "encourage" ? "M45 44 q5 3 10 0" : "M45 43 q5 5 10 0"}
          stroke="#1c140d"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* antennae */}
        <g stroke="#4A3A2A" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M44 29 q-4 -7 -9 -8" />
          <path d="M56 29 q4 -7 9 -8" />
        </g>
        <circle cx="35" cy="20" r="2.5" fill="#FFCB3D" />
        <circle cx="65" cy="20" r="2.5" fill="#FFCB3D" />
        {/* sparkles when celebrating */}
        {state === "celebrate" && (
          <g fill="#FFD34D">
            <circle cx="18" cy="30" r="3" />
            <circle cx="84" cy="26" r="2.4" />
            <circle cx="80" cy="74" r="3" />
            <circle cx="16" cy="70" r="2.2" />
          </g>
        )}
      </svg>
    </motion.div>
  );
}
