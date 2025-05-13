// --- START OF FILE main.js ---

import { sendMessageToAI, displayMessage, clearChat } from "./chat.js";
import { initializeSidebar } from "./sidebar.js";

// --- Global State ---
export let currentToolType = "ask_assistant"; // Default tool
export let currentSessionId = null;
let attachedFiles = []; // Track attached files
let isSending = false; // Flag per prevenire invii multipli

// --- DOM Elements ---
const chatOutput = document.getElementById("chat-output");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const currentToolDisplay = document.getElementById("current-tool-display");
const fileInput = document.getElementById("file-input");
const uploadButton = document.getElementById("upload-button");
const fileList = document.getElementById("file-list");
const newSessionButton = document.getElementById("new-session-button");
const clearChatButton = document.getElementById("clear-chat-button");

// --- Event Listeners ---
sendButton.addEventListener("click", handleSendMessage);
uploadButton.addEventListener("click", () => {
  if (!uploadButton.disabled) {
    // Controlla se il bottone è abilitato
    fileInput.click();
  }
});
fileInput.addEventListener("change", handleFileUpload);
newSessionButton.addEventListener("click", startNewSession);
clearChatButton.addEventListener("click", clearChatDisplay);

// Handle Enter vs Shift+Enter
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // Prevent default new line
    handleSendMessage();
  }
});

// --- Functions ---
function startNewSession() {
  currentSessionId = null;
  attachedFiles = []; // Svuota anche i file allegati per la nuova sessione
  fileList.innerHTML = ""; // Pulisci la lista file UI
  clearChat(); // Pulisci l'output della chat
  displayMessage("system", "NEW SESSION STARTED. MEMORY CLEARED.");
  console.log("New session started. Session ID and attached files cleared.");
}

function clearChatDisplay() {
  clearChat();
  // Non svuotare i file qui, l'utente potrebbe volerli inviare dopo aver pulito lo schermo
  displayMessage(
    "assistant",
    "WELCOME, PLAYER! INSERT COIN (TYPE MESSAGE) TO START."
  );
  console.log("Chat display cleared.");
}

async function handleFileUpload(event) {
  if (isSending) {
    // Non permettere upload se un invio è in corso
    console.log("Upload bloccato: invio in corso.");
    return;
  }
  const files = Array.from(event.target.files);
  console.log(`Uploading ${files.length} files`);

  for (const file of files) {
    console.log(
      `File added: ${file.name}, Size: ${file.size}, Type: ${file.type}`
    );
    // Aggiungi solo se non già presente (controllo base sul nome)
    if (
      !attachedFiles.some((f) => f.name === file.name && f.size === file.size)
    ) {
      attachedFiles.push(file);
      displayFile(file);
    } else {
      console.log(`File ${file.name} già presente, non aggiunto di nuovo.`);
    }
  }
  // Reset file input per permettere di selezionare lo stesso file di nuovo se rimosso
  fileInput.value = "";
}

