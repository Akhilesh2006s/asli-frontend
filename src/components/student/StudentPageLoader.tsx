import Navigation from "@/components/navigation";
import { Loader2 } from "lucide-react";

interface StudentPageLoaderProps {
  message?: string;
  showNavigation?: boolean;
}

export default function StudentPageLoader({
  message = "Loading...",
  showNavigation = true,
}: StudentPageLoaderProps) {
  return (
    <>
      {showNavigation && <Navigation />}
      <div
        className="min-h-[calc(100vh-5rem)] bg-sky-50 flex flex-col items-center justify-center pt-20 sm:pt-24 px-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="w-10 h-10 text-sky-500 animate-spin mb-4"
          aria-hidden
        />
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      </div>
    </>
  );
}
