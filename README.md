# Visionary Sketch Studio v1.2.5

**Visionary Sketch** is a professional-grade, infinite-canvas Progressive Web App (PWA) designed for vector-based sketching, precision geometric drafting, and artistic shading. 

Developed with a focus on performance and "Infinite Detail," Visionary allows artists to zoom up to 100x into their work without ever seeing a pixel.

## 🚀 Key Features

-   **Infinite Canvas Engine**: Pan and zoom across a boundless workspace.
-   **Vertex Geometry Engine**: Place primitive shapes (Square, Circle, Star, etc.) and double-tap to enter Morph Mode, allowing you to drag individual vertices to create custom organic shapes.
-   **Precision Shading Tool**: A sophisticated airbrush system that uses radial gradients with adjustable smoothness and radius for digital painting.
-   **Lossless SVG Export**: Export your work as standard base64 SVG files that remain perfectly sharp at any print size.
-   **Persistent Gallery**: Integrated IndexedDB storage keeps your artwork safe on your device.
-   **Native PWA Experience**: Installable on iOS/Android for a fullscreen, offline-capable app experience.
-   **Alignment Grid**: Toggleable background grid with Snap-to-Grid functionality for technical drafting.

## 🛠️ Tech Stack

-   **Frontend**: Vanilla JavaScript (ES6+), Canvas API, SVG DOM Injection.
-   **Storage**: IndexedDB (Local persistence).
-   **Offline**: Service Worker caching.
-   **PWA**: Web App Manifest & Apple Touch support.

## 📖 Instructions

-   **Navigation**: Use two fingers to pinch-zoom or pan around the canvas.
-   **Advanced Tools**: Tap the ◈ icon to open the precision drawer.
-   **Morphing**: While a shape is live, double-tap it to reveal vertex points. Drag points to morph.
-   **Finalizing**: Triple-tap anywhere while a shape/line is active to "bake" it into the canvas.
-   **Viewing**: In the Gallery, use pinch-zoom on saved SVGs to see the high-detail vector lines.

## 📄 License

This project is open-source and available under the MIT License. 

Repository: [https://github.com/vicsanity623/Sketch-Art](https://github.com/vicsanity623/Sketch-Art)