function displayFile(file) {
  const fileItem = document.createElement("div");
  fileItem.className = "file-item";
  fileItem.dataset.fileName = file.name; // Aggiungi data attribute per rimozione

  const fileIcon = document.createElement("span");
  fileIcon.className = "file-icon";
  fileIcon.textContent = "📄";

  const fileName = document.createElement("span");
  fileName.className = "file-name";
  fileName.textContent = file.name;

  const fileSize = document.createElement("span");
  fileSize.className = "file-size";
  fileSize.textContent = formatFileSize(file.size);

  const removeBtn = document.createElement("span");
  removeBtn.textContent = "✕";
  removeBtn.className = "remove";
  removeBtn.onclick = () => removeFile(file, fileItem);

  fileItem.appendChild(fileIcon);
  fileItem.appendChild(fileName);
  fileItem.appendChild(fileSize);
  fileItem.appendChild(removeBtn);
  fileList.appendChild(fileItem);

  fileItem.style.animation = "slideIn 0.3s ease-out";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function removeFile(fileToRemove, element) {
  console.log(`Attempting to remove file: ${fileToRemove.name}`);
  attachedFiles = attachedFiles.filter(
    (f) => f.name !== fileToRemove.name || f.size !== fileToRemove.size
  );
  element.style.animation = "slideOut 0.3s ease-out";
  setTimeout(() => element.remove(), 300);
  console.log(
    "Attached files after removal:",
    attachedFiles.map((f) => f.name)
  );
}

async function handleSendMessage() {
  if (isSending) {
    console.log("Invio già in corso, nuova richiesta ignorata.");
    return;
  }

  const messageText = chatInput.value.trim();
  if (!messageText && attachedFiles.length === 0) {
    console.log("Nessun messaggio e nessun file, invio annullato.");
    return;
  }

  console.log(
    `handleSendMessage chiamato. Messaggio: "${messageText}", File: ${attachedFiles.length}`
  );

  isSending = true;
  sendButton.disabled = true;
  chatInput.disabled = true;
  uploadButton.disabled = true;

  // Preserva il testo del messaggio e i file al momento dell'invio
  const currentMessageTextForSend = messageText;
  const currentFilesForSend = [...attachedFiles]; // Crea una copia per l'invio

  displayMessage("user", currentMessageTextForSend);

  if (currentFilesForSend.length > 0) {
    console.log(
      "File da inviare:",
      currentFilesForSend.map((f) => f.name)
    );
    const fileNames = currentFilesForSend
      .map((f) => `${f.name} (${formatFileSize(f.size)})`)
      .join(", ");
    displayMessage("system", `FILES ALLEGATI: ${fileNames}`); // Cambiato UPLOADED a ALLEGATI

    for (const file of currentFilesForSend) {
      console.log(
        `Dettaglio file per l'invio: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`
      );
    }
  }

  chatInput.value = ""; // Svuota l'input UI ora

  const loadingMessage = document.createElement("div");
  loadingMessage.classList.add("message", "assistant-message", "loading");
  loadingMessage.innerHTML = `
    <span class="role">AI System:</span>
    <div class="content">
      <div class="loading-container">
        <div class="loading-text">PROCESSING</div>
        <div class="loading-bar">
          <div class="loading-fill"></div>
        </div>
      </div>
    </div>
  `;
  chatOutput.appendChild(loadingMessage);
  chatOutput.scrollTop = chatOutput.scrollHeight;

  try {
    console.log(
      `Invio a sendMessageToAI con tool: ${currentToolType}, session: ${currentSessionId}, messaggio: "${currentMessageTextForSend}", files: ${currentFilesForSend.length}`
    );

    const aiResponse = await sendMessageToAI(
      currentMessageTextForSend,
      currentToolType,
      currentSessionId,
      currentFilesForSend // Invia la copia dei file
    );

    loadingMessage.remove();

    if (aiResponse.error) {
      console.error("AI Response Error:", aiResponse.error);
      displayMessage("error", `Error: ${aiResponse.error}`);
    } else {
      displayMessage("assistant", aiResponse.response);
      if (aiResponse.session_id && aiResponse.session_id !== currentSessionId) {
        currentSessionId = aiResponse.session_id;
        console.log("Session ID aggiornato dal backend:", currentSessionId);
      }
    }
  } catch (error) {
    console.error("Fallimento invio messaggio:", error);
    loadingMessage.remove();
    displayMessage(
      "error",
      "CONNECTION ERROR: Unable to reach AI backend. Check server status."
    );
  } finally {
    // Svuota i file *dopo* che la logica di invio è completata (successo o fallimento)
    // Questo previene che i file vengano inviati di nuovo se l'utente clicca invia rapidamente
    // o se c'è un invio accidentale con messaggio vuoto.
    attachedFiles = [];
    fileList.innerHTML = "";
    console.log("File allegati e lista UI svuotati in finally.");

    sendButton.disabled = false;
    chatInput.disabled = false;
    uploadButton.disabled = false;
    isSending = false;
    console.log(
      "Invio completato, controlli riabilitati, flag isSending resettato."
    );
    chatInput.focus(); // Riporta il focus all'input
  }
}

export function updateSelectedTool(toolType, toolName) {
  currentToolType = toolType;
  currentToolDisplay.textContent = `ACTIVE MODULE: ${toolName.toUpperCase()}`;
  console.log(
    `Tool cambiato a: ${toolType}. Session ID attuale: ${currentSessionId}`
  );
  displayMessage("system", `MODULE ACTIVATED: ${toolName.toUpperCase()}`);
}

document.addEventListener("DOMContentLoaded", () => {
  initializeSidebar();
  console.log("AI Assistant Arcade Frontend Initialized!");

  displayMessage("system", "SYSTEM BOOT SEQUENCE INITIATED...");
  setTimeout(() => {
    displayMessage(
      "assistant",
      "AI NEURAL NETWORK ONLINE. READY FOR INTERACTION."
    );
  }, 1000);

  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + "px";
  });

  // Add CSS animations (come prima, non modificato qui)
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(20px); } }
    .loading-container { display: flex; align-items: center; gap: 15px; }
    .loading-text { font-family: "VT323", monospace; font-size: 1.4em; color: #00d4ff; text-shadow: 0 0 10px #00d4ff; animation: pulse 1s ease-in-out infinite; }
    .loading-bar { width: 100px; height: 4px; background: rgba(0, 212, 255, 0.2); border-radius: 2px; overflow: hidden; position: relative; }
    .loading-fill { height: 100%; width: 30%; background: linear-gradient(90deg, #00d4ff, #00ff88); animation: loadingSlide 1.5s ease-in-out infinite; box-shadow: 0 0 10px #00d4ff; }
    @keyframes loadingSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
    .file-item { display: flex; align-items: center; gap: 8px; }
    .file-icon { font-size: 1.2em; }
    .file-name { flex-grow: 1; }
    .file-size { font-size: 0.9em; color: #00d4ff; opacity: 0.8; }
    /* Aggiungi stile per .remove se non presente in main.css */
    .remove { cursor: pointer; color: #ff007f; font-weight: bold; transition: all 0.2s ease; padding: 0 5px;}
    .remove:hover { color: #ff00ff; text-shadow: 0 0 5px #ff00ff; transform: scale(1.2); }
  `;
  document.head.appendChild(style);
});
// --- END OF FILE main.js ---
