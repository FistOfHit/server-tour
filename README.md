# GPU Server Tour

An interactive image viewer for exploring GPU server hardware components.

Visit **https://fistofhit.github.io/server-tour/** to check it out!

## Overview

This application displays a guided tour of a GPU server with interactive hotspots. Click on any highlighted area to learn more about the component.

**No build step or server required.** Open `index.html` directly in a modern browser (from disk or from any static host). Optionally, run `npm install` then `npm run dev` to serve the folder locally; the app works the same either way.

## Development

- **Install:** `npm install`
- **Run locally:** `npm run dev` (serves the folder)
- **Lint:** `npm run lint`
- **Format:** `npm run format` (or `npm run format:check` to check only)

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add images and hotspots.

## Images Included

- **front.png** - Front view with drive bays and ventilation
- **top.png** - Top view with GPUs, CPUs, RAM exposed
- **back.png** - Rear view with PCIe slots and power supplies
- **cables.jpg** - Cable detail view
- **GPU.jpg** - GPU front detail
- **GPU_back.png** - GPU back detail
- **drive_bays.png** - Drive and fan bays

## Usage

Open `index.html` in a web browser. Use the left/right arrows or the image strip to navigate between views. Click highlighted areas to see component descriptions. Keyboard: arrow keys to change slide, Enter/Space on a hotspot to open its popup, Escape to close.

## Project structure

| File         | Purpose                                                                                                                                                                                                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html` | Entry point; structure and required element IDs (see comments in file).                                                                                                                                                                                                                                                                                  |
| `data.js`    | Tour content: `SERVER_TOUR_DATA.images` (slides and hotspots). See JSDoc and CONTRIBUTING for the data schema.                                                                                                                                                                                                                                           |
| `app.js`     | All behavior. Sections: **state** (current slide, active hotspot), **dom** (element refs, layout, escapeHtml), **geometry** (hotspot coordinates → SVG path), **popup** (show/position/close), **viewer** (render hotspot overlay), **navigation** (strip, goToSlide, prev/next). Startup: `initData()` → `initDom()` → `initEvents()` → `initViewer()`. |
| `styles.css` | Theming and layout (base, viewer, hotspots, strip, popup, responsive).                                                                                                                                                                                                                                                                                   |

### Hotspot geometry

Hotspots are defined in `data.js` with polygon coordinates in **source image pixels** (`pointsPx`, `sourceWidth`, `sourceHeight`). The app scales these to the **displayed** image size (aspect ratio preserved, never upscaled). Optional fields `adjustOffsetX/Y` and `adjustScaleX/Y` let you nudge or scale a polygon if alignment is off after adding a new image. See CONTRIBUTING for the full data schema.

## Adding Hotspots

Edit `data.js`. Each hotspot needs an `id`, `label`, `pointsPx` (flat x,y list), `sourceWidth`, `sourceHeight`, and `content` (title, what, role). See CONTRIBUTING for step-by-step instructions and the full schema including optional fields.

## Tech stack

- Vanilla JavaScript (no frameworks or bundler)
- HTML5 / CSS3
- SVG for interactive hotspot overlays
