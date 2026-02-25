# Contributing to GPU Server Tour

Thank you for your interest in contributing! This guide will walk you through adding new images and hotspots to the project.

## Table of Contents

1. [Adding a New Image](#adding-a-new-image)
2. [Getting Polygon Coordinates](#getting-polygon-coordinates)
3. [Adding Hotspots to data.js](#adding-hotspots-to-datajs)
4. [Writing Descriptions](#writing-descriptions)
5. [Making a Pull Request](#making-a-pull-request)

---

## Adding a New Image

1. **Choose your image**: Add a PNG or JPG image to the `images/` folder.

2. **Note the dimensions**: You'll need the pixel width and height. You can find this by:
   - Opening the image in a preview app
   - Or running: `file images/your-image.png`

3. **Add the image entry** to `data.js` under the `images` array:

```javascript
{
  id: "your-image-id",
  src: "images/your-image.png",
  alt: "Description of what the image shows",
  hotspots: [],
},
```

---

## Getting Polygon Coordinates

We'll use [PolygonZone by Roboflow](https://polygonzone.roboflow.com/) to draw polygons.

### Steps:

1. Go to [polygonzone.roboflow.com](https://polygonzone.roboflow.com/)

2. **Drop your image** onto the page

3. **Draw polygons**:
   - Press `P` to enter Polygon mode
   - Click to add points around the component
   - Press `Enter` to finish the polygon
   - Repeat for each component

4. **Get the coordinates**:
   - Click **"View JSON Points"**
   - Copy the JSON format

5. **Convert to our format**: The coordinates need to be a flat array. Convert from:
   ```json
   [{"x": 100, "y": 200}, {"x": 300, "y": 200}, ...]
   ```
   To:
   ```javascript
   [100, 200, 300, 200, ...]
   ```

---

## Adding Hotspots to data.js

Add each hotspot to the `hotspots` array for your image:

```javascript
{
  id: "unique-component-id",
  label: "Component Name",
  pointsPx: [x1, y1, x2, y2, x3, y3, ...],  // Flat X,Y list
  sourceWidth: 1280,   // Your image width
  sourceHeight: 963,   // Your image height
  content: {
    title: "Component Name",
    what: "Brief description of what this component is.",
    role: "Brief description of what this component does."
  }
}
```

### Tips:

- Use unique IDs (e.g., `pcie-gpu-1`, `ram-module-2`)
- For similar components, use consistent labels (e.g., "Host memory (RAM)" for all RAM modules)
- List coordinates in clockwise or counter-clockwise order

---

## Writing Descriptions

Each hotspot needs two description fields:

| Field | Purpose | Length |
|-------|---------|--------|
| `what` | What the component is | 1-2 sentences |
| `role` | What the component does | 1-2 sentences |

### Example:

```javascript
content: {
  title: "PCIe GPU",
  what: "A graphics processing unit installed in a PCIe slot, containing the GPU chip, memory, and power delivery components.",
  role: "Accelerates parallel computing tasks like AI training, inference, and scientific simulations."
}
```

### Guidelines:

- Keep descriptions concise (2-3 sentences total)
- Use consistent terminology across similar components
- Focus on the component's purpose in a GPU server context
- Avoid Chinese or other non-English text

---

## Making a Pull Request

1. **Fork the repository** (if you don't have access)

2. **Create a new branch**:
   ```bash
   git checkout -b add/new-image-name
   ```

3. **Make your changes**:
   - Add your image to `images/`
   - Update `data.js` with hotspots and descriptions

4. **Test locally**: Open `index.html` in a browser to verify everything works

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add new image with hotspots"
   ```

6. **Push and create PR**:
   ```bash
   git push origin add/new-image-name
   ```
   Then open a pull request on GitHub.

---

## Quick Reference

| File | Purpose |
|------|---------|
| `data.js` | Contains all image and hotspot data |
| `app.js` | Application logic (usually no changes needed) |
| `styles.css` | Styling (popup appearance, etc.) |
| `index.html` | Main HTML structure |

---

## Questions?

If you have any questions, feel free to open an issue or ask in the PR comments!
