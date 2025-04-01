document.addEventListener('DOMContentLoaded', () => {
    const gamesGrid = document.querySelector('.games-grid');

    if (!gamesGrid) {
        console.error('Error: Could not find .games-grid element.');
        return;
    }

    if (typeof gameListData === 'undefined' || !Array.isArray(gameListData)) {
        console.error('Error: gameListData is not defined or not an array.');
        gamesGrid.innerHTML = '<p class="error-message">Could not load game list data.</p>';
        return;
    }

    // Sort the game data alphabetically by title (case-insensitive)
    const sortedGameData = [...gameListData].sort((a, b) => {
        // Ensure titles exist and are strings for comparison
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        
        if (titleA < titleB) {
            return -1;
        }
        if (titleA > titleB) {
            return 1;
        }
        return 0;
    });

    // Generate HTML for each game card
    const gamesHtml = sortedGameData.map(game => {
        // Basic validation for essential properties
        if (!game.href || !game.imgSrc || !game.imgAlt || !game.title || !game.achievementsText) {
            console.warn('Skipping game card due to missing data:', game);
            return ''; // Return empty string for invalid entries
        }

        return `
            <a href="${escapeHtml(game.href)}" class="game-card">
                <img src="${escapeHtml(game.imgSrc)}" alt="${escapeHtml(game.imgAlt)}">
                <div class="game-info">
                    <h2>${escapeHtml(game.title)}</h2>
                    <p>${escapeHtml(game.achievementsText)}</p>
                </div>
            </a>
        `;
    }).join('');

    // Inject the generated HTML into the grid
    gamesGrid.innerHTML = gamesHtml;
});

// Simple HTML escaping function to prevent potential XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        console.warn('Attempted to escape non-string value:', unsafe);
        return ''; // Return empty string or handle appropriately
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 } 