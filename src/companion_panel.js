let companionButton = null;
let companionContainer = null;
let companionWindowVisible = false;

export function showCompanionTab(idToShow) {
  document.querySelectorAll(".companion-tab").forEach((el) => {
    el.classList.remove("flex");
    el.classList.add("hidden");
  });
  const tabToShow = document.getElementById(idToShow);
  if (!companionWindowVisible) toggleCompanionPanel();
  if (tabToShow) {
    tabToShow.classList.remove("hidden");
    tabToShow.classList.add("flex");
  }
}

export function toggleCompanionPanel() {
  if (!companionButton)
    companionButton = document.getElementById("companion-button");
  if (!companionContainer)
    companionContainer = document.getElementById("companion-container");
  companionWindowVisible = !companionWindowVisible;
  if (companionWindowVisible) {
    companionContainer.classList.remove("hidden");
    companionContainer.classList.add("flex");
  } else {
    companionContainer.classList.remove("flex");
    companionContainer.classList.add("hidden");
  }
}
