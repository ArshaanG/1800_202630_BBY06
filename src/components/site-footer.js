// Create the footer navigation for Quiz-Race
const footer = document.createElement("nav");

footer.className = "navbar fixed-bottom navbar-dark";
footer.style.backgroundColor = "#040427";

footer.innerHTML = `
    <div class="container-fluid justify-content-around">

        <a class="nav-link text-center text-white active"
           aria-current="page" href="index.html">
            <i class="bi bi-house d-block fs-5"></i>
            <small>Home</small>
        </a>

        <a class="nav-link text-center text-white" href="rooms.html">
            <i class="bi bi-people d-block fs-5"></i>
            <small>Rooms</small>
        </a>

        <a class="nav-link text-center text-white" href="leaderboard.html">
            <i class="bi bi-trophy d-block fs-5"></i>
            <small>Leaderboard</small>
        </a>

        <a class="nav-link text-center text-white" href="profile.html">
            <i class="bi bi-person d-block fs-5"></i>
            <small>Profile</small>
        </a>

        <a class="nav-link text-center text-white" href="menu.html">
            <i class="bi bi-list d-block fs-5"></i>
            <small>Menu</small>
        </a>

    </div>
`;

document.body.appendChild(footer);