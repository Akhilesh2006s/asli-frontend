import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type AiToolViewerAudience = 'teacher' | 'student';

export type AiToolSectionAnchor = {
  id: string;
  title: string;
  num: string;
};

type AiToolV2ViewerContextValue = {
  audience: AiToolViewerAudience;
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  toggleFocusMode: () => void;
  sections: AiToolSectionAnchor[];
  setSections: (sections: AiToolSectionAnchor[]) => void;
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
};

const AiToolV2ViewerContext = createContext<AiToolV2ViewerContextValue | null>(null);

export function AiToolV2ViewerProvider({
  audience = 'teacher',
  children,
}: {
  audience?: AiToolViewerAudience;
  children: ReactNode;
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [sections, setSections] = useState<AiToolSectionAnchor[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      audience,
      focusMode,
      setFocusMode,
      toggleFocusMode: () => setFocusMode((v) => !v),
      sections,
      setSections,
      activeSectionId,
      setActiveSectionId,
    }),
    [audience, focusMode, sections, activeSectionId],
  );

  return <AiToolV2ViewerContext.Provider value={value}>{children}</AiToolV2ViewerContext.Provider>;
}

export function useAiToolV2Viewer() {
  return useContext(AiToolV2ViewerContext);
}
