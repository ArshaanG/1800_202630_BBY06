
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


// Get the HTML elements we need
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

// Store the current user and loaded documents
let currentUser = null;
// let documents = [];
// let currentView = "documents";

// Maximum PDF size is 500 KB
const MAX_FILE_SIZE = 500 * 1024;


// Check if the user is logged in
onAuthStateChanged(auth, async (user) => {

    // If nobody is logged in, go to the login page
    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    // Save the logged-in user
    currentUser = user;

    // Show the user's name or email
    userName.textContent = user.displayName || user.email;

    // Load the user's PDFs
    await loadDocuments();
});


// Open the file picker when either button is clicked
uploadButton.addEventListener("click", () => {
    pdfInput.click();
});

browseButton.addEventListener("click", () => {
    pdfInput.click();
});


// Run when the user selects files
pdfInput.addEventListener("change", async (event) => {

    const selectedFiles = event.target.files;

    // Stop if no files were selected
    if (!selectedFiles || selectedFiles.length === 0) {
        return;
    }

    // Upload the selected PDFs
    await handleFiles(selectedFiles);

    // Clear the input so the same file can be selected again
    pdfInput.value = "";
});


// Check if the selected file is a real PDF
async function isValidPDF(file) {

    // Check the file type and file name
    if (
        file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        return false;
    }

    // A real PDF starts with %PDF-
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

// Convert a PDF into Base64 so it can be saved in Firestore
function convertToBase64(file) {

        if (!(await isValidPDF(file))) {
            throw new Error("Only valid PDF files are allowed.");
        }

        await uploadPDF(file);
    } catch (error) {
        console.error(error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    } finally {
        isUploading = false;
        uploadButton.disabled = false;
        browseButton.disabled = false;
    }
}

        // Read the PDF
        reader.readAsDataURL(file);

        // Run when the file has been read
        reader.onload = () => {
            const base64Data = reader.result.split(",")[1];
            resolve(base64Data);
        };

        // Run if the file cannot be read
        reader.onerror = () => {
            reject(new Error("Could not read PDF."));
        };
    });
}


// Check and upload multiple selected files
async function handleFiles(files) {

    // Make sure a user is logged in
    if (!currentUser) return;

    // Go through each selected file
    for (const file of files) {

//         try {

            // Do not upload files that are not valid PDFs
            if (!(await isValidPDF(file))) {
                uploadStatus.textContent =
                    `${file.name}: Only valid PDF files are allowed.`;
                continue;
            }

            // Do not upload files larger than 500 KB
            if (file.size > MAX_FILE_SIZE) {
                uploadStatus.textContent =
                    `${file.name}: File exceeds the 500 KB limit.`;
                continue;
            }

            // Upload the valid PDF
            await uploadPDF(file);

//         } catch (error) {

//             console.error(error);

            uploadStatus.textContent =
                `Upload failed: ${file.name}: ${error.message}`;
        }
    }

    // Refresh the document list after uploading
    await loadDocuments();
}


// Show the upload success screen
function showUploadDone(fileName) {

    // Hide the document dashboard and footer
    document.querySelector(".dashboard").hidden = true;
    document.querySelector("site-footer").hidden = true;

    // Show the success message
    uploadDone.hidden = false;

    // Show the uploaded file name
    uploadedFileName.textContent = `Uploaded file: ${fileName}`;
}


// Save the PDF in Firestore
async function uploadPDF(file) {

    uploadStatus.textContent = `Saving ${file.name}...`;

//     // Convert the PDF into Base64
//     const base64Data = await convertToBase64(file);

    // Get the logged-in user's PDF collection
    const pdfCollection = collection(
        db,
        "users",
        currentUser.uid,
        "pdfs"
    );

    // Save the PDF and its information
    await addDoc(pdfCollection, {
        fileName: file.name,
        fileSize: file.size,
        fileType: "application/pdf",
        fileData: base64Data,
        uploadedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        isStarred: false
    });

    uploadStatus.textContent = `${file.name} saved successfully!`;

    // Show the success screen
    showUploadDone(file.name);
}


// Get all PDFs from the current user's Firestore collection
async function loadDocuments() {

//     if (!currentUser) return;

    const pdfCollection = collection(
        db,
        "users",
        currentUser.uid,
        "pdfs"
    );

    // Sort documents by upload date, newest first
    const pdfQuery = query(
        pdfCollection,
        orderBy("createdAt", "desc")
    );

//     const snapshot = await getDocs(pdfQuery);

    // Turn the Firestore results into a normal JavaScript array
    documents = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
    }));

    // Display the documents on the page
    displayDocuments(documents);
}


// Show the PDF documents on the page
function displayDocuments(files) {

    // Clear the old document list
    fileList.replaceChildren();

    // Update the number of documents
    fileCount.textContent = `${files.length} documents`;

    // Show a message if there are no documents
    if (files.length === 0) {
        fileList.innerHTML =
            '<p class="empty-message">No PDF documents found.</p>';
        return;
    }

    // Create a row for each PDF
    files.forEach((file) => {

//         const row = document.createElement("div");
//         row.className = "file-row";

        // Create the file name and PDF icon
        const name = document.createElement("div");
        name.className = "file-name";

//         const icon = document.createElement("span");
//         icon.className = "pdf-icon";
//         icon.textContent = "▤";

//         const fileName = document.createElement("span");
//         fileName.textContent = file.fileName;

//         name.append(icon, fileName);

        // Show the file size
        const size = document.createElement("span");
        size.textContent = formatFileSize(file.fileSize);

        // Show the upload date
        const date = document.createElement("span");

//         date.textContent = file.createdAt
//             ? file.createdAt.toDate().toLocaleDateString()
//             : "Just uploaded";

        // Create the area for the buttons
        const actions = document.createElement("div");
        actions.className = "file-actions";

        // Preview button
        const preview = document.createElement("button");
        preview.textContent = "Preview";

//         preview.addEventListener("click", () => {
//             previewPDF(file);
//         });

        // Download button
        const download = document.createElement("button");
        download.textContent = "Download";

//         download.addEventListener("click", () => {
//             downloadPDF(file);
//         });

        // Star button
        const star = document.createElement("button");

        star.textContent = file.isStarred ? "★ Starred" : "☆ Star";

//         star.addEventListener("click", () => {
//             toggleStar(file);
//         });

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

//         deleteButton.addEventListener("click", () => {
//             deletePDF(file);
//         });

        // Add all buttons to the actions area
        actions.append(preview, download, star, deleteButton);

        // Add everything to the document row
        row.append(name, size, date, actions);

        // Add the row to the page
        fileList.appendChild(row);
    });
}


