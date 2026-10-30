
// Load traffic assistance requests
async function loadDispatches() {
    try {
        const response = await fetch("/api/dispatch");
        const data = await response.json();

        const container = document.getElementById("dispatchList");
        const total = document.getElementById("dispatchTotal");

        if (!container) return;

        const dispatches = data.dispatches || [];

        if (total) total.textContent = dispatches.length;

        if (dispatches.length === 0) {
            container.innerHTML = "<p>No active assistance requests.</p>";
            return;
        }

        container.innerHTML = dispatches.map(d => `
            <div class="dispatch-card">
                <div class="dispatch-card-top">
                    <h3>${d.junction}</h3>
                    <span class="density-badge ${d.density.toLowerCase()}">
                        ${d.density}
                    </span>
                </div>

                <p>${d.reason}</p>
                <p>Vehicles: ${d.vehicles}</p>
                <p>Team: ${d.team}</p>

                <strong>Status: ${d.status}</strong>

                <div class="dispatch-actions">
                    ${d.status === "Pending" ? `
                        <button onclick="updateDispatchStatus('${d.id}', 'Dispatched')">
                            Dispatch Team
                        </button>
                    ` : ""}

                    ${d.status === "Dispatched" ? `
                        <button onclick="updateDispatchStatus('${d.id}', 'Resolved')">
                            Mark Resolved
                        </button>
                    ` : ""}
                </div>
            </div>
        `).join("");

    } catch (error) {
        console.error("Dispatch loading error:", error);
    }
}

// Create a manual assistance request
async function requestTrafficAssistance() {
    const junctionId = document.getElementById("dispatchJunction").value;
    const reason = document.getElementById("dispatchReason").value.trim();

    try {
        const response = await fetch("/api/dispatch", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                junction_id: junctionId,
                reason: reason || "Manual traffic assistance request"
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Request failed");

        document.getElementById("dispatchReason").value = "";

        alert("Traffic assistance request created!");
        loadDispatches();

    } catch (error) {
        alert(error.message);
    }
}

// Update assistance team status
async function updateDispatchStatus(dispatchId, status) {
    try {
        const response = await fetch(`/api/dispatch/${dispatchId}/status`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                status: status,
                team: "Traffic Response Team 01"
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Update failed");

        loadDispatches();

    } catch (error) {
        alert(error.message);
    }
}

// Load reported incidents
async function loadIncidents() {
    try {
        const response = await fetch("/api/incidents");
        const data = await response.json();

        const container = document.getElementById("incidentList");
        if (!container) return;

        const incidents = data.incidents || [];

        if (incidents.length === 0) {
            container.innerHTML = "<p>No incidents reported yet.</p>";
            return;
        }

        container.innerHTML = incidents.map(item => `
            <div class="incident-card">
                <h3>${item.title}</h3>
                <p>Location: ${item.junction}</p>
                <p>Status: ${item.status}</p>
                <small>${new Date(item.created_at).toLocaleString()}</small>
            </div>
        `).join("");

    } catch (error) {
        console.error("Incident loading error:", error);
    }
}

// Report a new incident
async function submitIncident(event) {
    event.preventDefault();

    const title = document.getElementById("incidentTitle").value.trim();
    const junctionId = document.getElementById("incidentJunction").value;
    const message = document.getElementById("incidentMessage");

    if (!title) {
        message.textContent = "Please enter an incident description.";
        return;
    }

    try {
        const response = await fetch("/api/incidents", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                title: title,
                junction_id: junctionId
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Report failed");

        message.textContent = "Incident reported successfully!";
        document.getElementById("incidentForm").reset();

        loadIncidents();

    } catch (error) {
        message.textContent = error.message;
    }
}

// Connect buttons and forms
document.addEventListener("DOMContentLoaded", () => {
    const dispatchButton = document.getElementById("requestDispatchBtn");

    if (dispatchButton) {
        dispatchButton.addEventListener("click", requestTrafficAssistance);
    }

    const incidentForm = document.getElementById("incidentForm");

    if (incidentForm) {
        incidentForm.addEventListener("submit", submitIncident);
    }

    loadDispatches();
    loadIncidents();
});
