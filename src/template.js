import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import "/dark-mode.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import { onAuthReady } from "/src/authentication.js";
import { db, auth } from "./firebaseConfig.js";
import { doc, getDoc, updateDoc, setDoc, increment, onSnapshot } from "firebase/firestore";

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
  addMessage(await localName(), content)
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
let userScore = 0;
let answerHistory = [];

let raceUnsubscribe = null;
let racePlayerOrder = [];
let raceInitialized = false;
const raceTrack = document.getElementById("raceTrack");

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

function getCarSvg(color = "#0d6efd") {
  return `
    <svg viewBox="0 0 84 40" width="56" height="28"
         aria-hidden="true">

      <!-- Rear wheels -->
      <rect x="12" y="0" width="17" height="10"
            rx="3" fill="#111"/>
      <rect x="12" y="30" width="17" height="10"
            rx="3" fill="#111"/>

      <!-- Front wheels -->
      <rect x="56" y="2" width="14" height="9"
            rx="3" fill="#111"/>
      <rect x="56" y="29" width="14" height="9"
            rx="3" fill="#111"/>

      <!-- Suspension -->
      <path d="M20 7 V33 M63 7 V33"
            stroke="#777" stroke-width="3"/>

      <!-- Rear wing -->
      <rect x="4" y="3" width="9" height="34"
            rx="1.5" fill="${color}"/>

      <!-- Main body and nose -->
      <path d="M12 15 L30 10 L43 11 L51 17
               L73 17 L78 20 L73 23 L51 23
               L43 29 L30 30 L12 25 Z"
            fill="${color}"/>

      <!-- Sidepod highlights -->
      <path d="M28 11 H42 L47 16 H28 Z
               M28 29 H42 L47 24 H28 Z"
            fill="white" opacity="0.22"/>

      <!-- Cockpit -->
      <ellipse cx="39" cy="20" rx="9" ry="6"
               fill="#161616"/>

      <!-- Driver's helmet -->
      <circle cx="41" cy="20" r="4"
              fill="#e5e7eb"/>

      <!-- Front wing -->
      <rect x="72" y="5" width="8" height="30"
            rx="1.5" fill="${color}"/>

      <!-- Front wing highlight -->
      <path d="M75 8 V32"
            stroke="white" opacity="0.4"
            stroke-width="1.5"/>

    </svg>
  `;
}

function getPlayerColor(index) {
  const colors = [
    "#0d6efd",
    "#dc3545",
    "#198754",
    "#ffc107",
    "#6f42c1",
    "#fd7e14",
    "#20c997",
    "#e83e8c"
  ];
  return colors[index % colors.length];
}

function buildRaceTrack(players) {
  raceTrack.innerHTML = "";

  racePlayerOrder = Object.entries(players)
    .sort(([, a], [, b]) => {
      const nameA = a?.name || "";
      const nameB = b?.name || "";
      return nameA.localeCompare(nameB);
    })
    .map(([id]) => id);

  racePlayerOrder.forEach((id, index) => {
    const player = players[id];
    const color = getPlayerColor(index);

    const lane = document.createElement("div");
    lane.className = "mb-3";

    lane.innerHTML = `
      <div class="d-flex justify-content-between small mb-1">
        <span>${player?.name || "Guest"}${id === playerId ? " (You)" : ""}</span>
        <span id="race-score-${id}">${player?.score || 0}</span>
      </div>
      <div class="race-lane position-relative border rounded bg-body-tertiary" 
           style="height: 52px; overflow: hidden;">
        <div class="position-absolute top-0 bottom-0 end-0 border-start"
             style="width: 10px; background:
               repeating-linear-gradient(
                 45deg,
                 #000 0px,
                 #000 5px,
                 #fff 5px,
                 #fff 10px
               );">
        </div>

        <div class="race-car position-absolute"
             id="race-car-${id}"
             style="
               left: 0px;
               top: 10px;
               width: 56px;
               height: 28px;
               transition: left 0.5s ease-in-out;
             ">
          ${getCarSvg(color)}
        </div>
      </div>
    `;

    raceTrack.appendChild(lane);
  });

  raceInitialized = true;
}

function updateRaceTrack(players) {
  if (!quizData || !quizData.questions || quizData.questions.length === 0) return;

  const totalQuestions = quizData.questions.length;

  if (!raceInitialized) {
    buildRaceTrack(players);
  }

  racePlayerOrder.forEach((id) => {
    const player = players[id];
    if (!player) return;

    const lane = raceTrack.querySelector(`#race-car-${id}`)?.parentElement;
    const car = document.getElementById(`race-car-${id}`);
    const scoreLabel = document.getElementById(`race-score-${id}`);

    if (!lane || !car || !scoreLabel) return;

    const score = player.score || 0;
    scoreLabel.textContent = score;

    const progress = Math.max(0, Math.min(score / totalQuestions, 1));

    car.style.left = `calc(${progress * 100}% - ${progress * 66}px)`;
  });
}

function subscribeToRaceTrack() {
  if (!quizRoomCode) return;

  if (raceUnsubscribe) {
    raceUnsubscribe();
  }

  raceUnsubscribe = onSnapshot(doc(db, "rooms", quizRoomCode), (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    const players = data.players || {};
    updateRaceTrack(players);
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

/**
 * Records the player's submitted answer and updates their score.
 *
 * @param {string} answer - The player's submitted answer.
 * @param {boolean} correct - Whether the answer was correct.
 */
function recordAnswer(answer, correct) {
  answerHistory.push({
    questionIndex: currentQuestionIndex,
    submittedAnswer: answer,
    correct: correct
  });

  if (correct) {
    userScore++;
  }
  console.log("Current score:", userScore);
  console.log("Answer history:", answerHistory);
}

function submitAnswer() {
  const answer = getSelectedAnswer();

  if (answer === null || answer === "") {
    feedback.textContent = "Please enter or select an answer.";
    return;
  }

  const correct = checkAnswer(answer);

  recordAnswer(answer, correct);

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
  const user = auth.currentUser;
  Promise.all([
    updateDoc(doc(db, "rooms", quizRoomCode), {
      [`players.${playerId}.finished`]: true
    }),
    setDoc(doc(db, "scores", user.uid), {
      name: user.displayName || user.email.split("@")[0],
      totalScore: increment(userScore),
      gamesPlayed: increment(1),
    }, { merge: true })
  ]).then(() => {
    window.location.href = `/quiz-results.html?roomCode=${encodeURIComponent(quizRoomCode)}`;
  }).catch(console.error);
}

function startQuiz() {
  currentQuestionIndex = 0;
  hasAnswered = false;
  userScore = 0;
  answerHistory = [];

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
    subscribeToRaceTrack();
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

window.addEventListener("beforeunload", () => {
  if (raceUnsubscribe) {
    raceUnsubscribe();
  }
});