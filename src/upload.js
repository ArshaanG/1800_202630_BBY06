
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
const uploadButton = document.getElementById("uploadButton");
const browseButton = document.getElementById("browseButton");
const dropArea = document.getElementById("dropArea");
const fileList = document.getElementById("fileList");
const searchInput = document.getElementById("searchInput");
const uploadStatus = document.getElementById("uploadStatus");
const fileCount = document.getElementById("fileCount");
const userName = document.getElementById("userName");
const uploadDone = document.getElementById("uploadDone");
const uploadedFileName = document.getElementById("uploadedFileName");
const goToQuizButton = document.getElementById("goToQuizButton");
const backToDocumentsButton = document.getElementById("backToDocumentsButton");

let currentUser = null;
let documents = [];
let currentView = "documents";

const MAX_FILE_SIZE = 500 * 1024;


// Check login
onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    currentUser = user;

    userName.textContent =
        user.displayName || user.email;

    await loadDocuments();

});


// Open file picker
uploadButton.addEventListener("click", () => {
    pdfInput.click();
});

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


// Convert PDF into Base64
function convertToBase64(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.readAsDataURL(file);

        reader.onload = () => {

            const base64Data = reader.result.split(",")[1];

            resolve(base64Data);

        };

        reader.onerror = () => {
            reject(new Error("Could not read PDF."));
        };

    });

}


// Handle multiple files
async function handleFiles(files) {

    if (!currentUser) return;

    for (const file of files) {

        try {

            if (!(await isValidPDF(file))) {

                uploadStatus.textContent =
                    `${file.name}: Only valid PDF files are allowed.`;

                continue;
            }

            if (file.size > MAX_FILE_SIZE) {

                uploadStatus.textContent =
                    `${file.name}: File exceeds the 500 KB limit.`;

                continue;
            }

            await uploadPDF(file);

        } catch (error) {

            console.error(error);

            uploadStatus.textContent =
                `Upload failed: ${file.name}: ${error.message}`;

        }

    }

    await loadDocuments();

}

function showUploadDone(fileName) {

    // Hide the upload dashboard
    document.querySelector(".dashboard").hidden = true;

    // Hide the footer
    document.querySelector("site-footer").hidden = true;

    // Show the success section
    uploadDone.hidden = false;

    // Display uploaded file name
    uploadedFileName.textContent = `Uploaded file: ${fileName}`;

}

// Upload PDF directly into Firestore
async function uploadPDF(file) {

    uploadStatus.textContent =
        `Saving ${file.name}...`;

    // Convert the PDF into Base64
    const base64Data = await convertToBase64(file);

    // Save PDF and information in Firestore
    await addDoc(
        collection(db, "users", currentUser.uid, "pdfs"),
        {
            fileName: file.name,
            fileSize: file.size,
            fileType: "application/pdf",

            fileData: base64Data,

            uploadedBy: currentUser.uid,
            createdAt: serverTimestamp(),

            isStarred: false
        }
    );

    uploadStatus.textContent =
    `${file.name} saved successfully!`;

showUploadDone(file.name);

}


// Load documents from Firestore
async function loadDocuments() {

    if (!currentUser) return;

    const pdfCollection =
        collection(db, "users", currentUser.uid, "pdfs");

    const pdfQuery = query(
        pdfCollection,
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(pdfQuery);

    documents = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
    }));

    displayDocuments(documents);

}


