import { open } from "@tauri-apps/plugin-dialog";
import {
  readFile,
  writeFile,
  copyFile,
  BaseDirectory,
  mkdir,
  exists,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { getPDFCover, loadPDF } from "./pdf_handler";
import { getCurrentWindow } from "@tauri-apps/api/window";

async function addPDFToLibrary(filePath) {
  try {
    const fileName = await path.basename(filePath);
    if (!(await exists("", { baseDir: BaseDirectory.AppData }))) {
      await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
    }
    if (await exists(fileName, { baseDir: BaseDirectory.AppData })) {
      return;
    }
    await copyFile(filePath, fileName, {
      toPathBaseDir: BaseDirectory.AppData,
    });
    const pdf_cover = await getPDFCover(fileName);
    const title = fileName.replace(/\.pdf$/, "");
    const thumbnailName = `${title}.png`;
    await writeFile(thumbnailName, new Uint8Array(pdf_cover), {
      baseDir: BaseDirectory.AppData,
    });
    const jsonPath = "library.json";
    let library = { books: [] };
    if (await exists(jsonPath, { baseDir: BaseDirectory.AppData })) {
      const jsonContent = await readTextFile(jsonPath, {
        baseDir: BaseDirectory.AppData,
      });
      library = JSON.parse(jsonContent);
    }
    library.books.push({
      filename: fileName,
      title: title,
      thumbnail: thumbnailName,
    });
    await writeTextFile(jsonPath, JSON.stringify(library), {
      baseDir: BaseDirectory.AppData,
    });
    addBookToPage(
      {
        filename: fileName,
        title: title,
        thumbnail: thumbnailName,
      },
      document.getElementById("books-container")
    );
  } catch (err) {
    console.error(err);
  }
}

async function addBookToPage(book, container) {
  const bookDiv = document.createElement("div");
  bookDiv.id = "library-div";
  bookDiv.className =
    "bg-white dark:bg-gray-700 p-4 w-48 rounded-xl shadow-lg flex flex-col items-center justify-center text-center hover:shadow-xl hover:scale-105 transition-transform duration-100";
  bookDiv.addEventListener("click", () => {
    const params = {
      filename: book.filename,
      title: book.title,
    };
    document.getElementById("library-view").classList.add("hidden");
    document.getElementById("pdf-study-view").classList.remove("hidden");
    loadPDF(params);
  });
  const img = document.createElement("img");
  img.className = "mb-3 object-cover rounded";
  const thumbnailContent = await readFile(book.thumbnail, {
    baseDir: BaseDirectory.AppData,
  });
  const blob = new Blob([thumbnailContent], { type: "image/png" });
  img.src = URL.createObjectURL(blob);
  const titleP = document.createElement("p");
  titleP.className =
    "font-semibold text-sm text-gray-700 dark:text-white line-clamp-3 w-full overflow-hidden";
  titleP.textContent = book.title;
  bookDiv.append(img, titleP);
  container.append(bookDiv);
}

async function loadLibrary() {
  try {
    const jsonPath = "library.json";
    if (!(await exists(jsonPath, { baseDir: BaseDirectory.AppData }))) return;
    const jsonContent = await readTextFile(jsonPath, {
      baseDir: BaseDirectory.AppData,
    });
    const library = JSON.parse(jsonContent);
    const container = document.getElementById("books-container");
    container.innerHTML = "";
    for (const book of library.books) {
      addBookToPage(book, container);
    }
  } catch (err) {
    console.error(err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadLibrary();

  document
    .getElementById("upload-pdf-btn")
    .addEventListener("click", async () => {
      const filePath = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (filePath) {
        // User chose a PDF
        addPDFToLibrary(filePath);
      }
    });

  document.addEventListener("keydown", async (event) => {
    if (event.key == "F11") {
      event.preventDefault();
      const isFullScreen = await getCurrentWindow().isFullscreen();
      await getCurrentWindow().setFullscreen(!isFullScreen);
    }
  });
});
