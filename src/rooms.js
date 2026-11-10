import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import "/dark-mode.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import "./styles/style.css";

import { auth } from "./firebaseConfig.js";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
    onSnapshot, deleteField, serverTimestamp
} from "firebase/firestore";

const app = getApps().length ? getApp() : initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

let currentCode = null;
let unsubscribe = null;

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
        const list = document.getElementById('player-list');
        list.innerHTML = '';
        Object.entries(data.players || {}).forEach(([id, player]) => {
            const li = document.createElement('li');
            let text = player?.name || "Guest";
            if (id === playerId) text += " (You)";
            if (id === data.hostId) text += " (Host)";
            li.textContent = text;
            list.appendChild(li);
        });
    });
}

async function createRoom() {
    currentCode = await generateRoomCode();
    await setDoc(doc(db, "rooms", currentCode), {
        createdAt: serverTimestamp(),
        hostId: playerId,
        players: { [playerId]: { name: getName() } }
    });
    document.getElementById('room-code').textContent = currentCode;
    updatePlayerList(currentCode);
    showLobby();
}

async function joinRoom() {
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();

    if (roomCode.length !== 6 || !/^[A-Z0-9]+$/.test(roomCode)) {
        alert("Invalid room code. Please enter a valid 6-character code.");
        return;
    }

    const ref = doc(db, "rooms", roomCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        alert("Room not found.");
        return;
    }

    await updateDoc(ref, { [`players.${playerId}`]: { name: getName() } });
    currentCode = roomCode;
    document.getElementById('room-code').textContent = roomCode;
    updatePlayerList(roomCode);
    showLobby();
}

async function leaveRoom() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    if (currentCode) {
        const ref = doc(db, "rooms", currentCode);
        currentCode = null;
        try {
            await updateDoc(ref, { [`players.${playerId}`]: deleteField() });
            const snap = await getDoc(ref);
            if (snap.exists() && Object.keys(snap.data().players || {}).length === 0) {
                await deleteDoc(ref);
            }
        } catch (e) {
            console.error("leave failed", e);
        }
    }
    showHome();
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