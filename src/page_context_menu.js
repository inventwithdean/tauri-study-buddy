import { summarize, generateQuiz } from "./llm.js";
import { initializeMCQ } from "./mcq_panel.js";
import { getPageText, getPageAsImage } from "./pdf_handler.js";
import { marked } from "marked";
import { showCompanionTab } from "./companion_panel.js";
import { recognizeText } from "./ocr.js";

let page_context_menu = null;
let currentPageNum = null;


export function setPageNumber(pageNum) {
  currentPageNum = pageNum;
}

export async function handleGenerateQuiz(ocr_mode) {
  if (!page_context_menu)
    page_context_menu = document.getElementById("page-context-menu");
  page_context_menu.style.visibility = "hidden";
  let pageText;
  if (ocr_mode) {
    const img = getPageAsImage(currentPageNum);
    pageText = await recognizeText(img);
  } else {
    pageText = await getPageText(currentPageNum);
  }
  const rawQuiz = await generateQuiz(pageText);
  const quiz = JSON.parse(rawQuiz);

  const questions = quiz["questions"];
  initializeMCQ(questions);
}

export async function handleSummarize(ocr_mode) {
  if (!page_context_menu)
    page_context_menu = document.getElementById("page-context-menu");
  const summaryContainer = document.getElementById("summary-container");
  page_context_menu.style.visibility = "hidden";
  let pageText;
  if (ocr_mode) {
    const img = getPageAsImage(currentPageNum);
    pageText = await recognizeText(img);
  } else {
    pageText = await getPageText(currentPageNum);
  }

  const stream = await summarize(pageText);
  let answer = "";
  let first = true;
  for await (const event of stream) {
    const token = event.choices?.[0]?.delta.content;
    if (token) {
      if (first) {
        showCompanionTab("summary-container");
        summaryContainer.innerHTML = "";
        first = false;
      }
      answer += token;
      summaryContainer.innerHTML = marked(answer);
    }
  }
}
