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

## Fetching Game Data (Steam)

To automatically fetch achievement data, descriptions, icons, and the game cover image directly from Steam, you can use the provided Python helper script.

**Prerequisites:**

1.  **Python 3:** Ensure you have Python 3 installed on your system.
2.  **Steam Web API Key:** You need a Steam Web API key. You can obtain one from the [Steam Developer website](https://steamcommunity.com/dev/apikey).
3.  **Dependencies:** Install the required Python libraries:
    ```bash
    pip install -r requirements.txt
    ```

**Setup:**

1.  **API Key:** Create a file named `.env` in the project's root directory.
2.  Add your Steam Web API key to the `.env` file like this:
    ```
    STEAM_API_KEY=YOUR_ACTUAL_STEAM_API_KEY
    ```
    Replace `YOUR_ACTUAL_STEAM_API_KEY` with the key you obtained.
    *(This `.env` file is included in `.gitignore` to prevent accidental commits of your key).*

**Running the Script:**

Execute the script from your terminal, providing the Steam App ID of the game you want to add:

```bash
python fetch_steam_data.py <STEAM_APP_ID>
```

Replace `<STEAM_APP_ID>` with the numerical App ID of the game (you can usually find this in the game's store page URL on Steam).

**Example:**

```bash
python fetch_steam_data.py 2556990
```

**What the script does:**

*   Fetches game details (name, cover image) from the Steam Storefront API.
*   Fetches achievement details (ID, name, description, icon URL) from the Steam Web API.
*   Creates the necessary directory structure: `games/<game_name_sanitized>/` with `js/` and `images/` subdirectories.
*   Downloads the game's header image as `games/<game_name_sanitized>/images/header.jpg`.
*   Downloads each achievement's icon into `games/<game_name_sanitized>/images/` (named `<achievement_api_name>.jpg`).
*   Generates the `games/<game_name_sanitized>/js/achievements.js` file, populating `window.gameAchievements` with the fetched data and correct relative image paths.
*   **Finds an existing game's `index.html` to use as a template.** (Requires at least one game to exist already).
*   **Creates the new game's `index.html` page** by copying the template and replacing the title, headings, breadcrumb, total achievement count, and `gameId`.
*   **Adds a new game card to the main `index.html`** file, linking to the new game page and using its header image.

**After running the script:**

*   Verify the generated files (`games/<game_name_sanitized>/index.html`, `js/achievements.js`, and the images).
*   Verify the new game card appears correctly on the main `index.html` page.
*   You might need to manually create a placeholder image at `images/games/placeholder_cover.jpg` if the script couldn't download a game's cover image and you want a fallback. 