// Display documents
function displayDocuments(files) {

    fileList.replaceChildren();

    fileCount.textContent =
        `${files.length} documents`;

    if (files.length === 0) {

        fileList.innerHTML =
            '<p class="empty-message">No PDF documents found.</p>';

        return;
    }

    files.forEach((file) => {

        const row = document.createElement("div");
        row.className = "file-row";

        const name = document.createElement("div");
        name.className = "file-name";

        const icon = document.createElement("span");
        icon.className = "pdf-icon";
        icon.textContent = "▤";

        const fileName = document.createElement("span");
        fileName.textContent = file.fileName;

        name.append(icon, fileName);

        const size = document.createElement("span");
        size.textContent = formatFileSize(file.fileSize);

        const date = document.createElement("span");

        date.textContent = file.createdAt
            ? file.createdAt.toDate().toLocaleDateString()
            : "Just uploaded";

        const actions = document.createElement("div");
        actions.className = "file-actions";

        // Preview
        const preview = document.createElement("button");
        preview.textContent = "Preview";

        preview.addEventListener("click", () => {
            previewPDF(file);
        });

        // Download
        const download = document.createElement("button");
        download.textContent = "Download";

        download.addEventListener("click", () => {
            downloadPDF(file);
        });

        // Star
        const star = document.createElement("button");

        star.textContent = file.isStarred
            ? "★ Starred"
            : "☆ Star";

        star.addEventListener("click", () => {
            toggleStar(file);
        });

        // Delete
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deletePDF(file);
        });

        actions.append(preview, download, star, deleteButton);

        row.append(name, size, date, actions);

        fileList.appendChild(row);

    });

}


// Convert Base64 back into a PDF Blob
function createPDFBlob(file) {

    const binary = atob(file.fileData);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], {
        type: "application/pdf"
    });

}


// Preview PDF
function previewPDF(file) {

    const blob = createPDFBlob(file);

    const url = URL.createObjectURL(blob);

    const previewWindow = window.open(url, "_blank");

    if (!previewWindow) {
        URL.revokeObjectURL(url);
        alert("Please allow pop-ups to preview PDFs.");
        return;
    }

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 60000);

}


// Download PDF
function downloadPDF(file) {

    const blob = createPDFBlob(file);

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = file.fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

}


// Star or unstar PDF
async function toggleStar(file) {

    try {

        await updateDoc(
            doc(db, "users", currentUser.uid, "pdfs", file.id),
            {
                isStarred: !file.isStarred
            }
        );

        await loadDocuments();

    } catch (error) {

        console.error(error);
        uploadStatus.textContent = "Could not update starred status.";

    }

}


// Delete PDF
async function deletePDF(file) {

    const confirmed = confirm(
        `Are you sure you want to delete ${file.fileName}?`
    );

    if (!confirmed) return;

    try {

        await deleteDoc(
            doc(db, "users", currentUser.uid, "pdfs", file.id)
        );

        uploadStatus.textContent =
            "Document deleted successfully.";

        await loadDocuments();

    } catch (error) {

        console.error(error);

        uploadStatus.textContent =
            "Could not delete document.";

    }

}


// Search documents
searchInput.addEventListener("input", () => {

    displayDocuments(getFilteredDocuments());

});


// Filter documents for sidebar
function getFilteredDocuments() {

    let filteredFiles = documents;

    if (currentView === "recent") {
        filteredFiles = documents.slice(0, 5);
    }

    if (currentView === "starred") {
        filteredFiles = documents.filter(
            (file) => file.isStarred
        );
    }

    const searchText = searchInput.value.toLowerCase();

    return filteredFiles.filter((file) =>
        file.fileName.toLowerCase().includes(searchText)
    );

}


// Sidebar navigation
document.querySelectorAll(".sidebar nav a").forEach((link) => {

    link.addEventListener("click", (event) => {

        const href = link.getAttribute("href");

        if (!["#", "#recent", "#files"].includes(href)) {
            return;
        }

        event.preventDefault();

        if (href === "#") {
            currentView = "documents";
        } else if (href === "#recent") {
            currentView = "recent";
        } else {
            currentView = "starred";
        }

        document.querySelectorAll(".sidebar nav a")
            .forEach((item) => item.classList.remove("active"));

        link.classList.add("active");

        const titles = {
            documents: "My Documents",
            recent: "Recent",
            starred: "Starred"
        };

        document.querySelector(".top-section h1").textContent =
            titles[currentView];

        document.querySelector(".section-heading h2").textContent =
            currentView === "documents"
                ? "All Documents"
                : titles[currentView];

        displayDocuments(getFilteredDocuments());

    });

});


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
    window.location.href = "/template.html";
});

// Return to documents
backToDocumentsButton.addEventListener("click", () => {

    uploadDone.hidden = true;

    document.querySelector(".dashboard").hidden = false;
    document.querySelector("site-footer").hidden = false;

});