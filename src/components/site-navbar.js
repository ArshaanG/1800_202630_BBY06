
import { logoutUser, onAuthReady } from "/src/authentication.js";

class SiteNavbar extends HTMLElement {
    constructor() {
        super();
        this.renderNavbar();
        this.renderAuthControls();
    }

    renderNavbar() {
        this.innerHTML = `
            <nav class="navbar navbar-expand-lg navbar-dark"
                 style="background-color: #040427;">

                <div class="container-fluid">

                    <a class="navbar-brand" href="/">
                        <img src="/Public/images/quizrace.jpeg"
                             alt="Quiz-Race Logo"
                             height="36">
                        Quiz-Race
                    </a>

                    <button class="navbar-toggler"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarSupportedContent"
                            aria-controls="navbarSupportedContent"
                            aria-expanded="false"
                            aria-label="Toggle navigation">

                        <span class="navbar-toggler-icon"></span>
                    </button>

                    <div class="collapse navbar-collapse"
                         id="navbarSupportedContent">

                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link" href="/">Home</a>
                            </li>
                        </ul>

                        <div id="authControls"
                             class="d-flex align-items-center gap-2 my-2 my-lg-0">
                        </div>

                    </div>
                </div>
            </nav>
        `;
    }

    renderAuthControls() {
        const authControls = this.querySelector("#authControls");

        authControls.innerHTML = `
            <div class="btn btn-outline-light"
                 style="visibility: hidden; min-width: 80px;">
                Log out
            </div>
        `;

        onAuthReady(function (user) {
            if (user) {
                authControls.innerHTML = `
                    <button class="btn btn-outline-light"
                            id="signOutBtn"
                            type="button">
                        Log out
                    </button>
                `;

                const signOutBtn =
                    authControls.querySelector("#signOutBtn");

                signOutBtn.addEventListener("click", logoutUser);

            } else {
                authControls.innerHTML = `
                    <a class="btn btn-outline-light"
                       href="/login.html">
                        Log in
                    </a>
                `;
            }
        });
    }
}

customElements.define("site-navbar", SiteNavbar);
