import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "/dark-mode.css";
//--------------------------------------------------------------
// If you have custom global styles, import them as well:
//--------------------------------------------------------------
import "/src/styles/style.css";

//--------------------------------------------------------------
// Custom global JS code (shared with all pages)can go here.
//--------------------------------------------------------------

// This is an example function. Replace it with your own logic.
function sayHello() {
  // TODO: implement your logic here
}
document.addEventListener("DOMContentLoaded", sayHello);
function applyDarkMode() {
  const enabled = localStorage.getItem("darkMode") === "true";

  document.body.classList.toggle("dark-mode", enabled);
}

applyDarkMode();
