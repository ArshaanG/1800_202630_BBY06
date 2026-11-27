
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "/dark-mode.css";
import { auth, db } from "./firebaseConfig.js";

import { onAuthStateChanged } from "firebase/auth";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp
} from "firebase/firestore";


// HTML elements
const pdfInput = document.getElementById("pdfInput");
//const uploadButton = document.getElementById("uploadButton");
const browseButton = document.getElementById("browseButton");
const dropArea = document.getElementById("dropArea");
const fileList = document.getElementById("fileList");
const searchInput = document.getElementById("searchInput");
const uploadStatus = document.getElementById("uploadStatus");
const fileCount = document.getElementById("fileCount");
//const userName = document.getElementById("userName");
const uploadDone = document.getElementById("uploadDone");
const uploadedFileName = document.getElementById("uploadedFileName");
const goToQuizButton = document.getElementById("goToQuizButton");
const backToDocumentsButton = document.getElementById("backToDocumentsButton");

let currentUser = null;
// let documents = [];
// let currentView = "documents";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

let currentUploadId = null;
let isUploading = false;


// Check login
onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    currentUser = user;

    // userName.textContent =
    //     user.displayName || user.email;

    //await loadDocuments();

});


// Open file picker
// uploadButton.addEventListener("click", () => {
//     pdfInput.click();
// });

browseButton.addEventListener("click", () => {
    pdfInput.click();
});


// Detect when the user selects PDF files
pdfInput.addEventListener("change", async (event) => {

    const selectedFiles = event.target.files;

    if (!selectedFiles || selectedFiles.length === 0) {
        return;
    }

    // Upload the selected files
    await handleFiles(selectedFiles);

    // Reset input so the same PDF can be selected again
    pdfInput.value = "";

});



// Validate PDF
async function isValidPDF(file) {

    if (
        file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        return false;
    }

    const header = await file.slice(0, 5).text();

    return header === "%PDF-";
}
async function handleFiles(files) {
    if (!currentUser || isUploading || files.length === 0) {
        return;
    }

    if (files.length !== 1) {
        uploadStatus.textContent = "Please upload one PDF at a time.";
        return;
    }

    const file = files[0];

    isUploading = true;
    //uploadButton.disabled = true;
    browseButton.disabled = true;

    try {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error("Please upload a PDF smaller than 10 MB.");
        }

        if (!(await isValidPDF(file))) {
            throw new Error("Only valid PDF files are allowed.");
        }

        await uploadPDF(file);
    } catch (error) {
        console.error(error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    } finally {
        isUploading = false;
        //uploadButton.disabled = false;
        browseButton.disabled = false;
    }
}

async function uploadPDF(file) {
    currentUploadId = null;
    uploadStatus.textContent = `Uploading ${file.name}...`;

    const formData = new FormData();
    formData.append("pdf", file);

    const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "The upload failed.");
    }

    if (!result.uploadId) {
        throw new Error("The server did not return an upload ID.");
    }

    currentUploadId = result.uploadId;
    pdfInput.dataset.uploadedFileName = file.name;
    uploadStatus.textContent = `${file.name} uploaded successfully!`;

    showUploadDone(file.name);
}



function showUploadDone(fileName) {

    // Hide the upload dropArea
    dropArea.hidden = true;

    // Hide the footer
    document.querySelector("site-footer").hidden = true;

    // Show the success section
    uploadDone.hidden = false;

    // Display uploaded file name
    uploadedFileName.textContent = `Uploaded file: ${fileName}`;

}

// Drag and drop
dropArea.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropArea.classList.add("drag-over");

});


dropArea.addEventListener("dragleave", () => {

    dropArea.classList.remove("drag-over");

});


dropArea.addEventListener("drop", async (event) => {

    event.preventDefault();

    dropArea.classList.remove("drag-over");

    await handleFiles(event.dataTransfer.files);

});


// Format file size
function formatFileSize(bytes) {

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";

}
// Go to Quiz page
goToQuizButton.addEventListener("click", () => {
    if (!currentUploadId) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("roomCode");

    if (!roomCode) {
        uploadStatus.textContent =
            "Room information is missing. Open Upload from Generation Settings.";
        return;
    }

    const storageKey = `quizGeneration:${roomCode}`;

    let draft = {};

    try {
        draft = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    } catch {
        draft = {};
    }

    draft.uploadId = currentUploadId;
    draft.fileName = pdfInput.dataset.uploadedFileName || "";

    sessionStorage.setItem(storageKey, JSON.stringify(draft));

    window.location.href =
        `/gen-settings.html?roomCode=${encodeURIComponent(roomCode)}`;
});

// Return to documents
// backToDocumentsButton.addEventListener("click", () => {

//     uploadDone.hidden = true;

//     document.querySelector(".dashboard").hidden = false;
//     document.querySelector("site-footer").hidden = false;

// });

function applyDarkMode() {
    const enabled = localStorage.getItem("darkMode") === "true";

    document.body.classList.toggle("dark-mode", enabled);
}

applyDarkMode();