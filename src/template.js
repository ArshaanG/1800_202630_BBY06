import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import "/dark-mode.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import { onAuthReady } from "/src/authentication.js";
import { db } from "./firebaseConfig.js";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

function localName() {
  return new Promise((resolve) => {
    onAuthReady(function (user) {
      resolve(user.displayName || user.email);
    });
  });
}

function addMessage(username, content) {
  const message = document.createElement("div");
  message.className = "bg-body-tertiary border rounded-3 p-3 mb-2";

  const name = document.createElement("div");
  name.className = "fw-bold small text-primary mb-1";
  name.textContent = username;

  const text = document.createElement("div");
  text.className = "fs-6 lh-sm text-break m-0 p-0";
  text.textContent = content;

  message.append(name, text);

  const messages = document.getElementById("chatMessages");
  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
}
document.getElementById("chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = document.getElementById("chatInput").value.trim();
    if (!content) return;
    addMessage(await localName(),content)
    document.getElementById("chatInput").value = "";
});

// currently fake quiz data; to be replaced by database. 
//const quizData = {
  // questions: [
  //   {
  //     type: "four_choice",
  //     question: "What is 2 + 2?",
  //     answers: ["3", "4", "5", "6"],
  //     correctAnswer: "4"
  //   },
  //   {
  //     type: "two_choice",
  //     question: "Earth orbits the Sun.",
  //     answers: ["True", "False"],
  //     correctAnswer: "True"
  //   },
  //   {
  //     type: "written",
  //     question: "What is the capital of Canada?",
  //     correctAnswer: "Ottawa"
  //   }
  // ]
//};
let quizData = null;

let currentQuestionIndex = 0;
let hasAnswered = false;

const quizRoomCode = new URLSearchParams(window.location.search).get("roomCode");
const playerId = sessionStorage.getItem("playerId");
const questionProgress = document.getElementById("questionProgress");
const questionText = document.getElementById("questionText");
const nextButton = document.getElementById("nextButton");

const multipleAnswers = document.getElementById("multipleAnswers");
const writtenAnswers = document.getElementById("writtenAnswers");
const trueFalseAnswers = document.getElementById("trueFalseAnswers");

const writtenInput = writtenAnswers.querySelector("input");

const feedback = document.createElement("p");
feedback.setAttribute("role", "status");
nextButton.parentElement.before(feedback);

function getCurrentQuestion() {
  return quizData.questions[currentQuestionIndex];
}

function hideAnswerFormats() {
  multipleAnswers.hidden = true;
  writtenAnswers.hidden = true;
  trueFalseAnswers.hidden = true;
}

function populateChoices(fieldset, answers) {
  const inputs = fieldset.querySelectorAll('input[type="radio"]');

  inputs.forEach((input, index) => {
    input.value = answers[index];

    const label = fieldset.querySelector(`label[for="${input.id}"]`);
    label.textContent = answers[index];
  });
}

function displayQuestion() {
  const currentQuestion = getCurrentQuestion();

  hasAnswered = false;
  feedback.textContent = "";
  nextButton.textContent = "Submit";

  hideAnswerFormats();

  // Clear previous answers and enable controls again.
  document.querySelectorAll(
    "#multipleAnswers input, #writtenAnswers input, #trueFalseAnswers input"
  ).forEach((input) => {
    input.disabled = false;

    if (input.type === "radio") {
      input.checked = false;
    } else {
      input.value = "";
    }
  });

  questionProgress.textContent =
    `Question ${currentQuestionIndex + 1} of ${quizData.questions.length}`;

  questionText.textContent = currentQuestion.question;

  switch (currentQuestion.type) {
    case "four_choice":
      populateChoices(multipleAnswers, currentQuestion.answers);
      multipleAnswers.hidden = false;
      break;

    case "two_choice":
      populateChoices(trueFalseAnswers, currentQuestion.answers);
      trueFalseAnswers.hidden = false;
      break;

    case "written":
      writtenAnswers.hidden = false;
      break;
  }
}

