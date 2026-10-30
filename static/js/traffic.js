
async function loadTrafficData() {
    try {
        const response = await fetch("/api/traffic");
        if (!response.ok) throw new Error("Traffic API failed");

        const data = await response.json();

        // Update overview cards
        document.getElementById("totalVehicles").textContent =
            data.summary.total_vehicles;

        document.getElementById("highCount").textContent =
            data.summary.high;

        document.getElementById("moderateCount").textContent =
            data.summary.moderate;

        document.getElementById("lowCount").textContent =
            data.summary.low;

        document.getElementById("lastUpdated").textContent =
            new Date(data.updated_at).toLocaleTimeString();

        // Update Bengaluru map
        if (typeof updateTrafficMap === "function") {
            updateTrafficMap(data.junctions);
        }

        // Update junction cards
        renderJunctionCards(data.junctions);

        // Update dropdowns and signal controls
        updateJunctionDropdowns(data.junctions);
        renderSignalControls(data.junctions);

    } catch (error) {
        console.error("Traffic loading error:", error);
    }
}

function renderJunctionCards(junctions) {
    const container = document.getElementById("junctionGrid");
    if (!container) return;

    container.innerHTML = junctions.map(j => `
        <div class="junction-card">
            <div class="junction-card-top">
                <h3>${j.name}</h3>
                <span class="density-badge ${j.density.toLowerCase()}">
                    ${j.density}
                </span>
            </div>

            <div class="vehicle-count">${j.vehicles}</div>
            <p>Vehicles detected</p>

            <div class="traffic-progress">
                <div class="traffic-progress-fill ${j.density.toLowerCase()}"
                     style="width:${Math.min(100, (j.vehicles / j.capacity) * 100)}%">
                </div>
            </div>

            <div class="junction-card-bottom">
                <span>Capacity: ${j.capacity}</span>
                <span>Trend: ${j.trend}</span>
            </div>
        </div>
    `).join("");
}

function updateJunctionDropdowns(junctions) {
    const ids = ["dispatchJunction", "incidentJunction"];

    ids.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const previousValue = select.value;

        select.innerHTML = junctions.map(j =>
            `<option value="${j.id}">${j.name}</option>`
        ).join("");

        if (junctions.some(j => j.id === previousValue)) {
            select.value = previousValue;
        }
    });
}

function renderSignalControls(junctions) {
    const container = document.getElementById("signalGrid");
    if (!container) return;

    container.innerHTML = junctions.map(j => `
        <div class="signal-card">
            <h3>${j.name}</h3>
            <p>Signal control</p>

            <label>Mode</label>
            <select id="mode-${j.id}">
                <option value="Adaptive">Adaptive</option>
                <option value="Manual">Manual</option>
            </select>

            <label>Green time (seconds)</label>
            <input id="green-${j.id}" type="number"
                   min="10" max="120" value="40">

            <button onclick="saveSignal('${j.id}')">
                Save Signal
            </button>
        </div>
    `).join("");
}

async function saveSignal(junctionId) {
    const mode = document.getElementById(`mode-${junctionId}`).value;
    const greenSeconds = Number(
        document.getElementById(`green-${junctionId}`).value
    );

    if (!Number.isFinite(greenSeconds) ||
        greenSeconds < 10 || greenSeconds > 120) {
        alert("Green time must be between 10 and 120 seconds.");
        return;
    }

    try {
        const response = await fetch(`/api/signals/${junctionId}`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                mode: mode,
                green_seconds: greenSeconds
            })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Update failed");

        alert("Signal settings saved successfully!");
    } catch (error) {
        alert(error.message);
    }
}
