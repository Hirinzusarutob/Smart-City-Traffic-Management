
# Smart City Traffic Management System

An intelligent traffic monitoring and management platform designed to improve urban mobility and support congestion response in Bengaluru.

## Features

- Interactive Bengaluru traffic monitoring map
- Junction-wise vehicle count and traffic density
- High, Moderate and Low congestion classification
- Traffic Assistance Centre with automatic assistance request generation
- Dispatch request status management
- Traffic signal management interface
- Incident reporting and monitoring
- Alternative route recommendations
- Distance and estimated travel time for suggested routes
- Responsive dashboard

## Technologies Used

- Python
- Flask
- HTML5
- CSS3
- JavaScript
- Leaflet.js
- OpenStreetMap
- OSRM Routing API

## Installation

1. Clone the repository:

   git clone YOUR_REPOSITORY_URL

2. Open the project folder:

   cd Smart-City-Traffic-Management

3. Install dependencies:

   pip install -r requirements.txt

4. Run the application:

   python app.py

5. Open in your browser:

   http://127.0.0.1:5000

## Project Structure

Smart-City-Traffic-Management/
├── app.py
├── requirements.txt
├── templates/
│   ├── landing.html
│   └── index.html
└── static/
    ├── css/
    │   ├── style.css
    │   ├── landing.css
    │   └── map.css
    └── js/
        ├── script.js
        ├── map.js
        ├── traffic.js
        └── simulation.js

## Current Prototype

The current prototype uses simulated traffic counts to demonstrate congestion monitoring and dispatch workflows. Live CCTV detection, real traffic police integration and actual field-team dispatch require additional infrastructure and authorized integrations.

## Purpose

To demonstrate how technology can support traffic monitoring, congestion response coordination and smarter route recommendations in urban cities.
