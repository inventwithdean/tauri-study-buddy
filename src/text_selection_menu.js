import { getPageText } from "./pdf_handler.js";
import {
  askLLM,
  buildWhatsThisPrompt,
  buildDefinePrompt,
  buildTranslatePrompt,
} from "./llm.js";
let selectedText = "";
let pageNumber = null;
let ai_menu = null;
let selection_rect = null;
let ai_results_container = null;
import { marked } from "marked";
import { showCompanionTab } from "./companion_panel.js";
import { language } from "./study.js";

export function handleTextSelection() {
  ai_results_container = document.getElementById("ai-results-container");
  ai_menu = document.getElementById("ai-menu");
  setTimeout(() => {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      selection_rect = range.getBoundingClientRect();
      ai_menu.style.top = `${selection_rect.top + window.scrollY - 110}px`;
      const selection_x_rect_avg =
        (selection_rect.left + selection_rect.right) / 2;
      ai_menu.style.left = `${selection_x_rect_avg + window.scrollX + 20}px`;
      ai_menu.style.visibility = "visible";

      // Handle finding the page number
      const anchorNode = selection.anchorNode;
      if (anchorNode) {
        const selectedElement =
          anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
        const pageElement = selectedElement.closest("[data-page-number]");
        if (pageElement) {
          pageNumber = Number(pageElement.getAttribute("data-page-number"));
        } else {
          console.warn("Could not find page element for selection!");
        }
      }
    } else {
      ai_menu.style.visibility = "hidden";
    }
  }, 0);
}

async function handlePrompt(prompt, systemPrompt) {
  ai_menu.style.visibility = "hidden";
  const stream = await askLLM(prompt, systemPrompt);
  //   Update text
  let first = true;
  let answer = "";
  for await (const event of stream) {
    const token = event.choices?.[0]?.delta.content;
    if (token) {
      if (first) {
        ai_results_container.innerHTML = "";
        first = false;
      }
      answer += token;
      ai_results_container.innerHTML = marked(answer);
    }
  }
}

export async function handleWhatsThis() {
  showCompanionTab("ai-results-container");

  const pageText = await getPageText(pageNumber);
  const prompt = buildWhatsThisPrompt(selectedText, pageText);
  handlePrompt(
    prompt,
    `You are a study assistant. Provide explanation only in ${language}`
  );
}

export async function handleDefine() {
  showCompanionTab("ai-results-container");

  const prompt = buildDefinePrompt(selectedText);
  handlePrompt(
    prompt,
    `You are a ${language} dictionary which defines things. Output the definition in ${language} only.`
  );
}

export async function handleTranslate() {
  showCompanionTab("ai-results-container");
  const prompt = buildTranslatePrompt(selectedText);
  handlePrompt(
    prompt,
    `You are a translator that converts any language to ${language}. Output the translation only.`
  );
}