// Convert the saved Base64 data back into a PDF
function createPDFBlob(file) {

    const binary = atob(file.fileData);
    const bytes = new Uint8Array(binary.length);

    // Convert each character into a byte
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    // Create a PDF Blob
    return new Blob([bytes], {
        type: "application/pdf"
    });
}


// Open a PDF in a new browser tab
function previewPDF(file) {

    const blob = createPDFBlob(file);
    const url = URL.createObjectURL(blob);

//     const previewWindow = window.open(url, "_blank");

    // Check if the browser blocked the new tab
    if (!previewWindow) {
        URL.revokeObjectURL(url);
        alert("Please allow pop-ups to preview PDFs.");
        return;
    }

    // Free the temporary URL after 60 seconds
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 60000);
}


// Download a PDF to the computer
function downloadPDF(file) {

    const blob = createPDFBlob(file);
    const url = URL.createObjectURL(blob);

    // Create a temporary download link
    const link = document.createElement("a");

//     link.href = url;
//     link.download = file.fileName;

    // Click the link to start the download
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Remove the temporary URL
    URL.revokeObjectURL(url);
}


// Star or unstar a PDF
async function toggleStar(file) {

//     try {

        // Find the PDF in Firestore and change its starred status
        await updateDoc(
            doc(db, "users", currentUser.uid, "pdfs", file.id),
            {
                isStarred: !file.isStarred
            }
        );

        // Refresh the list to show the change
        await loadDocuments();

//     } catch (error) {

        console.error(error);
        uploadStatus.textContent = "Could not update starred status.";
    }
}


// Delete a PDF
async function deletePDF(file) {

    // Ask the user before deleting
    const confirmed = confirm(
        `Are you sure you want to delete ${file.fileName}?`
    );

//     if (!confirmed) return;

//     try {

        // Delete the selected PDF from Firestore
        await deleteDoc(
            doc(db, "users", currentUser.uid, "pdfs", file.id)
        );

        uploadStatus.textContent = "Document deleted successfully.";

        // Refresh the list
        await loadDocuments();

//     } catch (error) {

        console.error(error);
        uploadStatus.textContent = "Could not delete document.";
    }
}


// Update the document list when the user searches
searchInput.addEventListener("input", () => {
    displayDocuments(getFilteredDocuments());
});


// Choose which documents should be displayed
function getFilteredDocuments() {

//     let filteredFiles = documents;

    // Show only the five newest documents
    if (currentView === "recent") {
        filteredFiles = documents.slice(0, 5);
    }

    // Show only starred documents
    if (currentView === "starred") {
        filteredFiles = documents.filter((file) => file.isStarred);
    }

    // Get the search text and make it lowercase
    const searchText = searchInput.value.toLowerCase();

    // Only return file names that contain the search text
    return filteredFiles.filter((file) =>
        file.fileName.toLowerCase().includes(searchText)
    );
}


// Handle the sidebar links
document.querySelectorAll(".sidebar nav a").forEach((link) => {

//     link.addEventListener("click", (event) => {

//         const href = link.getAttribute("href");

        // Only handle these three sidebar links
        if (!["#", "#recent", "#files"].includes(href)) {
            return;
        }

//         event.preventDefault();

        // Choose the correct view
        if (href === "#") {
            currentView = "documents";
        } else if (href === "#recent") {
            currentView = "recent";
        } else {
            currentView = "starred";
        }

        // Remove the active style from all sidebar links
        document.querySelectorAll(".sidebar nav a")
            .forEach((item) => item.classList.remove("active"));

        // Highlight the selected link
        link.classList.add("active");

        // Set the page titles
        const titles = {
            documents: "My Documents",
            recent: "Recent",
            starred: "Starred"
        };

//         document.querySelector(".top-section h1").textContent =
//             titles[currentView];

//         document.querySelector(".section-heading h2").textContent =
//             currentView === "documents"
//                 ? "All Documents"
//                 : titles[currentView];

        // Show the documents for the selected view
        displayDocuments(getFilteredDocuments());
    });
});


// Add a highlight when a file is dragged over the upload area
dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("drag-over");
});


// Remove the highlight when the file leaves the upload area
dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("drag-over");
});


// Upload files when they are dropped into the upload area
dropArea.addEventListener("drop", async (event) => {

    event.preventDefault();
    dropArea.classList.remove("drag-over");

    await handleFiles(event.dataTransfer.files);
});


// Change the file size into KB or MB
function formatFileSize(bytes) {

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// Go to the Quiz page
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


// Return to the documents page
backToDocumentsButton.addEventListener("click", () => {

    uploadDone.hidden = true;

    document.querySelector(".dashboard").hidden = false;
    document.querySelector("site-footer").hidden = false;
});
