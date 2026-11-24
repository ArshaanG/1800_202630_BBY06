import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "/dark-mode.css";
import { db, auth } from "./firebaseConfig.js";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

const params = new URLSearchParams(window.location.search);
const roomCode = params.get("roomCode");

const difficulty = document.getElementById("size");
const courseName = document.getElementById("courseName");
const quantity = document.getElementById("quantity");
const topic = document.getElementById("objectType");

const uploadPdfButton = document.getElementById("uploadPdfButton");
const pdfStatus = document.getElementById("pdfStatus");
const generateButton = document.getElementById("generateButton");



// Keep each room's settings and uploaded PDF separate.
const storageKey = roomCode ? `quizGeneration:${roomCode}` : null;

let draft = {};

if (storageKey) {
    try {
        draft = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    } catch {
        draft = {};
    }
}

// Restore settings after returning from the upload page.
difficulty.value = draft.difficulty ?? "3";
courseName.value = draft.courseName ?? "";
quantity.value = draft.questionCount ?? "1";
topic.value = draft.topic ?? "";

pdfStatus.textContent = draft.uploadId
    ? `PDF uploaded: ${draft.fileName || "Ready"}`
    : "No PDF selected.";

generateButton.disabled = !roomCode || !draft.uploadId;

uploadPdfButton.disabled = !roomCode;

if (!roomCode) {
    pdfStatus.textContent = "Open this page from your room first.";
}

uploadPdfButton.addEventListener("click", () => {
    draft = {
        ...draft,
        difficulty: difficulty.value,
        courseName: courseName.value,
        questionCount: quantity.value,
        topic: topic.value
    };

    sessionStorage.setItem(storageKey, JSON.stringify(draft));

    window.location.href =
        `/upload.html?roomCode=${encodeURIComponent(roomCode)}`;
});

generateButton.addEventListener("click", async () => {
    const questionCount = Number(quantity.value);

    if (
        !Number.isInteger(questionCount) ||
        questionCount < 1 ||
        questionCount > 50
    ) {
        pdfStatus.textContent = "Choose between 1 and 50 questions.";
        return;
    }

    generateButton.disabled = true;
    uploadPdfButton.disabled = true;
    pdfStatus.textContent = "Generating test quiz...";

    try {
        const response = await fetch("/api/generate-quiz", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uploadId: draft.uploadId,
                questionCount,
                difficulty: Number(difficulty.value),
                courseName: courseName.value.trim(),
                topic: topic.value
            })
        });

        const quiz = await response.json();

        if (!response.ok) {
            throw new Error(quiz.error || "Generation failed.");
        }

        await updateDoc(doc(db, "rooms", roomCode), {
            quiz,
            quizStatus: "ready"
        });

        try {
            const user = auth.currentUser;
            if (user) {
                await addDoc(collection(db, "users", user.uid, "quizzes"), {
                    title: `${courseName.value.trim() || "Quiz"} - ${topic.value || "General"}`,
                    quiz,
                    createdAt: serverTimestamp()
                });
            }
        } catch (saveError) {
            console.error("Couldn't save quiz", saveError);
        }

        window.location.href =
            `/template.html?roomCode=${encodeURIComponent(roomCode)}`;
    } catch (error) {
        console.error(error);
        pdfStatus.textContent = error.message;
    } finally {
        generateButton.disabled = !roomCode || !draft.uploadId;
        uploadPdfButton.disabled = !roomCode;
    }
});