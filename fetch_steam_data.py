import requests
import os
import argparse
import json
import re
import shutil # Added for file copying
from pathlib import Path # Added for easier path manipulation
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

STEAM_API_KEY = os.getenv("STEAM_API_KEY")
if not STEAM_API_KEY:
    print("Error: STEAM_API_KEY not found in .env file.")
    exit(1)

# --- Helper Functions ---

def sanitize_filename(name):
    """Remove invalid characters for filenames."""
    # Remove invalid characters
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    # Replace spaces with underscores
    name = name.replace(" ", "_")
    # Optionally truncate if too long (Windows max path issues)
    return name[:100] # Limit length

def sanitize_directory_name(name):
    """Sanitize game name for directory creation."""
    # Basic sanitization: remove problematic chars, replace spaces
    name = re.sub(r'[\\/*?:"<>|\'\\]', '', name) # Removed: / * ? : " < > | ' \
    name = name.replace(' ', '_').replace('-', '_').lower()
    # Remove potential trailing characters like tm, r, etc. and other symbols
    name = re.sub(r'[®™©:!.]$', '', name).strip()
    name = re.sub(r'_+$', '', name) # Remove trailing underscores
    return name[:50] # Limit length for sanity

def download_image(url, filepath):
    """Downloads an image from a URL to a specified path."""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Raise an exception for bad status codes
        # Ensure directory exists before writing
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Successfully downloaded: {filepath}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
        return False
    except IOError as e:
        print(f"Error saving image {filepath}: {e}")
        return False

def find_template_html(games_dir="games"):
    """Finds the first game's index.html to use as a template."""
    games_path = Path(games_dir)
    if not games_path.is_dir():
        print(f"Error: Games directory '{games_dir}' not found.")
        return None

    for item in games_path.iterdir():
        if item.is_dir():
            template_html = item / "index.html"
            if template_html.is_file():
                print(f"Using template: {template_html}")
                return template_html

    print(f"Error: No existing game directory found in '{games_dir}' to use as a template.")
    print("Please add at least one game manually first.")
    return None

# --- API Call Functions ---

def get_steam_achievements(app_id):
    """Fetches achievement data from the Steam Web API."""
    url = f"https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key={STEAM_API_KEY}&appid={app_id}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if "game" in data and "availableGameStats" in data["game"] and "achievements" in data["game"]["availableGameStats"]:
            # Filter out achievements with no name (sometimes occurs)
            valid_achievements = [ach for ach in data["game"]["availableGameStats"]["achievements"] if ach.get("name")]
            return valid_achievements
        else:
            print(f"Warning: Could not find achievements in the API response for app ID {app_id}.")
            # print(f"Response: {data}") # Uncomment for debugging
            return []
    except requests.exceptions.RequestException as e:
        print(f"Error fetching achievements for app ID {app_id}: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response for achievements (App ID: {app_id}): {e}")
        print(f"Raw response text: {response.text}")
        return None


def get_steam_game_details(app_id):
    """Fetches game details (name, header image) from the Steam Storefront API."""
    url = f"https://store.steampowered.com/api/appdetails?appids={app_id}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if str(app_id) in data and data[str(app_id)]["success"]:
            game_data = data[str(app_id)]["data"]
            return {
                "name": game_data.get("name", f"Unknown Game {app_id}"),
                "header_image": game_data.get("header_image", None)
            }
        else:
            print(f"Error: Could not fetch game details for app ID {app_id}. Response success was false or app ID not found.")
            # print(f"Response: {data}") # Uncomment for debugging
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching game details for app ID {app_id}: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response for game details (App ID: {app_id}): {e}")
        print(f"Raw response text: {response.text}")
        return None

# --- Main Logic ---

