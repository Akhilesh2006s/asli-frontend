import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const DEFAULT_MESSAGES = [
  "Need some help with your homework?",
  "Need some help with maths?",
  "Need some help with physics?",
  "Need some help with chemistry?",
];

const ROLE_MESSAGES = {
  admin: [
    "Need help managing your school?",
    "Ask me about student management",
    "Need help with class assignments?",
    "Ask me about teacher management?",
  ],
  teacher: [
    "Ask me about your students",
    "Need help with class planning?",
    "Ask me about assessments?",
    "Need help tracking progress?",
  ],
  student: DEFAULT_MESSAGES,
} as const;

export type VidyaAssistantRole = keyof typeof ROLE_MESSAGES;

interface VidyaAIFloatingAssistantProps {
  currentSubject?: string;
  postExamContext?: string;
  /** Dashboard corner: orange style for admin, teacher, or student */
  role?: VidyaAssistantRole;
  /** Override default navigation (admin/teacher tab switch) */
  onClick?: () => void;
}

export default function VidyaAIFloatingAssistant({
  currentSubject,
  postExamContext,
  role,
  onClick,
}: VidyaAIFloatingAssistantProps) {
  const [currentPage, setLocation] = useLocation();
  const [currentMessage, setCurrentMessage] = useState(0);

  const baseMessages = role
    ? [...ROLE_MESSAGES[role]]
    : currentSubject
      ? [
          `Need help with ${currentSubject}?`,
          `Ask me anything about ${currentSubject}`,
          `I can explain ${currentSubject} concepts`,
          `Practice ${currentSubject} with me`,
        ]
      : DEFAULT_MESSAGES;
  const messages = postExamContext ? [postExamContext, ...baseMessages] : baseMessages;

  const isDashboardCorner = Boolean(role);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (role === "student") {
      setLocation("/ai-tutor");
      return;
    }
    const inferredSubject = currentSubject || (currentPage.includes("math") ? "Maths" : "");
    const dest = postExamContext
      ? `/ai-tutor?prompt=${encodeURIComponent(postExamContext)}`
      : inferredSubject
        ? `/ai-tutor?subject=${encodeURIComponent(inferredSubject)}`
        : "/ai-tutor";
    setLocation(dest);
  };

  if (isDashboardCorner) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="fixed bottom-4 right-4 z-40 flex max-w-[min(18rem,calc(100vw-1.5rem))] flex-row items-end justify-end gap-2 text-left transition-transform hover:scale-[1.02] active:scale-[0.98] sm:bottom-6 sm:right-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
        aria-label="Open Vidya AI tools"
      >
        <div className="relative mb-1 max-w-[200px] animate-fade-in pointer-events-none">
          <div className="rounded-lg border border-orange-200 bg-white p-2.5 shadow-lg">
            <p className="text-xs font-medium leading-snug text-gray-800">
              {messages[currentMessage]}
            </p>
          </div>
          <div className="absolute -right-1 bottom-3 translate-x-full">
            <div className="h-0 w-0 border-y-[6px] border-l-[6px] border-y-transparent border-l-orange-200" />
            <div className="absolute left-0 top-0 -ml-px h-0 w-0 border-y-[6px] border-l-[6px] border-y-transparent border-l-white" />
          </div>
        </div>

        <span className="h-12 w-12 shrink-0 rounded-full border-2 border-orange-300 bg-white p-0.5 shadow-lg sm:h-14 sm:w-14">
          <img
            src="/Vidya-ai.jpg"
            alt=""
            draggable={false}
            className="h-full w-full rounded-full object-cover object-top"
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-4 right-3 z-30 flex max-w-[min(16rem,calc(100vw-1.25rem))] flex-col items-end gap-1.5 text-left transition-transform hover:scale-[1.02] active:scale-[0.98] sm:bottom-3 sm:m-4 lg:m-6 sm:right-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
      aria-label="Open Vidya AI tools"
    >
      <div className="animate-fade-in pointer-events-none">
        <div className="relative rounded-lg border border-sky-200 bg-white/95 p-2.5 shadow-md backdrop-blur-sm">
          <p className="max-w-[14rem] text-xs font-medium leading-snug text-gray-800 sm:text-sm">
            {messages[currentMessage]}
          </p>
          <div className="absolute bottom-0 right-6 translate-y-full">
            <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-sky-200" />
            <div
              className="absolute left-0 top-0 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"
              style={{ marginTop: "-1px" }}
            />
          </div>
        </div>
      </div>

      <span className="rounded-full p-0.5 shadow-lg ring-2 ring-white">
        <img
          src="/Vidya-ai.jpg"
          alt=""
          draggable={false}
          className="h-12 w-12 rounded-full object-cover object-top sm:h-14 sm:w-14"
        />
      </span>
    </button>
  );
}
