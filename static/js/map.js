
// ==========================================
// SMART BENGALURU TRAFFIC - MAP SYSTEM
// ==========================================

let trafficMap = null;
let trafficMarkers = {};
let routeLayers = [];
let routeEndpointMarkers = [];
let currentTrafficJunctions = [];

// ==========================================
// 1. INITIALIZE MAP
// ==========================================

function initializeTrafficMap() {
    const mapElement = document.getElementById("trafficMap");

    if (!mapElement) {
        console.error("Map container #trafficMap was not found.");
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet library is missing.");
        return;
    }

    if (trafficMap) return;

    trafficMap = L.map("trafficMap", {
        zoomControl: true
    }).setView([12.9716, 77.5946], 11);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(trafficMap);

    setTimeout(() => {
        trafficMap.invalidateSize();
    }, 300);

    console.log("Bengaluru traffic map initialized.");
}


// ==========================================
// 2. TRAFFIC MARKER ICONS
// ==========================================

function getTrafficIcon(density) {
    const level = String(density || "Low").toLowerCase();

    return L.divIcon({
        className: "",
        html: `<div class="traffic-marker ${level}"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12]
    });
}


// ==========================================
// 3. UPDATE TRAFFIC MARKERS
// ==========================================

function updateTrafficMap(junctions) {
    if (!Array.isArray(junctions)) return;

    currentTrafficJunctions = junctions;

    if (!trafficMap) {
        initializeTrafficMap();
    }

    if (!trafficMap) return;

    junctions.forEach(junction => {
        const popup = `
            <div class="map-popup-title">
                ${junction.name}
            </div>

            <div class="map-popup-count">
                Vehicles: <strong>${junction.vehicles}</strong>
            </div>

            <div>
                Density:
                <strong>${junction.density}</strong>
            </div>

            <div class="map-popup-count">
                Trend: ${junction.trend}
            </div>

            <small>Simulated demonstration data</small>
        `;

        if (trafficMarkers[junction.id]) {
            trafficMarkers[junction.id]
                .setLatLng([junction.lat, junction.lng])
                .setIcon(getTrafficIcon(junction.density))
                .setPopupContent(popup);
        } else {
            trafficMarkers[junction.id] = L.marker(
                [junction.lat, junction.lng],
                {
                    icon: getTrafficIcon(junction.density)
                }
            )
            .addTo(trafficMap)
            .bindPopup(popup);
        }
    });

    trafficMap.invalidateSize();
}


// ==========================================
// 4. DISTANCE CALCULATION
// ==========================================

function distanceInMeters(a, b) {
    const radians = value => value * Math.PI / 180;

    const earthRadius = 6371000;

    const dLat = radians(b.lat - a.lat);
    const dLng = radians(b.lng - a.lng);

    const lat1 = radians(a.lat);
    const lat2 = radians(b.lat);

    const value =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLng / 2) ** 2;

    return earthRadius * 2 *
        Math.atan2(
            Math.sqrt(value),
            Math.sqrt(1 - value)
        );
}


// ==========================================
// 5. CHECK HIGH-TRAFFIC JUNCTIONS
// ==========================================

function countHighTrafficJunctions(routeCoordinates) {
    const highJunctions = currentTrafficJunctions.filter(
        junction => junction.density === "High"
    );

    let count = 0;

    highJunctions.forEach(junction => {
        const nearRoute = routeCoordinates.some(
            (point, index) => {
                if (index % 5 !== 0) return false;

                const distance = distanceInMeters(
                    {
                        lat: junction.lat,
                        lng: junction.lng
                    },
                    {
                        lat: point[1],
                        lng: point[0]
                    }
                );

                return distance < 300;
            }
        );

        if (nearRoute) count++;
    });

    return count;
}


// ==========================================
// 6. SEARCH LOCATION
// ==========================================

async function geocodeLocation(place) {
    const url =
        "https://nominatim.openstreetmap.org/search" +
        "?format=jsonv2&limit=1&q=" +
        encodeURIComponent(place + ", Bengaluru, India");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Location search service unavailable.");
    }

    const results = await response.json();

    if (!results.length) {
        throw new Error("Location not found: " + place);
    }

    return {
        lat: Number(results[0].lat),
        lng: Number(results[0].lon),
        name: results[0].display_name
    };
}


// ==========================================
// 7. CLEAR OLD ROUTES
// ==========================================

function clearPreviousRoutes() {
    routeLayers.forEach(layer => {
        if (trafficMap) trafficMap.removeLayer(layer);
    });

    routeEndpointMarkers.forEach(marker => {
        if (trafficMap) trafficMap.removeLayer(marker);
    });

    routeLayers = [];
    routeEndpointMarkers = [];
}


// ==========================================
// 8. FIND ALTERNATE ROUTES
// ==========================================

async function findAlternateRoutes() {
    const sourceInput = document.getElementById("routeSource");
    const destinationInput = document.getElementById("routeDestination");

    const message = document.getElementById("routeMessage");
    const resultsBox = document.getElementById("routeResults");
    const button = document.getElementById("findRouteBtn");

    if (!sourceInput || !destinationInput || !message || !resultsBox) {
        console.error("Route planner HTML elements are missing.");
        return;
    }

    const sourceText = sourceInput.value.trim();
    const destinationText = destinationInput.value.trim();

    if (!sourceText || !destinationText) {
        message.textContent = "Enter both source and destination.";
        return;
    }

    if (sourceText.toLowerCase() === destinationText.toLowerCase()) {
        message.textContent = "Source and destination must be different.";
        return;
    }

    if (!trafficMap) {
        initializeTrafficMap();
    }

    if (!trafficMap) {
        message.textContent = "Map is not available. Please refresh.";
        return;
    }

    if (button) button.disabled = true;

    message.textContent = "Searching for the best available routes...";
    resultsBox.innerHTML = "";

    try {
        const source = await geocodeLocation(sourceText);
        const destination = await geocodeLocation(destinationText);

        const routeURL =
            "https://router.project-osrm.org/route/v1/driving/" +
            `${source.lng},${source.lat};${destination.lng},${destination.lat}` +
            "?alternatives=3&overview=full&geometries=geojson";

        const response = await fetch(routeURL);

        if (!response.ok) {
            throw new Error("Route service is unavailable.");
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes.length) {
            throw new Error("No driving routes found.");
        }

        clearPreviousRoutes();

        const routes = data.routes.map(route => ({
            route: route,
            highCount: countHighTrafficJunctions(
                route.geometry.coordinates
            )
        }));

        // Prefer routes passing fewer high-density junctions.
        // If equal, prefer the shorter route.
        routes.sort((a, b) => {
            return (
                a.highCount - b.highCount ||
                a.route.distance - b.route.distance
            );
        });

        routes.forEach((item, index) => {
            const coordinates =
                item.route.geometry.coordinates.map(point => [
                    point[1],
                    point[0]
                ]);

            const recommended = index === 0;

            const line = L.polyline(coordinates, {
                color: recommended ? "#20c997" : "#438bea",
                weight: recommended ? 7 : 4,
                opacity: recommended ? 1 : 0.7
            }).addTo(trafficMap);

            line.bindPopup(
                recommended
                    ? "Recommended alternate route"
                    : "Alternative route"
            );

            routeLayers.push(line);
        });

        // Source marker
        const sourceMarker = L.marker([
            source.lat,
            source.lng
        ]).addTo(trafficMap);

        sourceMarker.bindPopup("SOURCE: " + sourceText);

        // Destination marker
        const destinationMarker = L.marker([
            destination.lat,
            destination.lng
        ]).addTo(trafficMap);

        destinationMarker.bindPopup(
            "DESTINATION: " + destinationText
        );

        routeEndpointMarkers.push(
            sourceMarker,
            destinationMarker
        );

        // Zoom to route
        const bounds = L.featureGroup([
            ...routeLayers,
            ...routeEndpointMarkers
        ]).getBounds();

        trafficMap.fitBounds(bounds, {
            padding: [40, 40]
        });

        // Display route information
        resultsBox.innerHTML = routes.map((item, index) => {
            const distanceKm =
                (item.route.distance / 1000).toFixed(1);

            const duration =
                Math.round(item.route.duration / 60);

            const title = index === 0
                ? "Recommended Route"
                : "Alternative Route " + index;

            return `
                <div class="route-result ${index === 0 ? "recommended" : ""}">
                    <strong>${title}</strong>

                    <p>
                        Distance: ${distanceKm} km
                    </p>

                    <p>
                        Estimated time: ${duration} minutes
                    </p>

                    <p>
                        Nearby high-traffic junctions:
                        ${item.highCount}
                    </p>
                </div>
            `;
        }).join("");

        message.textContent =
            "Routes found! Green indicates the recommended route. Blue indicates alternatives.";

    } catch (error) {
        console.error("Route planner error:", error);
        message.textContent = error.message;
    } finally {
        if (button) button.disabled = false;
    }
}


// ==========================================
// 9. INITIALIZE MAP WHEN PAGE LOADS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    initializeTrafficMap();
});
