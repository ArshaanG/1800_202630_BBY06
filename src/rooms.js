import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import "/dark-mode.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import "./styles/style.css";

import { auth, db } from "./firebaseConfig.js";
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc, 
    onSnapshot, deleteField, serverTimestamp, runTransaction
} from "firebase/firestore";

let currentCode = null;
let unsubscribe = null;
let isReady = false;
const MAX_PLAYERS = 8;

let playerId = sessionStorage.getItem("playerId");
if (!playerId) {
    playerId = crypto.randomUUID();
    sessionStorage.setItem("playerId", playerId);
}

function getName() {
    const email = auth.currentUser?.email;
    return email ? email.split("@")[0] : "Guest";
}

async function generateRoomCode() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
    while (true) {
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        const snap = await getDoc(doc(db, "rooms", code));
        if (!snap.exists()) return code;
    }
}

function showLobby() {
    document.getElementById('home-screen').classList.add('d-none');
    document.getElementById('join-room-screen').classList.add('d-none');
    document.getElementById('lobby-screen').classList.remove('d-none');
}

function showHome() {
    document.getElementById('lobby-screen').classList.add('d-none');
    document.getElementById('join-room-screen').classList.add('d-none');
    document.getElementById('home-screen').classList.remove('d-none');
}

function showJoin() {
    document.getElementById('home-screen').classList.add('d-none');
    document.getElementById('join-room-screen').classList.remove('d-none');
}

function updatePlayerList(code) {
    unsubscribe = onSnapshot(doc(db, "rooms", code), (snap) => {
        if (!snap.exists()) {
            leaveRoom();
            return;
        }
        const data = snap.data();
        if (data.started) {
            window.location.href = `/template.html?roomCode=${encodeURIComponent(code)}`;
            return;
        }
        document.getElementById("gen-quiz-button").hidden =
        data.hostId !== playerId;
        if (data.quizStatus === "ready" && data.quiz) {
            window.location.href =
                `/template.html?roomCode=${encodeURIComponent(code)}`;
            return;
        }
        const list = document.getElementById('player-list');
        list.innerHTML = '';
        Object.entries(data.players || {})
        .sort(([idA], [idB]) => (idB === data.hostId) - (idA === data.hostId))
        .forEach(([id, player]) => {
            const allReady = Object.values(data.players || {}).every(p => p.ready);
            document.getElementById('start-quiz-button').disabled = (playerId !== data.hostId) || !allReady;
            const li = document.createElement('li');
            let text = player?.name || "Guest";
            if (id === playerId) text += " (You)";
            if (id === data.hostId) text += " (👑)";
            if (player?.ready) text += " (Ready)";
            li.textContent = text;
            list.appendChild(li);
        });
        isReady = !!data.players?.[playerId]?.ready;
        document.getElementById('ready-button').textContent = isReady ? "Unready" : "Ready";
    });
}

async function createRoom() {
    currentCode = await generateRoomCode();
    sessionStorage.setItem("currentRoomCode", currentCode);
    await setDoc(doc(db, "rooms", currentCode), {
        createdAt: serverTimestamp(),
        hostId: playerId,
        players: { [playerId]: { name: getName(), ready: false } }
    });
    document.getElementById('room-code').textContent = currentCode; 
    updatePlayerList(currentCode);
    showLobby();
}

async function startQuiz() {
    const button = document.getElementById('start-quiz-button');
    button.disabled = true;
    try {
        const ref = doc(db, "rooms", currentCode);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const data = snap.data();
        if (data.hostId !== playerId) {
            button.disabled = false;
            return alert("Only the host can start the quiz.");
        }

        const allReady = Object.values(data.players || {}).every(p => p.ready);
        if (!allReady) {
            button.disabled = false;
            return alert("All players must be ready to start the quiz.");
        }
        await updateDoc(ref, { started: true });
    } catch (err) {
        console.error("Failed to start quiz", err);
        button.disabled = false;
    }
}

/* uncomment this when quiz page redirection is setup
onSnapshot(doc(db, "rooms", currentCode), (snap) => {
    const data = snap.data();
    if (data?.status === "started") redirectToQuiz();
});

async function redirectToQuiz() {
    window.location.href = "/quiz.html";
}
*/

async function joinRoom() {
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();

    if (roomCode.length !== 6 || !/^[A-Z0-9]+$/.test(roomCode)) {
        alert("Invalid room code. Please enter a valid 6-character code.");
        return;
    }

    const ref = doc(db, "rooms", roomCode);

    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) throw new Error("Room not found.");
            const data = snap.data();
            const players = data.players || {};
            if (players[playerId]) return;
            if (data.started) throw new Error("Quiz has already started.");
            if (Object.keys(players).length >= MAX_PLAYERS) {
                throw new Error("Room is full.");
            }
            transaction.update(ref, {
                [`players.${playerId}`]: { name: getName(), ready: false }
            });
        });
    } catch (err) {
        return alert(err.message);
    }

    currentCode = roomCode;
    document.getElementById('room-code').textContent = currentCode;
    updatePlayerList(currentCode);
    showLobby();
}

async function leaveRoom() {
    sessionStorage.removeItem("currentRoomCode");
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    if (currentCode) {
        const ref = doc(db, "rooms", currentCode);
        currentCode = null;
        isReady = false;
        try {
            await updateDoc(ref, { [`players.${playerId}`]: deleteField() });
            const snap = await getDoc(ref);
            if (snap.exists() && Object.keys(snap.data().players || {}).length === 0) {
                await deleteDoc(ref);
            }
        } catch (err) {
            console.error("leave failed", err);
        }
    }
    showHome();
}

async function toggleReady() {
    if (!currentCode) return;
    await updateDoc(doc(db, "rooms", currentCode), {
        [`players.${playerId}.ready`]: !isReady
    });
}

function copyCode() {
    navigator.clipboard.writeText(document.getElementById('room-code').textContent);
}

document.getElementById('room-code-input').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById('create-room-button').addEventListener('click', createRoom);
document.getElementById('leave-room-button').addEventListener('click', leaveRoom);
document.getElementById('copy-code-button').addEventListener('click', copyCode);
document.getElementById('join-room-button').addEventListener('click', showJoin);
document.getElementById('join-room-submit').addEventListener('click', joinRoom);
document.getElementById('join-back-button').addEventListener('click', showHome);
document.getElementById('ready-button').addEventListener('click', toggleReady);
document.getElementById('start-quiz-button').addEventListener('click', startQuiz);
document.getElementById("gen-quiz-button").addEventListener("click", async () => {
    if (!currentCode) return;

    try {
        const snapshot = await getDoc(doc(db, "rooms", currentCode));

        if (!snapshot.exists() || snapshot.data().hostId !== playerId) {
            alert("Only the host can generate a quiz.");
            return;
        }

        sessionStorage.setItem("currentRoomCode", currentCode);
        window.location.href =`/gen-settings.html?roomCode=${encodeURIComponent(currentCode)}`;
    } catch (error) {
        console.error(error);
        alert("Could not check room ownership.");
    }
});
