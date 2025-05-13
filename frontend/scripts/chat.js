// /frontend/scripts/chat.js

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------
const BACKEND_URL = "http://localhost:8001";

// -----------------------------------------------------------------------------
// DOM ELEMENTS
// -----------------------------------------------------------------------------
const chatOutput = document.getElementById("chat-output");

if (!chatOutput) {
  console.error(
    "Fatal Error: Chat output element with ID 'chat-output' not found in the DOM."
  );
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Formats code blocks with syntax highlighting and copy button
 */
function formatCodeBlock(code, language = "") {
  const escapedCode = escapeHtml(code);
  const codeId = "code-" + Math.random().toString(36).substr(2, 9);

  return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-language">${language || "CODE"}</span>
        <button class="copy-button" onclick="copyCode('${codeId}')">COPY</button>
      </div>
      <pre class="code-content" id="${codeId}"><code>${escapedCode}</code></pre>
    </div>
  `;
}

/**
 * Simple markdown parser for chat messages
 */
function parseMarkdown(text) {
  // Escape HTML first
  let html = escapeHtml(text);

  // Code blocks (```language\ncode\n```)
  html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return formatCodeBlock(code.trim(), lang.trim());
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic (*text*)
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Headers (### Header)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Lists (- item)
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // Line breaks (two spaces at end of line)
  html = html.replace(/  \n/g, "<br>");

  // Paragraphs (double line breaks)
  html = html.replace(/\n\n/g, "</p><p>");
  html = "<p>" + html + "</p>";

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");

  return html;
}

// Make copyCode function globally available
window.copyCode = function (codeId) {
  const codeElement = document.getElementById(codeId);
  const text = codeElement.textContent;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      const button = codeElement.parentElement.querySelector(".copy-button");
      const originalText = button.textContent;
      button.textContent = "COPIED ✓";
      button.classList.add("copied");

      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("copied");
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
    });
};

// -----------------------------------------------------------------------------
// API COMMUNICATION
// -----------------------------------------------------------------------------

/**
 * Sends a message to the AI backend with optional file attachments.
 */
export async function sendMessageToAI(
  message,
  tool_type,
  session_id,
  files = []
) {
  try {
    console.log("=== SENDING REQUEST TO AI ===");
    console.log("Endpoint:", `${BACKEND_URL}/ai/chat`);
    console.log("Message:", message);
    console.log("Tool type:", tool_type);
    console.log("Session ID:", session_id);
    console.log("Files count:", files.length);

    let headers = {};
    let body;

    // Se abbiamo file, usa FormData
    if (files.length > 0) {
      console.log("Creating FormData with files");
      const formData = new FormData();

      const requestData = {
        message: message,
        tool_type: tool_type,
        context: [],
      };

      if (session_id) {
        requestData.session_id = session_id;
      }

      // Aggiungi i dati JSON come string
      formData.append("data", JSON.stringify(requestData));
      console.log("Request data:", requestData);

      // Aggiungi ogni file
      for (let i = 0; i < files.length; i++) {
        console.log(
          `Adding file ${i + 1}: ${files[i].name} (${files[i].size} bytes)`
        );
        formData.append("files", files[i], files[i].name);
      }

      body = formData;
      // Non impostare Content-Type per FormData, il browser lo farà automaticamente
    } else {
      // Se non ci sono file, usa JSON normale
      console.log("Creating JSON request (no files)");
      const requestData = {
        message: message,
        tool_type: tool_type,
        context: [],
      };

      if (session_id) {
        requestData.session_id = session_id;
      }

      headers["Content-Type"] = "application/json";
      body = JSON.stringify(requestData);
      console.log("Request body:", body);
    }

    console.log("Sending fetch request...");
    const response = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: "POST",
      headers: headers,
      body: body,
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (!response.ok) {
      let errorDetail = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error("Error response data:", errorData);

        if (errorData && errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorDetail = `Error ${response.status}: ${errorData.detail
              .map((e) => e.msg || e)
              .join(", ")}`;
          } else {
            errorDetail = `Error ${response.status}: ${errorData.detail}`;
          }
        }
      } catch (e) {
        console.error("Failed to parse error response:", e);
        errorDetail = `HTTP error! status: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    const responseData = await response.json();
    console.log("Response data:", responseData);

    return responseData;
  } catch (error) {
    console.error("=== ERROR IN sendMessageToAI ===");
    console.error("Error:", error);
    console.error("Stack trace:", error.stack);

    return {
      response: "",
      tool_type: tool_type,
      session_id: session_id,
      error: error.message || "A network error occurred.",
    };
  }
}

// -----------------------------------------------------------------------------
// UI UPDATES
// -----------------------------------------------------------------------------

/**
 * Displays a message in the chat output area with proper formatting.
 */
export function displayMessage(role, content) {
  if (!chatOutput) {
    console.error(
      "Cannot display message: chatOutput element is not available."
    );
    return;
  }

  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  let roleDisplay = "Unknown";
  let roleClass = "";

  switch (role.toLowerCase()) {
    case "user":
      roleDisplay = "User";
      roleClass = "user-message";
      break;
    case "assistant":
      roleDisplay = "AI System";
      roleClass = "assistant-message";
      break;
    case "system":
      roleDisplay = "System";
      roleClass = "system-message";
      break;
    case "error":
      roleDisplay = "Error";
      roleClass = "error-message";
      break;
    default:
      roleDisplay = "System";
      roleClass = "system-message";
      break;
  }
  messageElement.classList.add(roleClass);

  const roleSpan = document.createElement("span");
  roleSpan.classList.add("role");
  roleSpan.textContent = `${roleDisplay}:`;

  const contentDiv = document.createElement("div");
  contentDiv.classList.add("content");

  // Apply markdown parsing for assistant messages
  if (role.toLowerCase() === "assistant") {
    contentDiv.innerHTML = parseMarkdown(content);
  } else if (role.toLowerCase() === "user") {
    // For user messages, just escape HTML but preserve line breaks
    contentDiv.innerHTML = escapeHtml(content).replace(/\n/g, "<br>");
  } else {
    // For system and error messages, just escape HTML
    contentDiv.innerHTML = escapeHtml(content);
  }

  messageElement.appendChild(roleSpan);
  messageElement.appendChild(contentDiv);

  // Add entrance animation
  messageElement.style.opacity = "0";
  messageElement.style.transform = "translateY(10px)";

  chatOutput.appendChild(messageElement);

  // Trigger animation
  setTimeout(() => {
    messageElement.style.transition = "all 0.3s ease-out";
    messageElement.style.opacity = "1";
    messageElement.style.transform = "translateY(0)";
  }, 10);

  // Auto-scroll to the bottom of the chat
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

export function clearChat() {
  if (chatOutput) {
    chatOutput.innerHTML = "";
  }
}
