import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import "/dark-mode.css";
import { db, auth } from "./firebaseConfig.js";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const q = query(collection(db, "scores"), orderBy("totalScore", "desc"), limit(10));

onSnapshot(q, (snap) => {
    const list = document.getElementById("leaderboard-list");
    const status = document.getElementById("leaderboard-status");
    list.innerHTML = "";

    if (snap.empty) {
        status.textContent = "No scores yet. Play a quiz!";
        return;
    }
    status.textContent = "";

    let rank = 0;
    snap.forEach((d) => {
        const p = d.data();
        const li = document.createElement("li");
        li.className = "list-group-item d-flex align-items-center gap-3 py-3";
        if (rank === 0) li.classList.add("list-group-item-warning");
        rank++;

        const nameWrap = document.createElement("div");
        nameWrap.className = "flex-grow-1";
        const name = document.createElement("strong");
        name.textContent = (p.name || "Guest") + (d.id === auth.currentUser?.uid ? " (You)" : "");
        nameWrap.appendChild(name);

        const games = document.createElement("span");
        games.className = "text-body-secondary small ms-2";
        games.textContent = `${p.gamesPlayed || 0} games`;
        nameWrap.appendChild(games);

        const score = document.createElement("span");
        score.className = "badge text-bg-primary rounded-pill";
        score.textContent = `${p.totalScore || 0} pts`;

        li.append(nameWrap, score);
        list.appendChild(li);
    });
});

// Initial page state
setEditing(false);

savedData = getProfileData();
// Check if Dark Mode was saved
function applyDarkMode() {
    const enabled = localStorage.getItem("darkMode") === "true";

    // Turn Dark Mode on or off
    document.body.classList.toggle("dark-mode", enabled);
}

// Apply Dark Mode when the page opens
applyDarkMode();
