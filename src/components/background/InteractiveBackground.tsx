import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { 
  BookOpen, 
  BookIcon, 
  PenTool, 
  Calculator, 
  Ruler, 
  GraduationCap, 
  Notebook, 
  Clipboard, 
  FileText, 
  Lightbulb, 
  Award, 
  StarIcon 
} from "lucide-react";

// Custom Backpack Icon Component
const BackpackIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
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
    />
  </svg>
);

// School Item Types
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

// Interactive Background with School Items
export const InteractiveBackground = () => {
  const [items, setItems] = useState<SchoolItem[]>([]);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 200 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const schoolIcons = [
      { icon: BookOpen, color: 'text-blue-600/60', size: 36 },
      { icon: BookIcon, color: 'text-purple-600/60', size: 32 },
      { icon: PenTool, color: 'text-yellow-600/60', size: 34 },
      { icon: Calculator, color: 'text-green-600/60', size: 32 },
      { icon: Ruler, color: 'text-pink-600/60', size: 30 },
      { icon: GraduationCap, color: 'text-cyan-600/60', size: 38 },
      { icon: Notebook, color: 'text-indigo-600/60', size: 34 },
      { icon: Clipboard, color: 'text-orange-600/60', size: 32 },
      { icon: FileText, color: 'text-teal-600/60', size: 30 },
      { icon: Lightbulb, color: 'text-yellow-600/60', size: 36 },
      { icon: Award, color: 'text-amber-600/60', size: 34 },
      { icon: StarIcon, color: 'text-blue-500/60', size: 28 },
      { icon: BackpackIcon, color: 'text-violet-600/60', size: 36 },
    ];

    const generateItems = () => {
      const count = 25; // More items for dashboard
      const newItems: SchoolItem[] = [];
      
      for (let i = 0; i < count; i++) {
        const randomIcon = schoolIcons[Math.floor(Math.random() * schoolIcons.length)];
        newItems.push({
          icon: randomIcon.icon,
          size: randomIcon.size,
          color: randomIcon.color,
          delay: Math.random() * 2,
          duration: 15 + Math.random() * 10,
          x: Math.random() * 100,
          y: Math.random() * 100,
          rotation: Math.random() * 360,
        });
      }
      setItems(newItems);
    };

    generateItems();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {items.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <motion.div
            key={index}
            className={`absolute ${item.color} transition-colors duration-300 cursor-default`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.size}px`,
              height: `${item.size}px`,
              pointerEvents: 'auto',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.5, 0.75, 0.5],
              y: [0, -40, 0],
              x: [0, Math.sin(index) * 25, 0],
              rotate: [item.rotation, item.rotation + 360],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            whileHover={{
              scale: 1.5,
              opacity: 0.9,
              rotate: item.rotation + 15,
              transition: { duration: 0.3 },
            }}
          >
            <IconComponent className="w-full h-full drop-shadow-lg" />
          </motion.div>
        );
      })}
      
      {/* Parallax effect based on mouse movement */}
      <motion.div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${x}px ${y}px, rgba(139, 92, 246, 0.4) 0%, transparent 50%)`,
        }}
      />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};

// Floating Particles Effect
export const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2.5 h-2.5 bg-purple-500/50 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -120, 0],
            x: [0, Math.sin(i) * 60, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [0.6, 1.2, 0.6],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      
      {/* Glowing orbs for depth */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            width: `${250 + i * 120}px`,
            height: `${250 + i * 120}px`,
            left: `${20 + i * 30}%`,
            top: `${30 + i * 20}%`,
            background: `radial-gradient(circle, rgba(139, 92, 246, ${0.2 - i * 0.04}) 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 15 + i * 5,
            delay: i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};



