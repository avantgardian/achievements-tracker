# Achievements Tracker

A simple, static web application for tracking video game achievement progress. Built purely with HTML, CSS, and vanilla JavaScript, using `localStorage` for persistence.

## Features

*   **Game Library:** Displays a list of available games to track.
*   **Achievement Lists:** Dedicated pages for each game showing all its achievements.
*   **Completion Tracking:** Mark achievements as completed with a checkbox.
*   **Pinning:** Pin important or currently focused achievements to the top of the list.
*   **Tagging:** Add predefined tags (e.g., Missable, Online, Story, Difficulty, Collectathon) to achievements for filtering or organization (Note: Filtering not yet implemented, but tags can be added/removed).
*   **Progress Visualization:** Shows a progress bar and text indicating the completion percentage for each game.
*   **Local Persistence:** All progress (completions, pins, tags) is saved directly in your browser's `localStorage`.
*   **Reset Progress:** Option to clear all saved progress for a specific game.
*   **Static Hosting Ready:** Designed to be easily hosted on static web hosts like GitHub Pages.

## Tech Stack

*   **HTML5:** Structure and content.
*   **CSS3:** Styling and layout.
    *   Uses **CSS Custom Properties (Variables)** extensively for themeable colors, spacing, fonts, and radii.
    *   Responsive design for usability on different screen sizes.
*   **Vanilla JavaScript (ES6+):**
    *   DOM manipulation for rendering achievement lists.
    *   Event handling using **Event Delegation** for efficient interactions.
    *   `localStorage` API for saving and loading user progress.

## Project Structure

```
.
├── css/
│   └── styles.css        # Main stylesheet with CSS variables
├── games/
│   ├── <game-name>/      # Folder for each specific game
│   │   ├── index.html    # Achievement tracker page for the game
│   │   └── js/
│   │       └── achievements.js # Achievement data for the game
│   └── ...               # More game folders
├── images/
│   ├── achievements/
│   │   └── <game-name>/  # Achievement icons for each game
│   └── games/            # Cover images for games list
├── js/
│   ├── script.js         # Core application logic, rendering, event handling
│   └── tags.js           # Tag definitions and helper functions
├── .gitignore            # Specifies intentionally untracked files
├── index.html            # Main landing page (game list)
└── README.md             # This file
```

## How to Use

1.  **Clone the repository (optional):**
    ```bash
    git clone https://github.com/avantgardian/achievements-tracker.git
    cd achievements-tracker
    ```
2.  **Open in Browser:**
    *   To view the main game list, open the root `index.html` file in your web browser.
    *   To view a specific game's tracker, navigate to `games/<game-name>/index.html` and open it in your browser.

    *Note: No build step or web server is strictly necessary for basic functionality due to the use of relative paths and `localStorage`.*

## Adding a New Game

1.  **Create Folder:** Create a new directory inside the `games/` folder (e.g., `games/my-new-game/`).
2.  **Add `index.html`:** Copy an existing game's `index.html` (e.g., `games/rally-mechanic-simulator/index.html`) into the new folder.
    *   Update the `<title>`, headings (`h1`, `h2`), breadcrumb text, and total achievement count (`progress-text` span).
    *   Crucially, update the `gameId` variable in the inline `<script>` block at the bottom to match your new game's folder name (e.g., `const gameId = 'my-new-game';`).
3.  **Create `js/achievements.js`:** Inside your new game's folder, create a `js` subfolder and add an `achievements.js` file. Define the achievements like in the other games:
    ```javascript
    window.gameAchievements = [
        {
            id: 1, // Unique ID within this game
            name: "Achievement Name",
            description: "How to get it.",
            icon: "icon_file_name.png", // Place this icon in images/achievements/my-new-game/
            tags: [] // Optional: Add default tags like ["story"]
        },
        // ... more achievements
    ];
    ```
4.  **Add Images:**
    *   Place achievement icons referenced in `achievements.js` into `images/achievements/my-new-game/`.
    *   Add a cover image for the game list page into `images/games/my-new-game-cover.jpg` (or similar naming).
5.  **Link from Main `index.html`:** Add a new game card entry to the main `index.html` file, linking to your new game's `index.html` and using its cover image. 