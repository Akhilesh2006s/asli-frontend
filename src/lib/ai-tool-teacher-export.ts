import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { resolveWorksheetFromPayload } from '@/lib/parse-worksheet-mcq';
import { resolveHomeworkFromPayload } from '@/lib/parse-homework-creator';
import { resolveExamPaperFromPayload } from '@/lib/parse-exam-question-paper';
import { getFlashcardsFromContent } from '@/components/flashcard-viewer';

export const TEACHER_DOWNLOAD_TOOL_IDS = [
  'worksheet-mcq-generator',
  'exam-question-paper-generator',
  'homework-creator',
  'flashcard-generator',
] as const;

export type TeacherDownloadToolId = (typeof TEACHER_DOWNLOAD_TOOL_IDS)[number];

export type AiToolPdfMeta = {
  toolName?: string;
  board?: string;
  classLabel?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
};

const PDF_MARGIN: [number, number, number, number] = [12, 12, 12, 12];

export function isTeacherDownloadTool(toolType: string): toolType is TeacherDownloadToolId {
  return (TEACHER_DOWNLOAD_TOOL_IDS as readonly string[]).includes(toolType);
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(',');
}

function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  margin: [number, number, number, number],
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const innerW = pageW - margin[1] - margin[3];
  const innerH = pageH - margin[0] - margin[2];
  const innerRatio = innerH / innerW;
  const pxFullHeight = canvas.height;
  const pxPageHeight = Math.floor(canvas.width * innerRatio);
  const nPages = Math.max(1, Math.ceil(pxFullHeight / pxPageHeight));
  const pageCanvas = document.createElement('canvas');
  const pageCtx = pageCanvas.getContext('2d');
  if (!pageCtx) return;
  pageCanvas.width = canvas.width;

  for (let page = 0; page < nPages; page++) {
    if (page === nPages - 1 && pxFullHeight % pxPageHeight !== 0) {
      pageCanvas.height = pxFullHeight % pxPageHeight;
    } else {
      pageCanvas.height = pxPageHeight;
    }
    const w = pageCanvas.width;
    const h = pageCanvas.height;
    pageCtx.fillStyle = 'white';
    pageCtx.fillRect(0, 0, w, h);
    pageCtx.drawImage(canvas, 0, page * pxPageHeight, w, h, 0, 0, w, h);
    const pageHeightMm = (pageCanvas.height * innerW) / pageCanvas.width;
    if (page > 0) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.98), 'JPEG', margin[1], margin[0], innerW, pageHeightMm);
  }
}

