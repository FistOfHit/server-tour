# GPU Server Tour

An interactive image viewer for exploring GPU server hardware components.

## Overview

This application displays a guided tour of a GPU server with interactive hotspots. Click on any highlighted area to learn more about the component.

## Images Included

- **front.png** - Front view with drive bays and ventilation
- **top.png** - Top view with GPUs, CPUs, RAM exposed
- **back.png** - Rear view with PCIe slots and power supplies
- **cables.jpg** - Cable detail view
- **GPU.jpg** - GPU front detail
- **GPU_back.png** - GPU back detail
- **drive_bays.png** - Drive and fan bays

## Usage

Simply open `index.html` in a web browser. Use the left/right arrows or the image strip to navigate between views. Click on highlighted areas to see component descriptions.

## Adding Hotspots

To add or modify hotspots, edit `data.js`. Use pixel coordinates from your image editor:

```javascript
{
  id: "unique-id",
  label: "Component name",
  pointsPx: [x1, y1, x2, y2, ...], // flat list of X,Y coordinates
  sourceWidth: 1280,  // image width
  sourceHeight: 963,  // image height
  content: {
    title: "Display title",
    what: "What this component is",
    role: "What it does"
  }
}
```

## Tech Stack

- Vanilla JavaScript
- HTML/CSS
- SVG for interactive hotspots
