import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Book,
  PenTool,
  Calculator,
  Ruler,
  GraduationCap,
  NotebookPen,
  Pencil,
  Highlighter,
  Lightbulb,
  Award,
  Star,
} from "lucide-react";

/** Soft school-bag glyph for the light ambient décor. */
const BackpackIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M6 8h12M6 8c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v10c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4V8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 8V6c0-1.1.9-2 2-2s2 .9 2 2v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 12h8M8 16h8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type SchoolItem = {
  icon: React.ComponentType<{ className?: string }>;
  size: number;
  color: string;
  delay: number;
  duration: number;
  x: number;
  y: number;
  rotation: number;
};

const ICON_POOL = [
  { icon: BookOpen, color: "text-sky-400/35", size: 34 },
  { icon: Book, color: "text-orange-400/30", size: 30 },
  { icon: PenTool, color: "text-teal-500/30", size: 28 },
  { icon: Pencil, color: "text-amber-500/30", size: 26 },
  { icon: Highlighter, color: "text-rose-400/25", size: 28 },
  { icon: Calculator, color: "text-indigo-400/28", size: 30 },
  { icon: Ruler, color: "text-sky-500/28", size: 28 },
  { icon: GraduationCap, color: "text-teal-500/30", size: 34 },
  { icon: NotebookPen, color: "text-orange-400/28", size: 30 },
  { icon: Lightbulb, color: "text-amber-400/30", size: 28 },
  { icon: Award, color: "text-sky-500/25", size: 30 },
  { icon: Star, color: "text-orange-300/30", size: 24 },
  { icon: BackpackIcon, color: "text-teal-500/30", size: 34 },
] as const;

/** Deterministic layout so icons don't jump on every remount. */
function buildSchoolItems(count = 22): SchoolItem[] {
  const items: SchoolItem[] = [];
  for (let i = 0; i < count; i++) {
    const pick = ICON_POOL[i % ICON_POOL.length];
    const col = i % 5;
    const row = Math.floor(i / 5);
    items.push({
      icon: pick.icon,
      size: pick.size + ((i * 3) % 8),
      color: pick.color,
      delay: (i % 7) * 0.35,
      duration: 14 + (i % 6) * 2.2,
      x: 6 + col * 20 + ((i * 7) % 9),
      y: 8 + row * 18 + ((i * 5) % 10),
      rotation: (i * 37) % 360,
    });
  }
  return items;
}

/** Light ambient school décor — books, bags, pens (non-interactive). */
export const InteractiveBackground = () => {
  const items = useMemo(() => buildSchoolItems(22), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Soft light wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_15%_-10%,rgba(14,165,233,0.10),transparent_55%),radial-gradient(ellipse_70%_45%_at_95%_5%,rgba(249,115,22,0.08),transparent_50%),radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(20,184,166,0.08),transparent_55%)]" />

      {items.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <motion.div
            key={index}
            className={`absolute ${item.color}`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.size}px`,
              height: `${item.size}px`,
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: [0.28, 0.48, 0.28],
              y: [0, -18, 0],
              x: [0, Math.sin(index + 1) * 10, 0],
              rotate: [item.rotation, item.rotation + 12, item.rotation],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <IconComponent className="h-full w-full" />
          </motion.div>
        );
      })}

      {/* Very light notebook grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14, 165, 233, 0.45) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.45) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
};

export const FloatingParticles = () => {
  const dots = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${(i * 17 + 9) % 100}%`,
        top: `${(i * 23 + 11) % 100}%`,
        duration: 11 + (i % 5) * 2,
        delay: (i % 6) * 0.4,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-400/35"
          style={{ left: dot.left, top: dot.top }}
          animate={{
            y: [0, -70, 0],
            opacity: [0.2, 0.55, 0.2],
            scale: [0.7, 1.15, 0.7],
          }}
          transition={{
            duration: dot.duration,
            delay: dot.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
