import { AdminChatUI } from "./AdminChatUI";
import { StudentChatUI } from "./StudentChatUI";
import { SuperAdminChatUI } from "./SuperAdminChatUI";
import { TeacherChatUI } from "./TeacherChatUI";
import { useVidyaChat } from "./useVidyaChat";
import type { AIChatContext, VidyaChatRole } from "./types";

interface VidyaChatContainerProps {
  userId: string;
  role: VidyaChatRole;
  context?: AIChatContext;
  className?: string;
}

export default function VidyaChatContainer({
  userId,
  role,
  context,
  className,
}: VidyaChatContainerProps) {
  const model = useVidyaChat({ userId, role, context });

  if (role === "super_admin") return <SuperAdminChatUI model={model} className={className} />;
  if (role === "admin") return <AdminChatUI model={model} className={className} />;
  if (role === "teacher") return <TeacherChatUI model={model} className={className} />;
  if (role === "student") return <StudentChatUI model={model} className={className} />;

  return <StudentChatUI model={model} className={className} />;
}
