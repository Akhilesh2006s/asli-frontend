import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { renderMarkdown } from "@/lib/render-teacher-markdown";
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

function sanitizeFileName(s: string) {
  return s.replace(/[^\w\-]+/g, "_").slice(0, 80) || "export";
}

function addMetaRow(container: HTMLElement, label: string, value: string) {
  const p = document.createElement("p");
  p.className = "text-sm mb-1.5 leading-relaxed";
  const strong = document.createElement("span");
  strong.className = "font-semibold text-gray-900";
  strong.textContent = `${label} `;
  p.appendChild(strong);
  p.appendChild(document.createTextNode(value === "" || value == null ? "—" : value));
  container.appendChild(p);
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

    if (page > 0) pdf.addPage();
    const imgData = pageCanvas.toDataURL("image/jpeg", q);
    pdf.addImage(imgData, imageType, margin[1], margin[0], innerW, pageHeightMm);
  }
}

/**
 * Builds the same styled HTML as the teacher tools / Super Admin viewer, rasterizes with
 * html2canvas directly (not html2pdf.js, which wraps content in an opacity:0 overlay and
 * often produces blank JPEGs in Chromium).
 */
export async function downloadGenerationsPdf(title: string, records: PdfRecord[]) {
  const wrapper = document.createElement("div");
  const rootId = `pdf-root-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  wrapper.id = rootId;

  wrapper.style.boxSizing = "border-box";
  wrapper.style.width = "210mm";
  wrapper.style.maxWidth = "100vw";
  wrapper.style.padding = "18mm 16mm";
  wrapper.style.backgroundColor = "#ffffff";
  wrapper.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  wrapper.style.color = "#374151";
  wrapper.style.fontSize = "14px";
  wrapper.style.lineHeight = "1.6";
  /* Below the fold — visible to layout/html2canvas, unlike html2pdf’s opacity:0 overlay */
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "100vh";
  wrapper.style.pointerEvents = "none";

  const titleEl = document.createElement("h1");
  titleEl.className = "text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200";
  titleEl.textContent = title;
  wrapper.appendChild(titleEl);

  records.forEach((rec, idx) => {
    const section = document.createElement("section");
    section.className =
      "mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm break-inside-avoid";
    section.style.pageBreakInside = "avoid";

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
    body.innerHTML = renderMarkdown(rec.content || "(no content)");
    section.appendChild(body);

    wrapper.appendChild(section);
  });

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-gray-600";
    empty.textContent = "No records in this export.";
    wrapper.appendChild(empty);
  }

  document.body.appendChild(wrapper);

  await document.fonts.ready.catch(() => undefined);
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  await new Promise((r) => setTimeout(r, 50));

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      foreignObjectRendering: false,
    });

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });

    addCanvasToPdf(pdf, canvas, PDF_MARGIN, "JPEG", 0.98);
    pdf.save(`${sanitizeFileName(title)}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}