function buildPdfCover(meta?: AiToolPdfMeta): string {
  const rows = [
    ['Class', meta?.classLabel],
    ['Subject', meta?.subject],
    ['Topic', meta?.topic],
    ['Subtopic', meta?.subtopic],
    ['Board', meta?.board],
  ].filter(([, v]) => String(v || '').trim());

  const metaGrid = rows
    .map(
      ([label, value]) => `
      <div style="border:1px solid #e0e7ff;border-radius:10px;padding:10px 12px;background:#fff;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6366f1;">${label}</p>
        <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#0f172a;">${value}</p>
      </div>`,
    )
    .join('');

  return `
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#0ea5e9 100%);color:#fff;border-radius:18px;padding:22px 24px;margin-bottom:18px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;opacity:0.9;">ASLILEARN · AI V2</p>
      <h1 style="margin:0;font-size:24px;font-weight:800;line-height:1.2;">${meta?.toolName || 'Generated Content'}</h1>
      <p style="margin:10px 0 0;font-size:12px;opacity:0.92;">Premium export · Curriculum-aligned · ${new Date().toLocaleDateString()}</p>
    </div>
    ${
      metaGrid
        ? `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px;">${metaGrid}</div>`
        : ''
    }
  `;
}

export function buildTeacherToolCsv(
  toolType: string,
  content: string,
  rawContent: unknown,
): string | null {
  if (toolType === 'worksheet-mcq-generator') {
    const { worksheet } = resolveWorksheetFromPayload(content, rawContent);
    if (!worksheet) return null;
    const rows: string[] = [
      csvRow(['Section', 'Question Number', 'Type', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Marks']),
    ];
    for (const section of worksheet.sections) {
      section.questions.forEach((q, index) => {
        rows.push(
          csvRow([
            section.label,
            q.questionNumber ?? index + 1,
            q.type || '',
            q.question,
            q.options[0]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.options[1]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.options[2]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.options[3]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.answer,
            q.marks ?? '',
          ]),
        );
      });
    }
    return rows.join('\n');
  }

  if (toolType === 'homework-creator') {
    const { homework } = resolveHomeworkFromPayload(content, rawContent);
    if (!homework) return null;
    const rows: string[] = [csvRow(['Type', 'Question / Task', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'])];
    homework.practiceQuestions.forEach((q, index) => {
      rows.push(
        csvRow([
          q.type || 'Practice',
          q.question || `Question ${index + 1}`,
          q.options[0] || '',
          q.options[1] || '',
          q.options[2] || '',
          q.options[3] || '',
          q.answer,
        ]),
      );
    });
    homework.applicationTasks.forEach((task, index) => {
      rows.push(csvRow(['Application', task || `Task ${index + 1}`, '', '', '', '', '']));
    });
    return rows.join('\n');
  }

  if (toolType === 'exam-question-paper-generator') {
    const { paper } = resolveExamPaperFromPayload(content, rawContent);
    if (!paper) return null;
    const rows: string[] = [
      csvRow([
        'Question Number',
        'Section',
        'Question',
        'Option A',
        'Option B',
        'Option C',
        'Option D',
        'Answer',
        'Explanation',
        'Marks',
      ]),
    ];
    for (const section of paper.sections) {
      section.questions.forEach((q, index) => {
        rows.push(
          csvRow([
            q.questionNumber || index + 1,
            section.title,
            q.question,
            q.options[0]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.options[1]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.options[2]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.options[3]?.replace(/^[A-D]\)\s*/i, '') || '',
            q.answer,
            q.explanation || '',
            q.marks ?? '',
          ]),
        );
      });
    }
    return rows.join('\n');
  }

  if (toolType === 'flashcard-generator') {
    const cards = getFlashcardsFromContent(content);
    if (!cards.length) return null;
    const rows: string[] = [csvRow(['Front', 'Back', 'Type', 'Category', 'Memory Hook'])];
    for (const card of cards) {
      rows.push(
        csvRow([
          card.front,
          card.back,
          card.type || '',
          card.cardCategory || '',
          card.memoryHookQuickTip || card.memoryCue || '',
        ]),
      );
    }
    return rows.join('\n');
  }

  return null;
}

export function queryAiToolExportElement(): HTMLElement | null {
  return document.querySelector('[data-ai-tool-export]');
}

export async function downloadAiToolPdf(
  fileName: string,
  fallbackHtml?: string,
  meta?: AiToolPdfMeta,
): Promise<void> {
  const source = queryAiToolExportElement();
  const wrapper = document.createElement('div');
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.width = '210mm';
  wrapper.style.maxWidth = '100vw';
  wrapper.style.padding = '14mm 12mm';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
  wrapper.style.color = '#1e293b';
  wrapper.style.fontSize = '14px';
  wrapper.style.lineHeight = '1.55';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '100vh';
  wrapper.style.pointerEvents = 'none';

  wrapper.innerHTML = buildPdfCover(meta);

  const body = document.createElement('div');
  body.style.border = '1px solid #e2e8f0';
  body.style.borderRadius = '14px';
  body.style.padding = '16px';
  body.style.background = '#f8fafc';

  if (source) {
    body.innerHTML = source.innerHTML;
  } else if (fallbackHtml) {
    body.innerHTML = fallbackHtml;
  } else {
    throw new Error('No exportable content found');
  }

  wrapper.appendChild(body);
  document.body.appendChild(wrapper);

  await document.fonts.ready.catch(() => undefined);
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await new Promise((r) => setTimeout(r, 50));

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: false,
    });
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    addCanvasToPdf(pdf, canvas, PDF_MARGIN);
    pdf.save(fileName);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function downloadTeacherToolCsv(
  toolType: string,
  content: string,
  rawContent: unknown,
  fileName: string,
): boolean {
  const csv = buildTeacherToolCsv(toolType, content, rawContent);
  if (!csv) return false;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName);
  return true;
}
