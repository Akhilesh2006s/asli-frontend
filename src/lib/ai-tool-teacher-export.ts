import html2pdf from 'html2pdf.js';
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

export function isTeacherDownloadTool(toolType: string): toolType is TeacherDownloadToolId {
  return (TEACHER_DOWNLOAD_TOOL_IDS as readonly string[]).includes(toolType);
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(',');
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
    if (homework.creativeThinkingQuestion) {
      rows.push(csvRow(['Creative', homework.creativeThinkingQuestion, '', '', '', '', '']));
    }
    if (homework.challengeQuestion) {
      rows.push(csvRow(['Challenge', homework.challengeQuestion, '', '', '', '', '']));
    }
    return rows.join('\n');
  }

  if (toolType === 'exam-question-paper-generator') {
    const { paper } = resolveExamPaperFromPayload(content, rawContent);
    if (paper?.sections?.length) {
      const rows: string[] = [
        csvRow(['Section', 'Question Number', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Marks']),
      ];
      for (const section of paper.sections) {
        section.questions.forEach((q) => {
          rows.push(
            csvRow([
              section.title,
              q.questionNumber,
              q.question,
              q.options[0] || '',
              q.options[1] || '',
              q.options[2] || '',
              q.options[3] || '',
              q.answer,
              q.marks ?? '',
            ]),
          );
        });
      }
      return rows.join('\n');
    }

    const raw = rawContent && typeof rawContent === 'object' ? (rawContent as Record<string, unknown>) : null;
    if (!raw) return null;
    const rows: string[] = [
      csvRow(['Question Number', 'Type', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Answer', 'Explanation', 'Marks']),
    ];
    const questions = raw.questions as Record<string, unknown[]> | undefined;
    if (questions && typeof questions === 'object') {
      const typeLabels: Record<string, string> = {
        mcqs: 'MCQ',
        fillInBlanks: 'Fill in the Blanks',
        vsaqs: 'Very Short Answer',
        saqs: 'Short Answer',
        laqs: 'Long Answer',
      };
      for (const [type, list] of Object.entries(questions)) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          const q = item as Record<string, unknown>;
          const options = (q.options as Record<string, string> | undefined) || {};
          rows.push(
            csvRow([
              q.question_number || '',
              typeLabels[type] || type,
              q.question || '',
              options.A || '',
              options.B || '',
              options.C || '',
              options.D || '',
              q.correct_answer || '',
              q.answer || '',
              q.explanation || '',
              q.marks || '',
            ]),
          );
        }
      }
      return rows.join('\n');
    }
    return null;
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

export async function downloadAiToolPdf(fileName: string, fallbackHtml?: string): Promise<void> {
  const source = queryAiToolExportElement();
  const tempDiv = document.createElement('div');
  tempDiv.style.width = '210mm';
  tempDiv.style.padding = '16mm';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.color = '#111827';

  if (source) {
    tempDiv.innerHTML = source.innerHTML;
  } else if (fallbackHtml) {
    tempDiv.innerHTML = fallbackHtml;
  } else {
    throw new Error('No exportable content found');
  }

  document.body.appendChild(tempDiv);

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: tempDiv.scrollWidth,
          windowHeight: tempDiv.scrollHeight,
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      })
      .from(tempDiv)
      .save();
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export function downloadTeacherToolCsv(toolType: string, content: string, rawContent: unknown, fileName: string): boolean {
  const csv = buildTeacherToolCsv(toolType, content, rawContent);
  if (!csv) return false;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName);
  return true;
}
