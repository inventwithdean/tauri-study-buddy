import {
  handleTextSelection,
  handleWhatsThis,
  handleDefine,
  handleTranslate,
} from "./text_selection_menu.js";
import {
  handleGenerateQuiz,
  setPageNumber,
  handleSummarize,
} from "./page_context_menu.js";
import { redrawPages } from "./pdf_handler.js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { toggleCompanionPanel } from "./companion_panel.js";
let ocr_mode = false;

export let language = null;

window.addEventListener("DOMContentLoaded", async () => {
  const langSelect = document.getElementById("language-select");
  language = localStorage.getItem("language") || "English";
  langSelect.value = language;
  langSelect.addEventListener("change", () => {
    language = langSelect.value;
    localStorage.setItem("language", language);
  });
  let ocr_toggle_btn = document.getElementById("ocr-toggle-btn");
  ocr_toggle_btn.addEventListener("click", () => {
    ocr_mode = !ocr_mode;
    if (ocr_mode) {
      ocr_toggle_btn.classList.add("bg-red-500", "dark:bg-gray-700");
    } else {
      ocr_toggle_btn.classList.remove("bg-red-500", "dark:bg-gray-700");
    }
  });
  document.getElementById("back-to-library").addEventListener("click", () => {
    window.location.href = "index.html";
    document.getElementById("library-view").classList.add("hidden");
    document.getElementById("pdf-study-view").classList.remove("hidden");
    // Do cleanup
  });
  document
    .querySelector("#pdf-container")
    .addEventListener("mouseup", async (e) => {
      handleTextSelection();
    });

  document.getElementById("whatsthis-btn").addEventListener("click", (e) => {
    handleWhatsThis();
  });
  document.getElementById("define-btn").addEventListener("click", (e) => {
    handleDefine();
  });
  document.getElementById("translate-btn").addEventListener("click", (e) => {
    handleTranslate();
  });
  document
    .getElementById("generate-quiz-btn")
    .addEventListener("click", (e) => {
      handleGenerateQuiz(ocr_mode);
    });
  document.addEventListener("keydown", async (event) => {
    if (event.key == "F11") {
      event.preventDefault();
      const isFullScreen = await getCurrentWindow().isFullscreen();
      await getCurrentWindow().setFullscreen(!isFullScreen);
    }
  });

  const header = document.querySelector("header"); // or whatever selector
  const headerHeight = header.offsetHeight; // includes padding+border
  // store it in CSS var so CSS can use it
  document.documentElement.style.setProperty(
    "--header-height",
    `${headerHeight}px`
  );
  let companionButton = document.getElementById("companion-button");
  companionButton.addEventListener("click", () => {
    toggleCompanionPanel();
  });

  window.addEventListener("resize", () => {
    redrawPages();
  });
  document
    .querySelector("#pdf-container")
    .addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const pageElement = e.target.closest("[data-page-number]");
      if (pageElement) {
        let pageNumber = Number(pageElement.getAttribute("data-page-number"));
        setPageNumber(pageNumber);
        const menu = document.getElementById("page-context-menu");
        menu.style.visibility = "visible";
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
      } else {
        console.warn("Could not find page element for selection!");
      }
    });
  document.querySelector("#pdf-container").addEventListener("click", (e) => {
    const menu = document.getElementById("page-context-menu");
    menu.style.visibility = "hidden";
  });
  document
    .getElementById("generate-summary-btn")
    .addEventListener("click", () => {
      handleSummarize(ocr_mode);
    });
});
