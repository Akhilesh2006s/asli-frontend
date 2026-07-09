/** Print layout for all AI tool viewers (browser Print → Save as PDF). */
export function AiToolV2PrintStyles() {
  return (
    <style>{`
      @media print {
        body * {
          visibility: hidden;
        }
        [data-ai-tool-export],
        [data-ai-tool-export] * {
          visibility: visible;
        }
        [data-ai-tool-export] {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: #fff !important;
          color: #111 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        [data-ai-chrome],
        [data-ai-focus-hide],
        [data-ai-insight-tail],
        .print\\:hidden {
          display: none !important;
        }
        [data-ai-section-id] {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 1rem;
          box-shadow: none !important;
          border: 1px solid #e2e8f0 !important;
        }
        [data-ai-tool-export] header {
          color: #111 !important;
          background: #f8fafc !important;
        }
      }
      [data-ai-tool-export][data-focus-mode="true"] [data-ai-focus-hide] {
        display: none !important;
      }
      [data-ai-tool-export][data-focus-mode="true"] {
        max-width: 48rem;
        margin-left: auto;
        margin-right: auto;
      }
      [data-ai-tool-export][data-focus-mode="true"] [data-ai-section-body] {
        font-size: 1.02rem;
        line-height: 1.65;
      }
      [data-ai-tool-export][data-focus-mode="true"] [data-ai-section-id] {
        scroll-margin-top: 5.5rem;
      }
      [data-ai-section-id] {
        scroll-margin-top: 4.5rem;
      }
    `}</style>
  );
}
