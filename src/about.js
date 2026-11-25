
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "/dark-mode.css";
// Check if Dark Mode was saved
function applyDarkMode() {
    const enabled = localStorage.getItem("darkMode") === "true";

    // Turn Dark Mode on or off
    document.body.classList.toggle("dark-mode", enabled);
}

// Apply Dark Mode when the page opens
applyDarkMode();