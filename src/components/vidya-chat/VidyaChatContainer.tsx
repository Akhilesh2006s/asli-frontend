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

  // Chat stays sentence-case (global Title Case CSS must not rewrite messages).
  let chat;
  if (role === "super_admin") chat = <SuperAdminChatUI model={model} className={className} />;
  else if (role === "admin") chat = <AdminChatUI model={model} className={className} />;
  else if (role === "teacher") chat = <TeacherChatUI model={model} className={className} />;
  else chat = <StudentChatUI model={model} className={className} />;

  return (
    <div data-no-title-case className="flex h-full min-h-0 flex-1 flex-col normal-case">
      {chat}
    </div>
  );
}
