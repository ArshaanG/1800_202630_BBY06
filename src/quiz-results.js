import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot } from "firebase/firestore";

const roomCode = new URLSearchParams(window.location.search).get("roomCode");
const myId = sessionStorage.getItem("playerId");

const list = document.getElementById("results-list");
const status = document.getElementById("results-status");
const actions = document.getElementById("results-actions");

onSnapshot(doc(db, "rooms", roomCode), (snap) => {
    if (!snap.exists()) {
        status.textContent = "This room is gone.";
        list.hidden = true;
        return;
    }

    const data = snap.data();
    const total = data.quiz?.questions?.length || 0;
    const players = Object.entries(data.players || {});
    const finishedCount = players.filter(([, p]) => p.finished).length;

    if (finishedCount < players.length) {
        status.textContent = `Waiting for everyone to finish... (${finishedCount}/${players.length})`;
        list.hidden = true;
        actions.hidden = true;
        return;
    }

    players.sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));
    status.textContent = `${players[0][1].name || "N/A"} wins the race!`;
    list.innerHTML = "";

    players.forEach(([id, p], i) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex align-items-center gap-3 py-3";
        if (i === 0) li.classList.add("list-group-item-warning");

        const nameWrap = document.createElement("div");
        nameWrap.className = "flex-grow-1";

        const name = document.createElement("strong");
        name.textContent = (p.name || "Guest") + (id === myId ? " (You)" : "");
        nameWrap.appendChild(name);

        if (i === 0) {
            const badge = document.createElement("span");
            badge.className = "badge text-bg-dark ms-2";
            badge.textContent = "Winner";
            nameWrap.appendChild(badge);
        }

        const score = document.createElement("span");
        score.className = "badge text-bg-primary rounded-pill";
        score.textContent = total ? `${p.score || 0} / ${total}` : `${p.score || 0} pts`;

        li.append(nameWrap, score);
        list.appendChild(li);
    });

    list.hidden = false;
    actions.hidden = false;
});