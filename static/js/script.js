
document.addEventListener("DOMContentLoaded", () => {

    // Display current date
    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }

    // Initialize Bengaluru traffic map
    if (typeof initializeTrafficMap === "function") {
        initializeTrafficMap();
    }

    // Initial dashboard data
    if (typeof loadTrafficData === "function") {
        loadTrafficData();
    }

    if (typeof loadDispatches === "function") {
        loadDispatches();
    }

    if (typeof loadIncidents === "function") {
        loadIncidents();
    }

    // Refresh traffic and dashboard every 5 seconds
    setInterval(() => {
        if (typeof loadTrafficData === "function") {
            loadTrafficData();
        }

        if (typeof loadDispatches === "function") {
            loadDispatches();
        }

        if (typeof loadIncidents === "function") {
            loadIncidents();
        }
    }, 5000);

    // Sidebar navigation
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });
    });

});
