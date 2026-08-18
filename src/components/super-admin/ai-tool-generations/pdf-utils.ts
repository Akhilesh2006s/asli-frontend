import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { renderMarkdown } from "@/lib/render-teacher-markdown";
import { formatClassroomScienceText } from "@/lib/exam-text-normalize";
import "katex/dist/katex.min.css";

export type PdfRecord = {
  toolDisplayName?: string;
  toolName?: string;
  classLabel?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  content?: string;
  createdAt?: string;
};

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-800 prose-img:rounded-lg prose-img:shadow-md prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2";

/** Margin: top, left, bottom, right (mm) — matches html2pdf defaults we used before */
const PDF_MARGIN: [number, number, number, number] = [10, 10, 10, 10];
const MAX_CANVAS_EDGE = 8192;

function sanitizeFileName(s: string) {
  return s.replace(/[^\w\-]+/g, "_").slice(0, 80) || "export";
}

function addMetaRow(container: HTMLElement, label: string, value: string) {
  const p = document.createElement("p");
  p.className = "text-xs sm:text-sm mb-1.5 leading-relaxed";
  const strong = document.createElement("span");
  strong.className = "font-semibold text-gray-900";
  strong.textContent = `${label} `;
  p.appendChild(strong);
  p.appendChild(document.createTextNode(value === "" || value == null ? "—" : value));
  container.appendChild(p);
}

function stripToPlainText(value: string) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split a tall canvas into A4 pages and add to jsPDF (same math as html2pdf.js worker).
 */
function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  margin: [number, number, number, number],
  imageType: "JPEG",
  quality: number,
  startNewPage = false,
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const innerW = pageW - margin[1] - margin[3];
  const innerH = pageH - margin[0] - margin[2];
  const innerRatio = innerH / innerW;

  const pxFullHeight = canvas.height;
  const pxPageHeight = Math.floor(canvas.width * innerRatio);
  const nPages = Math.max(1, Math.ceil(pxFullHeight / pxPageHeight));

  let pageHeightMm = innerH;

  const pageCanvas = document.createElement("canvas");
  const pageCtx = pageCanvas.getContext("2d");
  if (!pageCtx) return;

  pageCanvas.width = canvas.width;
  pageCanvas.height = pxPageHeight;

  const q = quality;

  for (let page = 0; page < nPages; page++) {
    if (page === nPages - 1 && pxFullHeight % pxPageHeight !== 0) {
      pageCanvas.height = pxFullHeight % pxPageHeight;
      pageHeightMm = (pageCanvas.height * innerW) / pageCanvas.width;
    } else {
      pageCanvas.height = pxPageHeight;
      pageHeightMm = innerH;
    }

    const w = pageCanvas.width;
    const h = pageCanvas.height;
    pageCtx.fillStyle = "white";
    pageCtx.fillRect(0, 0, w, h);
    pageCtx.drawImage(canvas, 0, page * pxPageHeight, w, h, 0, 0, w, h);

    if (startNewPage || page > 0) pdf.addPage();
    startNewPage = false;
    const imgData = pageCanvas.toDataURL("image/jpeg", q);
    pdf.addImage(imgData, imageType, margin[1], margin[0], innerW, pageHeightMm);
  }
}

