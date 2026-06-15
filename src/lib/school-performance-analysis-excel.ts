import ExcelJS from 'exceljs';
import {
  COMPLEXITY_DISPLAY,
  DIFFICULTY_BUCKETS,
  type SchoolAnalysisExamResult,
  buildSchoolPerformanceAnalysisReport,
  displaySubject,
  formatAvgTime,
  formatPct,
  shortSubject,
  topChapter,
} from './school-performance-analysis-data';

const COLORS = {
  titleBg: 'FF1F4E79',
  sectionBg: 'FF2F5496',
  headerBg: 'FF4472C4',
  white: 'FFFFFFFF',
  labelBg: 'FFE7E6E6',
  correctBg: 'FFC6EFCE',
  correctText: 'FF006100',
  wrongBg: 'FFFFC7CE',
  wrongText: 'FF9C0006',
  leftBg: 'FFBDD7EE',
  leftText: 'FF1F4E79',
  excellentBg: 'FFC6EFCE',
  excellentText: 'FF006100',
  goodBg: 'FFE2EFDA',
  goodText: 'FF375623',
  averageBg: 'FFFFF2CC',
  averageText: 'FF9C6500',
  poorBg: 'FFFFC7CE',
  poorText: 'FF9C0006',
  border: 'FFB4B4B4',
  zebra: 'FFF8F9FA',
};

type FillArgb = { type: 'pattern'; pattern: 'solid'; fgColor: { argb: string } };

const solidFill = (argb: string): FillArgb => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: COLORS.border } },
  left: { style: 'thin' as const, color: { argb: COLORS.border } },
  bottom: { style: 'thin' as const, color: { argb: COLORS.border } },
  right: { style: 'thin' as const, color: { argb: COLORS.border } },
};

const styleCell = (
  cell: ExcelJS.Cell,
  opts: {
    bold?: boolean;
    size?: number;
    fill?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    border?: boolean;
    wrap?: boolean;
  } = {},
) => {
  cell.font = {
    bold: opts.bold ?? false,
    size: opts.size ?? 11,
    color: opts.color ? { argb: opts.color } : { argb: 'FF000000' },
    name: 'Calibri',
  };
  if (opts.fill) cell.fill = solidFill(opts.fill);
  cell.alignment = {
    vertical: 'middle',
    horizontal: opts.align ?? 'center',
    wrapText: opts.wrap ?? false,
  };
  if (opts.border !== false) cell.border = thinBorder;
};

const accuracyFill = (pct: number): { fill: string; color: string } => {
  if (pct >= 70) return { fill: COLORS.excellentBg, color: COLORS.excellentText };
  if (pct >= 55) return { fill: COLORS.goodBg, color: COLORS.goodText };
  if (pct >= 40) return { fill: COLORS.averageBg, color: COLORS.averageText };
  return { fill: COLORS.poorBg, color: COLORS.poorText };
};

const performanceStyle = (label: string): { fill: string; color: string } => {
  if (label === 'Excellent') return { fill: COLORS.excellentBg, color: COLORS.excellentText };
  if (label === 'Good') return { fill: COLORS.goodBg, color: COLORS.goodText };
  if (label === 'Average') return { fill: COLORS.averageBg, color: COLORS.averageText };
  return { fill: COLORS.poorBg, color: COLORS.poorText };
};

const mergeBanner = (sheet: ExcelJS.Worksheet, row: number, text: string, colCount: number) => {
  if (colCount > 1) sheet.mergeCells(row, 1, row, colCount);
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  styleCell(cell, { bold: true, fill: COLORS.sectionBg, color: COLORS.white, align: 'left', size: 12 });
  sheet.getRow(row).height = 24;
};

const writeHeaderRow = (sheet: ExcelJS.Worksheet, row: number, headers: string[]) => {
  headers.forEach((header, idx) => {
    const cell = sheet.getCell(row, idx + 1);
    cell.value = header;
    styleCell(cell, { bold: true, fill: COLORS.headerBg, color: COLORS.white });
  });
  sheet.getRow(row).height = 22;
};

