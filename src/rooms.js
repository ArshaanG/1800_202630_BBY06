import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import "./styles/style.css";

let usedCodes = new Set();
let currentCode = null;

function generateRoomCode() {
    let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
    let code = "";

    do {
        code = "";
        for (let i=0; i<6; i++) {
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        }
    } while (usedCodes.has(code));

    usedCodes.add(code);
    return code;
}

function showLobby() {
    document.getElementById('home-screen').classList.add('d-none');
    document.getElementById('lobby-screen').classList.remove('d-none');
}

function showHome() {
    document.getElementById('lobby-screen').classList.add('d-none');
    document.getElementById('home-screen').classList.remove('d-none');
}

function createRoom() {
    currentCode = generateRoomCode();
    document.getElementById('room-code').textContent = currentCode;
    console.log("room created:", currentCode);
    showLobby();
}

function leaveRoom() {
    if (currentCode) {
        usedCodes.delete(currentCode);
        currentCode = null;
    }
    showHome();
}

function copyCode() {
    navigator.clipboard.writeText(currentCode);
}

document.getElementById('create-room-button').addEventListener('click', createRoom);
document.getElementById('leave-room-button').addEventListener('click', leaveRoom);
document.getElementById('copy-code-button').addEventListener('click', copyCode);