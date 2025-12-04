# ShakeMap Web Portal

This project provides a static web portal to visualize ShakeMap data. It consists of a Bash script to process event data and a frontend (HTML/JS/CSS) to display it.

## Features
- **Event List**: View all processed ShakeMap events.
- **Search**: Filter events by Start Time, End Time, and Minimum Magnitude.
- **Event Details**: Interactive Leaflet map showing:
    - Epicenter
    - Intensity Contours (MMI)
    - PGA, PGV, PSA Layers
    - Seismic Stations
- **Product Download**: Access and download static ShakeMap products.
- **Mobile Responsive**: Works on desktop and mobile devices.

## Setup & Usage

### 1. Prerequisites
- `bash`
- `jq` (for JSON processing)
- `xmllint` (libxml2, for XML processing)
- Web Server (Nginx, Apache, or simple Python server)

### 2. Data Processing
The `process_events.sh` script scans the `data/` directory and generates `events.json`.

**Process all events:**
```bash
./process_events.sh
```

**Process a single event:**
```bash
./process_events.sh -e <eventid>
```
Example: `./process_events.sh -e 44683062`

### 3. Running the Portal

#### Option A: Docker (Recommended)
**Build the Docker image:**
```bash
docker build -t shakemap4-web .
```

**Run without volume (data included in image):**
```bash
docker run -d -p 8080:80 --name shakemap4-web__container shakemap4-web
```

**Run with data directory as volume:**
```bash
docker run -d -p 8080:80 -v $(pwd)/data:/usr/share/nginx/html/data --name shakemap4-web__container shakemap4-web
```

**Run with automated processing enabled:**
```bash
docker run -d -p 8080:80 \
  -v $(pwd)/data:/usr/share/nginx/html/data \
  --name shakemap4-web__container \
  -e ENABLE_CRONTAB=true \
  shakemap4-web
```

When `ENABLE_CRONTAB=true` is set, the container will automatically:
- Process the last 5 events every 2 minutes (logs: `/tmp/process_events_incremental.log`)
- Reprocess all events daily at 00:10 UTC (logs: `/tmp/process_events_full.log`)

Then open `http://localhost:8080` in your browser.

#### Option B: Python Server
Serve the directory using a web server.

**Example with Python:**
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

## Directory Structure
- `data/`: Contains ShakeMap event data.
- `css/`: Stylesheets.
- `js/`: JavaScript logic.
- `index.html`: Main entry point.
- `process_events.sh`: Backend processing script.
- `events.json`: Generated data file.

## Customization
- **Map Layers**: configured in `js/app.js` (`initMap` function).
- **Styles**: `css/style.css`.

## Thanks to
This work has been partially funded by the Seismology and Earthquake Engineering Research Infrastructure Alliance for Europe (SERA) project (European Union’s Horizon 2020 research and innovation program Grant Agreement Number 730900) and by the Italian Civil Protection (2019–2021) B2 ShakeMap adjournment project.

## Contribute
Thanks to your contributions!

Here is a list of users who already contributed to this repository: \
<a href="https://github.com/ingv/shakemap4-web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ingv/shakemap4-web" />
</a>

## Author
(c) 2025 Valentino Lauciani valentino.lauciani[at]ingv.it

Istituto Nazionale di Geofisica e Vulcanologia, Italia