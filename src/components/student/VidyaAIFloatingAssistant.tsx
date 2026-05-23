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
  /** Dashboard corner: orange style, avatar on top, uses onClick instead of routing away */
  role?: VidyaAssistantRole;
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

  const isDashboardCorner = Boolean(onClick);

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
      <div
        className="fixed bottom-4 right-4 z-40 flex max-w-[min(18rem,calc(100vw-1.5rem))] flex-row items-end justify-end gap-2 pointer-events-none sm:bottom-6 sm:right-6"
      >
        <div className="pointer-events-none relative mb-1 max-w-[200px] animate-fade-in">
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

        <button
          type="button"
          onClick={handleClick}
          className="pointer-events-auto h-12 w-12 shrink-0 rounded-full border-2 border-orange-300 bg-white p-0.5 shadow-lg transition-all duration-300 hover:scale-110 hover:border-orange-400 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 sm:h-14 sm:w-14"
          aria-label="Open Vidya AI"
        >
          <img
            src="/Vidya-ai.jpg"
            alt="Vidya AI - Click to chat"
            draggable={false}
            className="h-full w-full rounded-full object-cover object-top"
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-3 z-30 flex max-w-[min(16rem,calc(100vw-1.25rem))] flex-col items-end gap-1.5 sm:bottom-3 sm:m-4 lg:m-6 sm:right-5"
      style={{ pointerEvents: "none" }}
    >
      <div className="pointer-events-auto animate-fade-in">
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

      <button
        type="button"
        className="pointer-events-auto rounded-full p-0.5 shadow-lg ring-2 ring-white transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        onClick={handleClick}
        aria-label="Open Vidya AI tutor"
      >
        <img
          src="/Vidya-ai.jpg"
          alt="Vidya AI - Click to chat"
          draggable={false}
          className="h-12 w-12 rounded-full object-cover object-top sm:h-14 sm:w-14"
        />
      </button>
    </div>
  );
}
