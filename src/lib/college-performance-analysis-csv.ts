import type { SchoolAnalysisExamResult } from './school-performance-analysis-data';
import {
  buildExamAnalyticsHandoffReport,
  formatHandoffNumber,
  formatHandoffPct,
} from './exam-analytics-handoff';

export type { QuestionAnalyticsRow, SchoolAnalysisExamResult } from './school-performance-analysis-data';
/** @deprecated Use SchoolAnalysisExamResult */
export type CollegeAnalysisExamResult = SchoolAnalysisExamResult;

const escapeCsvCell = (value: unknown): string =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const csvRow = (cells: unknown[]): string => cells.map(escapeCsvCell).join(',');

export function buildCollegePerformanceAnalysisCsv(
  examTitle: string,
  results: SchoolAnalysisExamResult[],
): string {
  return buildSchoolPerformanceAnalysisCsv(examTitle, results);
}

/** CSV mirrors the Student Data sheet from the exam analytics handoff Excel. */
export function buildSchoolPerformanceAnalysisCsv(
  examTitle: string,
  results: SchoolAnalysisExamResult[],
): string {
  const report = buildExamAnalyticsHandoffReport(examTitle, results);
  if (!report) return '';

  const lines: string[] = [];
  lines.push(csvRow([`${report.examTitle} | STUDENT DATA`]));
  lines.push(
    csvRow([
      'Class accuracy',
      formatHandoffPct(report.classAccuracy),
      'Precision',
      formatHandoffPct(report.classPrecision),
      'Avg time/Q',
      `${formatHandoffNumber(report.classAvgTimeSec)}s`,
      'Students',
      report.studentCount,
    ]),
  );
  lines.push('');

  const headers = [
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
    'Avg Time/Q (s)',
    ...report.subjectLabels,
    'Attempted',
    'Recorded Attempt Rate',
    'Attempted Precision',
    'Wrong / Attempted',
    'Correct / Est. Active Min',
    'Accuracy Gap vs Class',
    'Time Gap vs Class (s)',
    'Subject Spread',
    'Percentile Position',
    'Strongest Subject',
    'Weakest Subject',
    'Pace-Accuracy Profile',
    'Cohort Band',
  ];
  lines.push(csvRow(headers));

  for (const student of report.students) {
    lines.push(
      csvRow([
        student.rank,
        student.name,
        student.classNumber,
        student.attemptLabel,
        student.completedAt,
        student.total,
        student.correct,
        student.wrong,
        student.left,
        formatHandoffPct(student.accuracy),
        formatHandoffNumber(student.avgTimeSec),
        ...report.subjects.map((key) => formatHandoffPct(student.subjectAcc.get(key) ?? 0)),
        student.attempted,
        formatHandoffPct(student.attemptRate),
        formatHandoffPct(student.precision),
        formatHandoffPct(student.wrongBurden),
        formatHandoffNumber(student.correctPerActiveMin, 2),
        formatHandoffPct(student.accuracyGap),
        formatHandoffNumber(student.timeGap),
        formatHandoffPct(student.subjectSpread),
        formatHandoffNumber(student.percentile, 3),
        student.strongestSubject,
        student.weakestSubject,
        student.paceAccuracyProfile,
        student.cohortBand,
      ]),
    );
  }

  lines.push('');
  lines.push(csvRow(['SUBJECT DATA']));
  lines.push(
    csvRow([
      'Subject',
      'Total Responses',
      'Correct',
      'Wrong',
      'Left',
      'Accuracy',
      'Recorded Attempt Rate',
      'Attempted Precision',
      'Wrong / Attempted',
      'Recorded Left Rate',
      'Avg Time/Q (s)',
      'Correct / Est. Active Min',
      'Zero-Correct Students',
      'Students >=50%',
    ]),
  );
  for (const subj of report.subjectRows) {
    lines.push(
      csvRow([
        subj.label,
        subj.total,
        subj.correct,
        subj.wrong,
        subj.left,
        formatHandoffPct(subj.accuracy),
        formatHandoffPct(subj.attemptRate),
        formatHandoffPct(subj.precision),
        formatHandoffPct(subj.wrongBurden),
        formatHandoffPct(subj.leftRate),
        formatHandoffNumber(subj.avgTimeSec),
        formatHandoffNumber(subj.correctPerActiveMin, 2),
        subj.zeroCorrectStudents,
        subj.studentsAtLeast50,
      ]),
    );
  }

  return lines.join('\n');
}

export function schoolPerformanceAnalysisFilename(examTitle: string): string {
  const slug = String(examTitle || 'exam')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'exam'}_Exam_Analytics_${date}.csv`;
}
