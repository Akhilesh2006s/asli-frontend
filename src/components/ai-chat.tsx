import VidyaChatContainer from "@/components/vidya-chat/VidyaChatContainer";
import type { AIChatPromptVariant, AIChatProps, VidyaChatRole } from "@/components/vidya-chat/types";

export type { AIChatPromptVariant, AIChatProps } from "@/components/vidya-chat/types";

function resolvePromptVariant(
  promptVariant: AIChatPromptVariant | undefined,
  currentSubject: string | undefined
): AIChatPromptVariant {
  if (promptVariant) return promptVariant;
  if (currentSubject?.trim().toLowerCase() === "administration") return "admin";
  return "student";
}

function mapPromptVariantToRole(variant: AIChatPromptVariant): VidyaChatRole {
  if (variant === "super-admin") return "super_admin";
  return variant;
}

export default function AIChat({ userId, context, className, promptVariant }: AIChatProps) {
  const resolvedVariant = resolvePromptVariant(promptVariant, context?.currentSubject);
  const role = mapPromptVariantToRole(resolvedVariant);

  return <VidyaChatContainer userId={userId} role={role} context={context} className={className} />;
}
