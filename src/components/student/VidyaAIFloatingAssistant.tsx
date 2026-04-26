import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const MESSAGES = [
  "Need some help with your homework?",
  "Need some help with maths?",
  "Need some help with physics?",
  "Need some help with chemistry?",
];

export default function VidyaAIFloatingAssistant() {
  const [, setLocation] = useLocation();
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-2 sm:bottom-8 sm:right-4 z-30 flex flex-col items-end">
      <div className="relative mb-2 animate-fade-in">
        <div className="bg-white rounded-lg shadow-xl p-3 border-2 border-blue-200 relative">
          <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
            {MESSAGES[currentMessage]}
          </p>
          <div className="absolute bottom-0 right-8 transform translate-y-full">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-200" />
            <div
              className="absolute top-0 left-0 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"
              style={{ marginTop: "-1px" }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="cursor-pointer"
        onClick={() => setLocation("/ai-tutor")}
        aria-label="Open Vidya AI tutor"
      >
        <img
          src="/Vidya-ai.jpg"
          alt="Vidya AI - Click to chat"
          draggable={false}
          className="w-32 h-auto rounded-xl shadow-xl opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300"
        />
      </button>
    </div>
  );
}
