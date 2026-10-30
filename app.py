
from flask import Flask, render_template, jsonify, request
from datetime import datetime, timezone
from threading import Lock
import random
import uuid

app = Flask(__name__)
lock = Lock()

JUNCTIONS = [
    {"id": "majestic", "name": "Majestic", "lat": 12.9767, "lng": 77.5713, "capacity": 180},
    {"id": "mg-road", "name": "MG Road", "lat": 12.9756, "lng": 77.6066, "capacity": 140},
    {"id": "silk-board", "name": "Silk Board", "lat": 12.9177, "lng": 77.6233, "capacity": 220},
    {"id": "hebbal", "name": "Hebbal", "lat": 13.0358, "lng": 77.5970, "capacity": 190},
    {"id": "kr-market", "name": "KR Market", "lat": 12.9634, "lng": 77.5765, "capacity": 130},
    {"id": "tin-factory", "name": "Tin Factory", "lat": 12.9965, "lng": 77.6600, "capacity": 170},
    {"id": "marathahalli", "name": "Marathahalli", "lat": 12.9591, "lng": 77.6974, "capacity": 160},
    {"id": "banashankari", "name": "Banashankari", "lat": 12.9255, "lng": 77.5640, "capacity": 125}
]

traffic = {}
dispatches = []
incidents = []
signals = {}
last_auto_dispatch = {}

def density_for(count, capacity):
    ratio = count / capacity

    if ratio >= 0.82:
        return "High"
    elif ratio >= 0.48:
        return "Moderate"
    return "Low"


def create_dispatch(junction_id, reason):
    item = traffic[junction_id]

    dispatch = {
        "id": str(uuid.uuid4())[:8].upper(),
        "junction_id": junction_id,
        "junction": item["name"],
        "vehicles": item["vehicles"],
        "density": item["density"],
        "reason": reason,
        "status": "Pending",
        "team": "Unassigned",
        "created_at": datetime.now().astimezone().isoformat()
    }

    dispatches.insert(0, dispatch)
    return dispatch


def initialize_system():
    for junction in JUNCTIONS:
        count = random.randint(20, junction["capacity"])

        traffic[junction["id"]] = {
            **junction,
            "vehicles": count,
            "density": density_for(count, junction["capacity"]),
            "trend": "Stable"
        }

        signals[junction["id"]] = {
            "mode": "Adaptive",
            "green_seconds": 40,
            "state": "Green"
        }


def update_traffic():
    now = datetime.now(timezone.utc)

    for junction in JUNCTIONS:
        item = traffic[junction["id"]]

        change = random.randint(-18, 24)
        item["vehicles"] = max(0, item["vehicles"] + change)

        item["density"] = density_for(
            item["vehicles"],
            item["capacity"]
        )

        if change > 5:
            item["trend"] = "Rising"
        elif change < -5:
            item["trend"] = "Falling"
        else:
            item["trend"] = "Stable"

        if item["density"] == "High":
            previous = last_auto_dispatch.get(junction["id"])

            cooldown_over = (
                previous is None or
                (now - previous).total_seconds() > 180
            )

            active = any(
                d["junction_id"] == junction["id"]
                and d["status"] != "Resolved"
                for d in dispatches
            )

            if cooldown_over and not active:
                create_dispatch(
                    junction["id"],
                    "Automatic high-congestion alert"
                )
                last_auto_dispatch[junction["id"]] = now


@app.route("/")
def home():
    return render_template("landing.html")


@app.route("/dashboard")
def dashboard():
    return render_template("index.html")


@app.get("/api/traffic")
def get_traffic():
    with lock:
        update_traffic()

        junctions = list(traffic.values())

        summary = {
            "total_vehicles": sum(j["vehicles"] for j in junctions),
            "high": sum(j["density"] == "High" for j in junctions),
            "moderate": sum(j["density"] == "Moderate" for j in junctions),
            "low": sum(j["density"] == "Low" for j in junctions)
        }

        return jsonify({
            "junctions": junctions,
            "summary": summary,
            "updated_at": datetime.now().astimezone().isoformat(),
            "data_mode": "SIMULATED DEMO DATA"
        })


@app.get("/api/dispatch")
def get_dispatches():
    with lock:
        return jsonify({"dispatches": dispatches[:30]})


@app.post("/api/dispatch")
def create_manual_dispatch():
    data = request.get_json(silent=True) or {}
    junction_id = data.get("junction_id")

    with lock:
        if junction_id not in traffic:
            return jsonify({"error": "Invalid junction"}), 400

        dispatch = create_dispatch(
            junction_id,
            data.get("reason", "Manual traffic assistance request")
        )

        return jsonify({"dispatch": dispatch}), 201


@app.post("/api/dispatch/<dispatch_id>/status")
def update_dispatch(dispatch_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if status not in ["Dispatched", "Resolved"]:
        return jsonify({"error": "Invalid status"}), 400

    with lock:
        dispatch = next(
            (d for d in dispatches if d["id"] == dispatch_id),
            None
        )

        if not dispatch:
            return jsonify({"error": "Dispatch not found"}), 404

        dispatch["status"] = status

        if status == "Dispatched":
            dispatch["team"] = data.get(
                "team",
                "Traffic Response Team 01"
            )

        return jsonify({"dispatch": dispatch})


@app.post("/api/signals/<junction_id>")
def update_signal(junction_id):
    data = request.get_json(silent=True) or {}

    with lock:
        if junction_id not in signals:
            return jsonify({"error": "Unknown junction"}), 404

        mode = data.get("mode", "Adaptive")

        if mode not in ["Adaptive", "Manual"]:
            return jsonify({"error": "Invalid mode"}), 400

        signals[junction_id]["mode"] = mode
        signals[junction_id]["green_seconds"] = max(
            10,
            min(120, int(data.get("green_seconds", 40)))
        )

        return jsonify({"signal": signals[junction_id]})


@app.post("/api/incidents")
def report_incident():
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    junction_id = data.get("junction_id")

    with lock:
        if not title or junction_id not in traffic:
            return jsonify({"error": "Invalid incident details"}), 400

        incident = {
            "id": str(uuid.uuid4())[:8].upper(),
            "title": title,
            "junction": traffic[junction_id]["name"],
            "status": "Reported",
            "created_at": datetime.now().astimezone().isoformat()
        }

        incidents.insert(0, incident)

        return jsonify({"incident": incident}), 201


@app.get("/api/incidents")
def get_incidents():
    with lock:
        return jsonify({"incidents": incidents[:30]})


initialize_system()


if __name__ == "__main__":
    app.run(debug=True, threaded=True)
