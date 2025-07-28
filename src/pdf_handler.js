import { readFile } from "@tauri-apps/plugin-fs";
const CMAP_URL = "public/cmaps/";
const CMAP_PACKED = true;
const ENABLE_XFA = true;
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { PDFPageView, EventBus } from "pdfjs-dist/web/pdf_viewer";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;

let pdfDocument = null;
let numPages = null;
let pdfContainer = null;
let eventBus = new EventBus();
let scale = null;

// Returns array buffer containing png image of cover page of PDF
export async function getPDFCover(filepath) {
  const data = await readFile(filepath, { baseDir: BaseDirectory.AppData });
  const loadingTask = getDocument({ data });
  let pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const scale = 0.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  const renderTask = page.render({ canvasContext: ctx, viewport });
  await renderTask.promise;

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  const ab = await blob.arrayBuffer();
  return ab;
}

export async function loadPDF(fileParams) {
  const filename = fileParams.filename;
  document.getElementById("pdf-title").textContent = fileParams.title;
  const data = await readFile(filename, { baseDir: BaseDirectory.AppData });
  const loadingTask = getDocument({
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    enableXfa: ENABLE_XFA,
  });
  pdfDocument = await loadingTask.promise;
  renderBlankPages();
}

const observer = new IntersectionObserver(observeIntersection, {
  root: null,
  threshold: 0.1,
});

async function observeIntersection(entries) {
  entries.forEach(async (entry) => {
    if (entry.isIntersecting) {
      const currentPageNum = Number(entry.target.id.replace("page", ""));
      // Draw current Page
      await drawPage(currentPageNum);
      // Draw neighbours
      for (let i = 1; i <= 3; i++) {
        let futurePage = currentPageNum + i;
        if (futurePage <= numPages) await drawPage(futurePage);
        let pastPage = currentPageNum - i;
        if (pastPage >= 1) await drawPage(pastPage);
      }
    }
  });
}

export async function redrawPages() {
  observer.disconnect();
  for (let i = 1; i <= numPages; i++) {
    const container = document.getElementById(`page${i}`);
    container.dataset.rendered = "false";
    if (container) {
      container.innerHTML = "";
      const pdfPage = await pdfDocument.getPage(i);

      const containerWidth = pdfContainer.clientWidth;
      const unscaledViewportWidth = pdfPage.getViewport({ scale: 1 }).width;
      const unscaledViewportHeight = pdfPage.getViewport({ scale: 1 }).height;
      const CSS_UNITS = 96.0 / 72.0;
      // 1 PDF unit is 1.33333... units
      const scaledViewportWidth = unscaledViewportWidth * CSS_UNITS;
      const scaledViewportHeight = unscaledViewportHeight * CSS_UNITS;
      scale = containerWidth / scaledViewportWidth; // proper scale

      container.style.height = `${scaledViewportHeight * scale}px`;
    }
  }
  for (let i = 1; i <= numPages; i++) {
    const container = document.getElementById(`page${i}`);
    observer.observe(container);
  }
}

async function drawPage(pageNum) {
  // Render page on container if not already drawn
  const container = document.getElementById(`page${pageNum}`);
  // TODO: Fix the Race condition
  if (container.dataset.rendered == "true") return;
  container.dataset.rendered = "true";
  const pdfPage = await pdfDocument.getPage(pageNum);
  const pdfPageView = new PDFPageView({
    container: container,
    id: pageNum,
    scale: scale,
    defaultViewport: pdfPage.getViewport({ scale: 1 }),
    eventBus,
  });
  pdfPageView.setPdfPage(pdfPage);
  await pdfPageView.draw();
  container.style.height = "auto"; // PageContainer's height will match with the rendered page (as latter's position is relative)
}

async function renderBlankPages() {
  if (!pdfContainer) pdfContainer = document.getElementById("pdf-container");
  numPages = pdfDocument.numPages;
  let theme = localStorage.getItem("theme") || "light";
  if (theme == "dark") {
    pdfContainer.style.filter =
      "invert(64%) contrast(228%) brightness(80%) hue-rotate(180deg)";
  }
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageWrapper = document.createElement("div");
    pageWrapper.className = "rounded-xl mb-4 flex justify-center";
    // if (theme == "dark") {
    //   pageWrapper.style.filter =
    //     "invert(64%) contrast(228%) brightness(80%) hue-rotate(180deg)";
    // }
    const pageContainer = document.createElement("div");
    pageContainer.classList.add("pdfViewer", "singlePageView");
    pageContainer.id = `page${pageNum}`;
    pageContainer.dataset.rendered = "false";
    pageWrapper.appendChild(pageContainer);
    pdfContainer.appendChild(pageWrapper);

    const pdfPage = await pdfDocument.getPage(pageNum);

    const containerWidth = pdfContainer.clientWidth;

    const unscaledViewportWidth = pdfPage.getViewport({ scale: 1 }).width;
    const unscaledViewportHeight = pdfPage.getViewport({ scale: 1 }).height;
    const CSS_UNITS = 96.0 / 72.0;
    // 1 PDF unit is 1.33333... units
    const scaledViewportWidth = unscaledViewportWidth * CSS_UNITS;
    const scaledViewportHeight = unscaledViewportHeight * CSS_UNITS;
    
    scale = containerWidth / scaledViewportWidth; // proper scale

    pageContainer.style.height = `${scaledViewportHeight * scale}px`;
    observer.observe(document.getElementById(`page${pageNum}`));
  }
}

export async function getPageText(pageNumber) {
  const pdfPage = await pdfDocument.getPage(pageNumber);
  const textContent = await pdfPage.getTextContent();
  const fullText = textContent.items.map((item) => item.str).join("");
  return fullText;
}

export function getPageAsImage(pageNumber) {
  const canvas = document.querySelector(
    `[data-page-number="${pageNumber}"] canvas`
  );
  if (canvas) {
    return canvas.toDataURL("image/png").split(",")[1];
  } else {
    console.error("Could not find canvas");
    return null;
  }
}
