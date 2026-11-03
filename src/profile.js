import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "/src/components/site-navbar.js";
import { db } from "./firebaseConfig.js";
import { onAuthReady } from "/src/authentication.js";

import { doc, getDoc, setDoc } from "firebase/firestore";

// Get HTML elements
const profileForm = document.getElementById("profileForm");

const profileImage = document.getElementById("profileImage");
const imageUpload = document.getElementById("imageUpload");

const fullName = document.getElementById("fullName");
const username = document.getElementById("username");
const email = document.getElementById("email");
const phone = document.getElementById("phone");

const displayName = document.getElementById("displayName");
const displayEmail = document.getElementById("displayEmail");

const editButton = document.getElementById("editButton");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");

const removePhoto = document.getElementById("removePhoto");
const profileMessage = document.getElementById("profileMessage");

// Default profile image
const defaultImage = "/Public/images/default-avatar.png";

let currentImageURL = null;
let savedData = {};
let currentUser = null;

// Load the user's profile from Firestore
onAuthReady(async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();

      fullName.value = data.displayName || "";
      username.value = data.username || "";
      email.value = data.email || user.email;
      phone.value = data.phone || "";

      displayName.textContent = data.displayName || "Your Name";

      displayEmail.textContent = data.email || user.email;

      savedData = getProfileData();
    } else {
      console.log("User profile not found in Firestore.");
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    profileMessage.textContent = "Could not load your profile.";
  }
});

// Enable or disable form fields
function setEditing(enabled) {
  fullName.disabled = !enabled;
  username.disabled = !enabled;
  phone.disabled = !enabled;

  editButton.hidden = enabled;
  saveButton.hidden = !enabled;
  cancelButton.hidden = !enabled;
}

// Save current information temporarily
function getProfileData() {
  return {
    fullName: fullName.value,
    username: username.value,
    email: email.value,
    phone: phone.value,
    image: profileImage.src,
  };
}

// Edit Profile
editButton.addEventListener("click", function () {
  savedData = getProfileData();

  setEditing(true);

  profileMessage.textContent = "";
});

// Cancel Changes
cancelButton.addEventListener("click", function () {
  fullName.value = savedData.fullName;
  username.value = savedData.username;
  email.value = savedData.email;
  phone.value = savedData.phone;

  profileImage.src = savedData.image;

  displayName.textContent = savedData.fullName || "Your Name";

  setEditing(false);

  profileMessage.textContent = "Changes cancelled.";
  profileMessage.style.color = "#777";
});

// Save Changes to Firestore
profileForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!profileForm.checkValidity()) {
    profileForm.reportValidity();
    return;
  }

  if (!currentUser) {
    profileMessage.textContent = "Please log in first.";
    return;
  }

  try {
    const userRef = doc(db, "users", currentUser.uid);

    await setDoc(
      userRef,
      {
        displayName: fullName.value,
        username: username.value,
        email: email.value,
        phone: phone.value,
      },
      { merge: true },
    );

    displayName.textContent = fullName.value || "Your Name";
    displayEmail.textContent = email.value;

    setEditing(false);

    profileMessage.textContent = "Profile updated successfully!";

    profileMessage.style.color = "green";

    savedData = getProfileData();
  } catch (error) {
    console.error("Error saving profile:", error);

    profileMessage.textContent =
      "Could not save your profile. Please try again.";

    profileMessage.style.color = "red";
  }
});

// Upload and preview profile picture
imageUpload.addEventListener("change", function () {
  const file = this.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    this.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Please select an image smaller than 5 MB.");
    this.value = "";
    return;
  }

  if (currentImageURL) {
    URL.revokeObjectURL(currentImageURL);
  }

  currentImageURL = URL.createObjectURL(file);

  profileImage.src = currentImageURL;
});

// Remove profile picture
removePhoto.addEventListener("click", function () {
  if (currentImageURL) {
    URL.revokeObjectURL(currentImageURL);
    currentImageURL = null;
  }

  profileImage.src = defaultImage;
  imageUpload.value = "";
});

// Change Password Panel
const passwordButton = document.getElementById("passwordButton");
const passwordPanel = document.getElementById("passwordPanel");

passwordButton.addEventListener("click", function () {
  passwordPanel.hidden = !passwordPanel.hidden;
});

// Password form (Frontend demonstration only)
const passwordForm = document.getElementById("passwordForm");

passwordForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const password = document.getElementById("newPassword").value;

  if (password.length < 6) {
    return;
  }

  document.getElementById("passwordMessage").textContent =
    "Password form completed. Backend connection required.";

  document.getElementById("passwordMessage").style.color = "#777";

  passwordForm.reset();
});

// Privacy Settings Panel
const privacyButton = document.getElementById("privacyButton");
const privacyPanel = document.getElementById("privacyPanel");

privacyButton.addEventListener("click", function () {
  privacyPanel.hidden = !privacyPanel.hidden;
});

// Initial page state
setEditing(false);

savedData = getProfileData();
