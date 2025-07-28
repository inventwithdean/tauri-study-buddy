let theme = localStorage.getItem("theme") || "light";
if (theme == "dark") {
  document.documentElement.classList.toggle("dark");
}

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    btn.textContent = theme == "light" ? "☀️" : "🌑";
    btn.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
      theme = theme == "light" ? "dark" : "light";
      localStorage.setItem("theme", theme);
      document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
        btn.textContent = theme == "light" ? "☀️" : "🌑";
      });
      let pdfContainer = document.getElementById("pdf-container");
      if (theme == "dark") {
        pdfContainer.style.filter =
          "invert(64%) contrast(228%) brightness(80%) hue-rotate(180deg)";
      } else {
        pdfContainer.style.filter = "";
      }
    });
  });
});