function buildRecordWrapper(title: string | null, rec: PdfRecord, idx: number) {
  const wrapper = document.createElement("div");
  wrapper.style.boxSizing = "border-box";
  wrapper.style.width = "210mm";
  wrapper.style.maxWidth = "100vw";
  wrapper.style.padding = "18mm 16mm";
  wrapper.style.backgroundColor = "#ffffff";
  wrapper.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  wrapper.style.color = "#374151";
  wrapper.style.fontSize = "14px";
  wrapper.style.lineHeight = "1.6";
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "100vh";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "-1";

  if (title) {
    const titleEl = document.createElement("h1");
    titleEl.className = "text-lg sm:text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200";
    titleEl.textContent = title;
    wrapper.appendChild(titleEl);
  }

  const section = document.createElement("section");
  section.className = "mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm";

  const genLabel = document.createElement("div");
  genLabel.className = "text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4";
  genLabel.textContent = `Generation ${idx + 1}`;
  section.appendChild(genLabel);

  const meta = document.createElement("div");
  meta.className = "mb-4 pb-4 border-b border-gray-100";
  addMetaRow(meta, "Tool:", rec.toolDisplayName || rec.toolName || "—");
  addMetaRow(meta, "Class:", rec.classLabel || "—");
  addMetaRow(meta, "Subject:", rec.subject || "—");
  addMetaRow(meta, "Topic:", rec.topic || "—");
  addMetaRow(meta, "Subtopic:", rec.subtopic || "—");
  addMetaRow(
    meta,
    "Generated:",
    rec.createdAt ? new Date(rec.createdAt).toLocaleString() : "—",
  );
  section.appendChild(meta);

  const body = document.createElement("div");
  body.className = PROSE_CLASSES;
  try {
    body.innerHTML = renderMarkdown(
      formatClassroomScienceText(rec.content || "(no content)", rec.subject),
    );
  } catch {
    body.textContent = rec.content || "(no content)";
  }
  section.appendChild(body);
  wrapper.appendChild(section);
  return wrapper;
}

async function rasterizeWrapper(wrapper: HTMLElement, scale: number) {
  document.body.appendChild(wrapper);
  await document.fonts.ready.catch(() => undefined);
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await new Promise((r) => setTimeout(r, 40));
  try {
    return await html2canvas(wrapper, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      foreignObjectRendering: false,
    });
  } finally {
    wrapper.remove();
  }
}

function addPlainTextRecord(pdf: jsPDF, rec: PdfRecord, idx: number, startNewPage: boolean) {
  if (startNewPage) pdf.addPage();
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let y = 48;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(`Generation ${idx + 1}: ${rec.toolDisplayName || rec.toolName || "AI Tool"}`, 40, y, {
    maxWidth: pageW - 80,
  });
  y += 22;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const meta = [
    `Class: ${rec.classLabel || "—"}`,
    `Subject: ${rec.subject || "—"}`,
    `Topic: ${rec.topic || "—"}`,
    `Subtopic: ${rec.subtopic || "—"}`,
  ];
  for (const line of meta) {
    pdf.text(line, 40, y);
    y += 14;
  }
  y += 8;
  const body = stripToPlainText(rec.content || "(no content)") || "(no content)";
  const lines = pdf.splitTextToSize(body, pageW - 80) as string[];
  for (const line of lines) {
    if (y > pageH - 40) {
      pdf.addPage();
      y = 48;
    }
    pdf.text(line, 40, y);
    y += 13;
  }
}

/**
 * Builds the same styled HTML as the teacher tools / Super Admin viewer, rasterizes with
 * html2canvas per record (a single tall canvas of hundreds of records exceeds Chromium limits
 * and looks like a dead Download PDF button). Falls back to a text PDF if rasterizing fails.
 */
export async function downloadGenerationsPdf(title: string, records: PdfRecord[]) {
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });
  const list = records.length ? records : [{ content: "No records in this export." }];
  let usedPage = false;

  for (let i = 0; i < list.length; i++) {
    const rec = list[i];
    let rendered = false;
    for (const scale of [1.5, 1]) {
      try {
        const wrapper = buildRecordWrapper(i === 0 ? title : null, rec, i);
        const canvas = await rasterizeWrapper(wrapper, scale);
        if (canvas.width > MAX_CANVAS_EDGE || canvas.height > MAX_CANVAS_EDGE * 4) {
          continue;
        }
        addCanvasToPdf(pdf, canvas, PDF_MARGIN, "JPEG", 0.92, usedPage);
        usedPage = true;
        rendered = true;
        break;
      } catch (err) {
        console.warn("Styled PDF rasterize failed; trying next strategy.", err);
      }
    }
    if (!rendered) {
      addPlainTextRecord(pdf, rec, i, usedPage);
      usedPage = true;
    }
  }

  pdf.save(`${sanitizeFileName(title)}.pdf`);
}
