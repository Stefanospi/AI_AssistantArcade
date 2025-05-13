import { updateSelectedTool } from "./main.js"; // Assuming main.js exports this

export function initializeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toolButtons = sidebar.querySelectorAll(".tool-button");

  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      toolButtons.forEach((btn) => btn.classList.remove("active"));
      // Add active class to the clicked button
      button.classList.add("active");

      const toolType = button.dataset.tool;
      const toolName = button.textContent;
      updateSelectedTool(toolType, toolName);
    });
  });
}