type HighlightKind = 'correct' | 'wrong' | 'left' | 'accuracy' | 'performance';

const writeDataRow = (
  sheet: ExcelJS.Worksheet,
  row: number,
  values: unknown[],
  opts?: {
    zebra?: boolean;
    highlights?: Record<number, HighlightKind>;
    accuracyValues?: Record<number, number>;
    leftAlignCols?: number[];
  },
) => {
  values.forEach((value, idx) => {
    const col = idx + 1;
    const cell = sheet.getCell(row, col);
    cell.value = value as ExcelJS.CellValue;
    const align = opts?.leftAlignCols?.includes(col) ? 'left' : 'center';
    const base = { border: true as const, align };
    const highlight = opts?.highlights?.[col];

    if (highlight === 'correct') {
      styleCell(cell, { ...base, fill: COLORS.correctBg, color: COLORS.correctText, bold: true });
    } else if (highlight === 'wrong') {
      styleCell(cell, { ...base, fill: COLORS.wrongBg, color: COLORS.wrongText, bold: true });
    } else if (highlight === 'left') {
      styleCell(cell, { ...base, fill: COLORS.leftBg, color: COLORS.leftText });
    } else if (highlight === 'accuracy' && opts?.accuracyValues?.[col] != null) {
      const tone = accuracyFill(opts.accuracyValues[col]);
      styleCell(cell, { ...base, fill: tone.fill, color: tone.color, bold: true });
    } else if (highlight === 'performance' && typeof value === 'string') {
      const tone = performanceStyle(value);
      styleCell(cell, { ...base, fill: tone.fill, color: tone.color, bold: true });
    } else {
      styleCell(cell, { ...base, fill: opts?.zebra ? COLORS.zebra : undefined });
    }
  });
};

const setColumnWidths = (sheet: ExcelJS.Worksheet, widths: number[]) => {
  widths.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width;
  });
};

