/** Whether Vidya AI is enabled for the current user (student/teacher). Defaults to true when unset. */
export function isVidyaEnabledForUser(user: { vidyaEnabled?: boolean } | null | undefined): boolean {
  return user?.vidyaEnabled !== false;
}
