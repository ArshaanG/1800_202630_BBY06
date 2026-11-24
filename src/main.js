import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import "/dark-mode.css";  
// Import the file that has the authentication helper function we want to use.
// The function we want to use is called "onAuthReady" which returns the login state
import { onAuthReady } from "/src/authentication.js";
import { db } from "./firebaseConfig.js";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

function showName() {
    // Pass a CALLBACK function to run when Firebase finishes checking login status
    onAuthReady(function(user) {  // Firebase passes the user object (or null)
        if (user) {
            // User is logged in
            const name = user.displayName || user.email;  // Use email if name is missing
            const nameElement = document.getElementById("name-goes-here");
            if (nameElement) nameElement.textContent = name + "!";
        } else {
            console.log("User is not logged in.");
        }
    });
}
// document.addEventListener('DOMContentLoaded', sayHello);
showName()


// list the user's saved quizzes
onAuthReady(async (user) => {
    const list = document.getElementById("saved-quizzes");
    if (!user || !list) return;

    try {
        const snap = await getDocs(
            query(collection(db, "users", user.uid, "quizzes"), orderBy("createdAt", "desc"))
        );

        if (snap.empty) {
            list.innerHTML = '<li class="list-group-item text-body-secondary">No saved quizzes yet.</li>';
            return;
        }

        snap.forEach((d) => {
            const li = document.createElement("li");
            li.className = "list-group-item list-group-item-action";
            li.style.cursor = "pointer";
            li.textContent = `${d.data().title} (${d.data().quiz?.questions?.length || 0} questions)`;
            li.addEventListener("click", () => {
                sessionStorage.setItem("pendingQuizId", d.id);
                window.location.href = "/rooms.html";
            });
            list.appendChild(li);
        });
    } catch (err) {
        console.error("Couldn't load saved quizzes", err);
        list.innerHTML = '<li class="list-group-item text-body-secondary">Couldn\'t load saved quizzes.</li>';
    }
});