function buildReportSheet(
  workbook: ExcelJS.Workbook,
  report: NonNullable<ReturnType<typeof buildSchoolPerformanceAnalysisReport>>,
) {
  const sectionDHeaders = [
    'Rank',
    'Student',
    'Class',
    'Attempt',
    'Completed At',
    'Total',
    'Correct',
    'Wrong',
    'Left',
    'Accuracy',
    'Avg Time/Que',
    ...report.subjects.map((k) => `${shortSubject(k)} Acc%`),
    'Top Subject',
    'Performance',
  ];
  const sectionDColCount = sectionDHeaders.length;
  const maxCol = Math.max(14, sectionDColCount);
  const performanceCol = sectionDColCount;

  const sheet = workbook.addWorksheet('Report', {
    properties: { defaultRowHeight: 20 },
  });

  let row = 1;

  sheet.mergeCells(row, 1, row, maxCol);
  const titleCell = sheet.getCell(row, 1);
  titleCell.value = 'SCHOOL PERFORMANCE ANALYSIS REPORT';
  styleCell(titleCell, { bold: true, size: 16, fill: COLORS.titleBg, color: COLORS.white });
  sheet.getRow(row).height = 34;
  row += 1;

  sheet.getCell(row, 1).value = 'Exam Name';
  styleCell(sheet.getCell(row, 1), { bold: true, fill: COLORS.labelBg, align: 'left' });
  sheet.mergeCells(row, 2, row, maxCol);
  const examCell = sheet.getCell(row, 2);
  examCell.value = report.examTitle;
  styleCell(examCell, { bold: true, align: 'left', wrap: true });
  sheet.getRow(row).height = 22;
  row += 1;

  const meta = [
    ['Total Students', report.studentCount],
    ['Total Attempts', report.totalAttempts],
    ['Total Questions', report.overall.total],
    ['Subjects', report.subjectLabels.join(', ') || '—'],
    ['Attempt basis', report.attemptNote],
  ] as const;
  meta.forEach(([label, value]) => {
    sheet.getCell(row, 1).value = label;
    styleCell(sheet.getCell(row, 1), { bold: true, fill: COLORS.labelBg, align: 'left' });
    sheet.mergeCells(row, 2, row, maxCol);
    const valueCell = sheet.getCell(row, 2);
    valueCell.value = value;
    styleCell(valueCell, { align: 'left', wrap: true });
    row += 1;
  });
  row += 1;

  mergeBanner(sheet, row, 'SECTION A: OVERALL PERFORMANCE SNAPSHOT', 10);
  row += 1;
  writeHeaderRow(sheet, row, [
    'Total Questions',
    'Correct Answers',
    'Wrong Answers',
    'Left / Unattempted',
    'Overall Accuracy',
    'Avg Time/Que',
    'Total Students',
    'Total Attempts',
    'Avg Q per Student',
    'Avg Q per Attempt',
  ]);
  row += 1;
  writeDataRow(
    sheet,
    row,
    [
      report.overall.total,
      report.overall.correct,
      report.overall.wrong,
      report.overall.left,
      formatPct(report.overall.correct, report.overall.total),
      formatAvgTime(report.overall.totalTime, report.overall.total),
      report.studentCount,
      report.totalAttempts,
      report.overall.avgQPerStudent,
      report.overall.avgQPerAttempt,
    ],
    {
      highlights: { 2: 'correct', 3: 'wrong', 4: 'left', 5: 'accuracy' },
      accuracyValues: {
        5: report.overall.total > 0 ? (report.overall.correct / report.overall.total) * 100 : 0,
      },
    },
  );
  row += 2;

  mergeBanner(sheet, row, 'SECTION B: SUBJECT-WISE PERFORMANCE', 14);
  row += 1;
  writeHeaderRow(sheet, row, [
    'Subject',
    'Total Qs',
    'Correct',
    'Wrong',
    'Left',
    'Accuracy',
    'Avg Time/Que',
    'Easy Qs',
    'Medium Qs',
    'Hard Qs',
    'Very Hard Qs',
    'Numerical Qs',
    'Formula Qs',
    'Top Chapter',
  ]);
  row += 1;
  for (const subjectKey of report.subjects) {
    const agg = report.bySubject.get(subjectKey)!;
    const accPct = agg.total > 0 ? (agg.correct / agg.total) * 100 : 0;
    writeDataRow(
      sheet,
      row,
      [
        displaySubject(subjectKey),
        agg.total,
        agg.correct,
        agg.wrong,
        agg.left,
        formatPct(agg.correct, agg.total),
        formatAvgTime(agg.totalTime, agg.total),
        report.hasQuestionAnalytics ? agg.easy : '—',
        report.hasQuestionAnalytics ? agg.moderate : '—',
        report.hasQuestionAnalytics ? agg.difficult : '—',
        report.hasQuestionAnalytics ? agg.highly_difficult : '—',
        report.hasQuestionAnalytics ? agg.numerical : '—',
        report.hasQuestionAnalytics ? agg.formula : '—',
        report.hasQuestionAnalytics ? topChapter(agg) : '—',
      ],
      {
        zebra: row % 2 === 0,
        highlights: { 3: 'correct', 4: 'wrong', 5: 'left', 6: 'accuracy' },
        accuracyValues: { 6: accPct },
        leftAlignCols: [1, 14],
      },
    );
    row += 1;
  }
  row += 1;

  mergeBanner(sheet, row, 'SECTION C: COMPLEXITY-WISE PERFORMANCE', 7);
  row += 1;
  writeHeaderRow(sheet, row, ['Complexity', 'Total Qs', 'Correct', 'Wrong', 'Left', 'Accuracy', 'Avg Time/Que']);
  row += 1;
  for (const bucket of DIFFICULTY_BUCKETS) {
    const agg = report.byDifficulty.get(bucket)!;
    if (!report.hasQuestionAnalytics && agg.total === 0) continue;
    const accPct = agg.total > 0 ? (agg.correct / agg.total) * 100 : 0;
    writeDataRow(
      sheet,
      row,
      [
        COMPLEXITY_DISPLAY[bucket],
        agg.total,
        agg.correct,
        agg.wrong,
        agg.left,
        formatPct(agg.correct, agg.total),
        formatAvgTime(agg.totalTime, agg.total),
      ],
      {
        zebra: row % 2 === 0,
        highlights: { 3: 'correct', 4: 'wrong', 5: 'left', 6: 'accuracy' },
        accuracyValues: { 6: accPct },
        leftAlignCols: [1],
      },
    );
    row += 1;
  }
  row += 1;

  mergeBanner(sheet, row, 'SECTION D: STUDENT PERFORMANCE RANKING', maxCol);
  row += 1;

  const sectionDHeaderRow = row;
  writeHeaderRow(sheet, row, sectionDHeaders);
  row += 1;

  const firstStudentRow = row;
  for (const student of report.rankedStudents) {
    const subjectCols = report.subjects.map((key) => {
      const acc = student.subjectAcc.get(key);
      return acc != null ? `${acc.toFixed(1)}%` : '—';
    });
    writeDataRow(
      sheet,
      row,
      [
        student.rank,
        student.name,
        student.classNumber,
        student.attemptLabel,
        student.completedAt,
        student.total,
        student.correct,
        student.wrong,
        student.left,
        student.accuracyLabel,
        student.avgTime,
        ...subjectCols,
        student.topSubject,
        student.performance,
      ],
      {
        zebra: row % 2 === 0,
        highlights: {
          7: 'correct',
          8: 'wrong',
          9: 'left',
          10: 'accuracy',
          [performanceCol]: 'performance',
        },
        accuracyValues: { 10: student.accuracy },
        leftAlignCols: [2, 3, 4, 5, sectionDColCount - 1],
      },
    );
    row += 1;
  }

  const lastStudentRow = row - 1;

  if (lastStudentRow >= firstStudentRow) {
    sheet.autoFilter = {
      from: { row: sectionDHeaderRow, column: 1 },
      to: { row: lastStudentRow, column: sectionDColCount },
    };
  }

  const widths = [8, 28, 12, 12, 20, 10, 10, 10, 10, 12, 12];
  for (let i = 8; i < maxCol; i += 1) {
    if (i >= widths.length) widths.push(12);
  }
  widths[0] = 8;
  widths[1] = Math.max(widths[1], 30);
  if (widths.length >= 14) widths[13] = 24;
  setColumnWidths(sheet, widths.slice(0, maxCol));

  sheet.views = [{ showGridLines: true, zoomScale: 100 }];
}

export function schoolPerformanceAnalysisExcelFilename(examTitle: string): string {
  const slug = String(examTitle || 'exam')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'exam'}_School_Performance_Analysis_${date}.xlsx`;
}

export async function buildSchoolPerformanceAnalysisExcel(
  examTitle: string,
  results: SchoolAnalysisExamResult[],
): Promise<ArrayBuffer | null> {
  const report = buildSchoolPerformanceAnalysisReport(examTitle, results);
  if (!report) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ASLI Learn';
  workbook.created = new Date();
  workbook.modified = new Date();

  buildReportSheet(workbook, report);

  while (workbook.worksheets.length > 1) {
    const extra = workbook.worksheets[workbook.worksheets.length - 1];
    if (extra.id) workbook.removeWorksheet(extra.id);
    else break;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function downloadSchoolPerformanceAnalysisExcel(
  examTitle: string,
  results: SchoolAnalysisExamResult[],
): Promise<boolean> {
  const buffer = await buildSchoolPerformanceAnalysisExcel(examTitle, results);
  if (!buffer) return false;

  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer as ArrayLike<number>);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = schoolPerformanceAnalysisExcelFilename(examTitle);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