def process_game(app_id):
    """Main function to process a single game ID."""
    print(f"--- Processing App ID: {app_id} ---")

    # 1. Get Game Details (Name, Cover Image)
    game_details = get_steam_game_details(app_id)
    if not game_details:
        print(f"Failed to get game details for {app_id}. Skipping.")
        return

    game_name = game_details["name"]
    # Basic HTML escaping for display names potentially used in HTML content
    game_name_html_safe = game_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    game_cover_url = game_details["header_image"]
    sanitized_game_name = sanitize_directory_name(game_name)
    print(f"Found game: {game_name} (Directory ID: {sanitized_game_name})")

    # 2. Get Achievements
    achievements_data = get_steam_achievements(app_id)
    if achievements_data is None: # Check for None specifically, as empty list is valid
        print(f"Failed to get achievements for {game_name} ({app_id}). Skipping.")
        return

    num_achievements = len(achievements_data)
    print(f"Found {num_achievements} achievements.")

    if num_achievements == 0:
        print(f"No achievements found for {game_name} ({app_id}). Skipping creation of achievement file and game page.")
        # Optional: Still add to main index? Decided against it for now.
        return

    # 3. Create Directories
    base_game_dir = Path("games") / sanitized_game_name
    js_dir = base_game_dir / "js"
    images_dir = base_game_dir / "images"
    try:
        js_dir.mkdir(parents=True, exist_ok=True)
        images_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created directories: {base_game_dir}, {js_dir}, {images_dir}")
    except OSError as e:
        print(f"Error creating directories for {sanitized_game_name}: {e}")
        return

    # 4. Download Game Cover (now saved to new structure)
    if game_cover_url:
        cover_filename = "header.jpg" # Steam headers are jpg
        cover_filepath = images_dir / cover_filename
        print(f"Downloading game cover to {cover_filepath}...")
        if not download_image(game_cover_url, str(cover_filepath)):
            print(f"Warning: Failed to download cover image. Proceeding without it.")
            cover_filepath = None # Indicate cover download failed
    else:
        print("Warning: No header image URL found for game cover.")
        cover_filepath = None

    # 5. Process and Download Achievement Icons
    processed_achievements = []
    print(f"Processing {num_achievements} achievements...")
    icons_succeeded = 0
    icons_failed = 0
    for ach in achievements_data:
        ach_id = ach.get("name") # Internal Steam Name (API Name)
        display_name = ach.get("displayName", "Unknown Achievement")
        # HTML escape display name and description
        display_name_safe = display_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        description = ach.get("description", "")
        description_safe = description.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        icon_url = ach.get("icon") # Colored icon URL

        if not ach_id:
            # This should be filtered out by get_steam_achievements now, but check anyway
            print(f"Warning: Skipping achievement with missing 'name' (ID): {ach}")
            continue

        if not display_name:
             print(f"Warning: Achievement ID '{ach_id}' has no display name. Using ID as name.")
             display_name_safe = ach_id

        # Save icons using the unique ach_id
        icon_filename = f"{ach_id}.jpg" # Icons seem to be jpg
        icon_filepath = images_dir / icon_filename
        # Path for the JS file should be relative to the game's index.html
        relative_icon_path = f"images/{icon_filename}"

        # Download icon if URL exists
        icon_downloaded = False
        if icon_url:
            if download_image(icon_url, str(icon_filepath)):
                icons_succeeded += 1
                icon_downloaded = True
            else:
                icons_failed += 1
        else:
            print(f"Warning: No icon URL for achievement: {display_name} ({ach_id})")
            icons_failed += 1

        if not icon_downloaded:
             relative_icon_path = "" # Set path to empty if no icon/download failed

        processed_achievements.append({
            "id": ach_id,
            "name": display_name_safe, # Use safe name for JS
            "description": description_safe, # Use safe description
            "icon": relative_icon_path,
            "tags": [] # Default empty tags array
        })

    print(f"Icon downloads: {icons_succeeded} succeeded, {icons_failed} failed/missing.")

    # 6. Generate achievements.js
    js_filepath = js_dir / "achievements.js"
    # Use ensure_ascii=False for potentially non-latin characters in names/descriptions
    js_content = f"window.gameAchievements = {json.dumps(processed_achievements, indent=4, ensure_ascii=False)};"

    try:
        with open(js_filepath, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"Successfully generated: {js_filepath}")
    except IOError as e:
        print(f"Error writing JavaScript file {js_filepath}: {e}")
        return # Stop if we can't write the core data file

    # --- New Steps: Automate HTML generation --- 

    # 7. Find Template HTML
    template_html_path = find_template_html()
    if not template_html_path:
        print("Skipping HTML generation steps as no template was found.")
        return # Stop if no template

    # 8. Create Game's index.html from Template
    new_html_path = base_game_dir / "index.html"
    try:
        template_content = template_html_path.read_text(encoding='utf-8')

        # Perform replacements (adjust patterns if template changes)
        # Title
        title_pattern = re.compile(r"<title>(.*?) - Achievement Tracker</title>")
        new_content = title_pattern.sub(f"<title>{game_name_html_safe} - Achievement Tracker</title>", template_content)
        # Breadcrumb
        breadcrumb_pattern = re.compile(r"<span>(.*?)</span>") # Assumes first span in breadcrumb is the game name
        new_content = breadcrumb_pattern.sub(f"<span>{game_name_html_safe}</span>", new_content, 1) # Replace only the first match
        # H1 Heading
        h1_pattern = re.compile(r"<h1>(.*?)</h1>") # Assumes first H1 is the game name
        new_content = h1_pattern.sub(f"<h1>{game_name_html_safe}</h1>", new_content, 1)
        # Progress Text
        progress_pattern = re.compile(r"<span id=\"progress-text\">.*?/(.*?) Achievements</span>")
        new_content = progress_pattern.sub(f'<span id="progress-text">0/{num_achievements} Achievements</span>', new_content)
        # Game ID Script
        gameid_pattern = re.compile(r"const gameId =\s*['\"](.*?)['\"];")
        new_content = gameid_pattern.sub(f"const gameId = '{sanitized_game_name}';", new_content)

        with open(new_html_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully generated game page: {new_html_path}")

    except FileNotFoundError:
        print(f"Error: Template file not found at {template_html_path}")
        return
    except IOError as e:
        print(f"Error reading/writing game HTML file {new_html_path}: {e}")
        return
    except Exception as e: # Catch potential regex errors or others
        print(f"An unexpected error occurred during game HTML generation: {e}")
        return

    # 9. Update Main index.html
    main_index_path = Path("index.html")
    if not main_index_path.is_file():
        print("Warning: Main index.html not found. Skipping update.")
    else:
        try:
            main_index_content = main_index_path.read_text(encoding='utf-8')
            grid_end_marker = '</div>\n        </main>' # Look for closing tag of games-grid before </main>
            grid_end_index = main_index_content.rfind(grid_end_marker)

            if grid_end_index != -1:
                # Construct new game card HTML
                # Use relative path to the new game's index.html
                game_page_path = f"games/{sanitized_game_name}/index.html"
                # Use relative path to header image within the game's folder
                # Header path needs to be relative TO THE MAIN INDEX.HTML
                cover_image_path_relative = f"games/{sanitized_game_name}/images/header.jpg" if cover_filepath else "images/placeholder.jpg" # Add a fallback placeholder? Or leave src empty?
                # Handle case where cover download failed
                if not cover_filepath:
                    print("Note: Using placeholder image path in main index.html as cover download failed or was missing.")
                    # Example placeholder - create this image manually if needed
                    cover_image_path_relative = "images/games/placeholder_cover.jpg"


                new_card_html = (
                    f'                <a href="{game_page_path}" class="game-card">\n'
                    f'                    <img src="{cover_image_path_relative}" alt="{game_name_html_safe}">\n' # Use safe name for alt text
                    f'                    <div class="game-info">\n'
                    f'                        <h2>{game_name_html_safe}</h2>\n' # Use safe name
                    f'                        <p>{num_achievements} Achievements</p>\n'
                    f'                    </div>\n'
                    f'                </a>\n' # Indentation matches existing cards
                )

                # Insert before the grid end marker
                updated_content = main_index_content[:grid_end_index] + new_card_html + main_index_content[grid_end_index:]

                with open(main_index_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                print(f"Successfully updated main index.html with new game card.")
            else:
                print("Warning: Could not find the end of the .games-grid section in index.html. Manual update required.")

        except IOError as e:
            print(f"Error reading/writing main index.html: {e}")
        except Exception as e:
            print(f"An unexpected error occurred during main index.html update: {e}")

    print(f"--- Finished processing {game_name} ({app_id}) ---")


# --- Main Execution ---

def main():
    parser = argparse.ArgumentParser(description="Fetch Steam game achievements and images, and generate necessary files.")
    parser.add_argument("app_id", help="The Steam App ID of the game.")
    args = parser.parse_args()

    if not args.app_id.isdigit():
        print("Error: App ID must be a number.")
        exit(1)

    process_game(args.app_id)

if __name__ == "__main__":
    main() 