function getSelectedAnswer() {
  const currentQuestion = getCurrentQuestion();

  if (currentQuestion.type === "written") {
    return writtenInput.value.trim();
  }

  const fieldset = currentQuestion.type === "four_choice"
    ? multipleAnswers
    : trueFalseAnswers;

  const selected = fieldset.querySelector("input:checked");
  return selected ? selected.value : null;
}

function checkAnswer(answer) {
  const currentQuestion = getCurrentQuestion();

  if (currentQuestion.type === "written") {
    return answer.trim().toLowerCase() ===
      currentQuestion.correctAnswer.trim().toLowerCase();
  }

  return answer === currentQuestion.correctAnswer;
}

function submitAnswer() {
  const answer = getSelectedAnswer();

  if (answer === null || answer === "") {
    feedback.textContent = "Please enter or select an answer.";
    return;
  }

  const correct = checkAnswer(answer);

  if (correct) {
    feedback.textContent = "Correct!";
    updateDoc(doc(db, "rooms", quizRoomCode), {
      [`players.${playerId}.score`]: increment(1)
    }).catch(console.error);
  } else {
    feedback.textContent =
      `Incorrect. Correct answer: ${getCurrentQuestion().correctAnswer}`;
  }

  hasAnswered = true;

  document.querySelectorAll(
    "#multipleAnswers input, #writtenAnswers input, #trueFalseAnswers input"
  ).forEach((input) => {
    input.disabled = true;
  });

  nextButton.textContent =
    currentQuestionIndex === quizData.questions.length - 1
      ? "Show results"
      : "Next";
}

function nextQuestion() {
  currentQuestionIndex++;

  if (currentQuestionIndex < quizData.questions.length) {
    displayQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  hideAnswerFormats();
  feedback.textContent = "";
  questionProgress.textContent = "Quiz complete";
  questionText.textContent = "You've finished all the questions.";
  nextButton.hidden = true;
  updateDoc(doc(db, "rooms", quizRoomCode), {
    [`players.${playerId}.finished`]: true
  }).then(() => {
    window.location.href = `/quiz-results.html?roomCode=${encodeURIComponent(quizRoomCode)}`;
  }).catch(console.error);
}

function startQuiz() {
  currentQuestionIndex = 0;
  hasAnswered = false;
  feedback.textContent = "";
  hideAnswerFormats();
  nextButton.hidden = true;

  if (
    !quizData ||
    !Array.isArray(quizData.questions) ||
    quizData.questions.length === 0
  ) {
    questionProgress.textContent = "";
    questionText.textContent = "No questions available.";
    return;
  }

  // Check the basic structure before displaying anything.
  const valid = quizData.questions.every((question) => {
    if (
      !question ||
      typeof question.question !== "string" ||
      typeof question.correctAnswer !== "string"
    ) {
      return false;
    }

    if (question.type === "written") {
      return true;
    }

    const expectedCount = {
      four_choice: 4,
      two_choice: 2
    }[question.type];

    return expectedCount !== undefined &&
      Array.isArray(question.answers) &&
      question.answers.length === expectedCount &&
      question.answers.every((answer) => typeof answer === "string") &&
      new Set(question.answers).size === expectedCount &&
      question.answers.includes(question.correctAnswer);
  });

  if (!valid) {
    questionProgress.textContent = "";
    questionText.textContent = "The quiz contains invalid question data.";
    return;
  }

  nextButton.hidden = false;
  displayQuestion();
}

nextButton.addEventListener("click", () => {
  if (hasAnswered) {
    nextQuestion();
  } else {
    submitAnswer();
  }
});

async function loadRoomQuiz() {
    nextButton.hidden = true;
    questionText.textContent = "Loading quiz...";

    try {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get("roomCode");

        if (!roomCode) {
            throw new Error("No room code was provided.");
        }

        const snapshot = await getDoc(doc(db, "rooms", roomCode));

        if (!snapshot.exists()) {
            throw new Error("The room no longer exists.");
        }

        quizData = snapshot.data().quiz;
        startQuiz();
    } catch (error) {
        console.error(error);
        questionProgress.textContent = "";
        questionText.textContent = "Could not load the quiz.";
    }
}

onAuthReady((user) => {
    if (user) {
        loadRoomQuiz();
    } else {
        window.location.href = "/index.html";
    }
});