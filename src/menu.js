
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "/dark-mode.css";
import { logoutUser } from "/src/authentication.js";

// Get the logout button
const logoutBtn = document.getElementById("logoutBtn");

// Logout functionality
logoutBtn.addEventListener("click", async function () {

    try {

        await logoutUser();

        // Redirect to login page
        window.location.href = "/login.html";

    } catch (error) {

        console.error("Logout error:", error);
        alert("Unable to log out. Please try again.");

    }

});
