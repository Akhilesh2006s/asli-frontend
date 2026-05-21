import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const MESSAGES = [
  "Need some help with your homework?",
  "Need some help with maths?",
  "Need some help with physics?",
  "Need some help with chemistry?",
];

/** Compact corner assistant: small circular avatar + narrow tooltip so lesson actions stay tappable. */
interface VidyaAIFloatingAssistantProps {
  currentSubject?: string;
  postExamContext?: string;
}

export default function VidyaAIFloatingAssistant({
  currentSubject,
  postExamContext,
}: VidyaAIFloatingAssistantProps) {
  const [currentPage, setLocation] = useLocation();
  const [currentMessage, setCurrentMessage] = useState(0);
  const baseMessages = currentSubject
    ? [
        `Need help with ${currentSubject}?`,
        `Ask me anything about ${currentSubject}`,
        `I can explain ${currentSubject} concepts`,
        `Practice ${currentSubject} with me`,
      ]
    : MESSAGES;
  const messages = postExamContext ? [postExamContext, ...baseMessages] : baseMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

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
        onClick={() => {
          const inferredSubject = currentSubject || (currentPage.includes("math") ? "Maths" : "");
          const dest = postExamContext
            ? `/ai-tutor?prompt=${encodeURIComponent(postExamContext)}`
            : inferredSubject
              ? `/ai-tutor?subject=${encodeURIComponent(inferredSubject)}`
              : "/ai-tutor";
          setLocation(dest);
        }}
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
