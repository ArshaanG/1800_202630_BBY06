
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "/dark-mode.css";

// Get all the switches
const notificationsToggle =
    document.getElementById("notificationsToggle");

const soundToggle =
    document.getElementById("soundToggle");

const darkModeToggle =
    document.getElementById("darkModeToggle");

// Get the message element
const settingsMessage =
    document.getElementById("settingsMessage");

// Load saved preferences
if (notificationsToggle) {
    notificationsToggle.checked =
        localStorage.getItem("notifications") !== "false";
}

if (soundToggle) {
    soundToggle.checked =
        localStorage.getItem("sound") !== "false";
}

if (darkModeToggle) {
    darkModeToggle.checked =
        localStorage.getItem("darkMode") === "true";
}

// Apply saved dark mode
function applyDarkMode() {
    const enabled = localStorage.getItem("darkMode") === "true";

    document.body.classList.toggle("dark-mode", enabled);
}

// Apply when page loads
applyDarkMode();

// Save notification preference
if (notificationsToggle) {
    notificationsToggle.addEventListener("change", function () {
        localStorage.setItem(
            "notifications",
            notificationsToggle.checked
        );

        settingsMessage.textContent =
            "Notification preference saved.";
    });
}

// Save sound preference
if (soundToggle) {
    soundToggle.addEventListener("change", function () {
        localStorage.setItem(
            "sound",
            soundToggle.checked
        );

        settingsMessage.textContent =
            "Sound preference saved.";
    });
}

// Change appearance
if (darkModeToggle) {
    darkModeToggle.addEventListener("change", function () {
        localStorage.setItem(
            "darkMode",
            darkModeToggle.checked
        );

        applyDarkMode();

        settingsMessage.textContent =
            "Appearance preference saved.";
    });
}
