import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import "/dark-mode.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import { onAuthReady } from "/src/authentication.js";

function localName() {
  return new Promise((resolve) => {
    onAuthReady(function (user) {
      resolve(user.displayName || user.email);
    });
  });
}

function addMessage(username, content) {
  const message = document.createElement("div");
  message.className = "bg-body-tertiary border rounded-3 p-3 mb-2";

  const name = document.createElement("div");
  name.className = "fw-bold small text-primary mb-1";
  name.textContent = username;

  const text = document.createElement("div");
  text.className = "fs-6 lh-sm text-break m-0 p-0";
  text.textContent = content;

  message.append(name, text);

  const messages = document.getElementById("chatMessages");
  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
}
document.getElementById("chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = document.getElementById("chatInput").value.trim();
    if (!content) return;
    addMessage(await localName(),content)
    document.getElementById("chatInput").value = "";
});
