# Release Notes

### Release 2.18.0 (2026-07-02)
  - Credit version 1 (up to v1.28.0, by Dario Jozinović) in the README introduction
  - Clarify the README "Develop" section (purpose of the local mount, dev port, SHAKEMAP_ENV default)

### Release 2.17.0 (2026-06-24)
  - Plot all reported-intensity (macroseismic) points in the Analysis View intensity chart, selected by intensity instead of PGA/PGV thresholds
  - Keep the PGA/PGV analysis charts limited to instrumental (seismic) stations
  - Hide the "Show Reported Intensity" toggle on the PGA/PGV analysis tabs and reorder controls so "Select Site Class" stays aligned
  - Add a per-tab note describing the applied data filters under each analysis chart
  - Fix a tooltip crash on macroseismic points caused by the string "null" in PGA/PGV fields
  - Remove the unused legacy analysis.html page
  - Rename the Analysis View tooltip "MMI" labels to "Intensity"

### Release 2.16.0 (2026-06-18)
  - Update scientific-background-ingv.md

### Release 2.15.0 (2026-06-15)
  - Add sortable columns to the Station List tables (seismic and reported intensity)
  - Add light gray grid lines to the analysis regression plots
  - Fix portal version shown in the footer
  - Add CI check for version alignment across config-base.js, publiccode.yml and CHANGELOG.md
  - Update contributors-ingv.md
  - Add ESM logo
  - Update disclaimer-ingv.md
  - Update contributors-eu.md
  - Add new logo for Croatia
  - Update scientific-background-eu.md

### Release 2.14.0 (2026-05-15)
  - Roll back tracked code, configuration, and documentation to the v2.9.0 state

### Release 2.13.0 (2026-05-14)
  - Validate move directory writability with real create/remove checks

### Release 2.12.0 (2026-05-14)
  - Validate `--no-move` files by opening them instead of relying on permission metadata

### Release 2.11.0 (2026-05-14)
  - Add Docker environment variables for full-rebuild data move configuration
  - Change `--no-move` to read protected event IDs from a text file
  - Exclude Reported Intensity directories during first-boot event processing

### Release 2.10.0 (2026-05-14)
  - Add `process_events.sh` options to move old realtime event directories to `data_storage`
  - Add `--no-move` protection list for event directories that must remain in `data`

### Release 2.9.0 (2026-05-14)
  - Add historical ShakeMap data storage fallback through Nginx while keeping public `/data/...` URLs unchanged
  - Add `--data-realtime-dir` and `--data-storage-dir` options to `process_events.sh`
  - Update Docker startup and cron processing to include storage data only during full rebuilds
  - Add deployment support for an optional historical data storage volume
  - Update documentation for realtime and storage data directories

### Release 2.8.0 (2026-05-08)
  - style: update INGV profile bounding box coordinates

### Release 2.7.0 (2026-05-07)
  - Add code from PR:https://github.com/INGV/shakemap4-web/pull/117
  - Update contributors-eu.md

### Release 2.6.0 (2026-04-17)
  - Align Leaflet JS with the loaded 1.9.4 CSS version
  - Make triangle marker children ignore pointer events for Safari popup clicks
  - Update marker icon to use SVG for better performance
  - Preserve selected basemap when switching event data source

### Release 2.5.0 (2026-04-10)
  - Update scientific-background-eu.md
  - Update disclaimer-eu.md
  - New Develop: 2.5.0-dev

### Release 2.4.0 (2026-04-10)
  - Update images size
  - Update contributors-eu.md
  - Update eu.js
  - Update .gitignore to ignore events_raw.json.tmp
  - Update image file extension in EU profile

### Release 2.3.0 (2026-04-10)
  - Add Reported Intensity badge to event cards
  - Fix image order in EU profiles data
  - Update eu.js
  - Add files via upload
  - Update eu.js

### Release 2.2.0 (2026-04-10)
  - Improve alignment and consistency in action buttons
  - Update text for clarity
  - Update text, labels, and content for clarity
  - Update text from "MMI" to "Intensity"
  - Update label and option text in index.html
  - Update banner layout with new slot configurations
  - Update environment profile file path in README
  - Remove unused config-env.js file and restructure profiles
  - Update content to 'ShakeMap-INGV'
  - Update banner content to 'ShakeMap-EU'
  - Update columns to 3 for right logos grid
  - Update contributors-eu.md
  - Add new contributors' images for EU region
  - Update contributors-eu.md with ShakeMap developers
  - Update message for no stations available
  - Update layer name in comment
  - Update banner content to 'ShakeMapEU'
  - Update comments for clarity
  - Update labels for event type and intensity

### Release 2.1.0 (2026-04-09)
  - Add License in the footer
  - Update citation format in contributors files
  - Update contributors-ingv.md with DOI and citation
  - Add DOI and citation info to contributors files
  - Update event filter options in index.html

### Release 2.0.0 (2026-04-08)
  - Complete project rewrite to version 2.0.0
  - Add Docker build and push workflow with CI/CD automation
  - Update software version and project documentation
  - Add alternative Docker run options and setup instructions
  - Add Docker Pulls badge and improved README
  - Improve lock acquisition and cleanup functions for processing
  - Add cron job for log files management and full event processing
  - Update events.json generation with incremental processing
  - Restructure flat event list into hierarchical structure
  - Add bBox filtering feature for geographic regions
  - Update historical cut-off date and filtering logic
  - Add station list functionality with USGC color scale
  - Update intensity color mapping and station markers
  - Add station list display with filtering capabilities
  - Improve formatUnit function and variable naming
  - Update event card layout styles for responsiveness
  - Add option to process all data during container startup
  - Update tab order and data layer names
  - Add custom configuration overrides in Docker entrypoint
  - Develop 'Information' menu with Contributors and Disclaimers
  - Refactor app.js into modular JavaScript files with ShakeMap namespace
  - Add reported intensity option and EU configuration support
  - Improve banner section with HTML layout options
  - Update environment profile handling for config files
  - Enable reported intensity in EU configuration
  - Add option to enable/disable Reported Intensity
  - Update scientific background and disclaimer pages
  - Clarify funding sources and update author information
