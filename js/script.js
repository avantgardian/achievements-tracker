// Load achievements, merging base data with user progress from localStorage
function loadAchievements(gameId) {
    // DEBUGGING START
    console.log(`loadAchievements called for gameId: "${gameId}"`);
    console.log('Current window.gameAchievements:', window.gameAchievements);
    // DEBUGGING END

    const baseAchievements = window.gameAchievements || []; // Ensure base data exists
    const userProgressKey = `${gameId}-progress`;
    const legacyAchievementsKey = `${gameId}-achievements`; // Old key

    let userProgress = {};
    const savedProgress = localStorage.getItem(userProgressKey);
    const legacySavedData = localStorage.getItem(legacyAchievementsKey);

    if (savedProgress) {
        // New format exists, load it
        try {
            userProgress = JSON.parse(savedProgress);
        } catch (e) {
            console.error(`Error parsing user progress for ${gameId}:`, e);
            localStorage.removeItem(userProgressKey); // Clear corrupted data
            userProgress = {};
        }
    } else if (legacySavedData) {
        // New format doesn't exist, but old format does: MIGRATE
        console.log(`Migrating localStorage data for ${gameId}...`);
        try {
            const legacyAchievements = JSON.parse(legacySavedData);
            userProgress = {};
            legacyAchievements.forEach(ach => {
                // Ensure ach and ach.id exist before trying to access properties
                if (ach && ach.id !== undefined) {
                    userProgress[ach.id] = {
                        completed: ach.completed || false,
                        pinned: ach.pinned || false,
                        tags: Array.isArray(ach.tags) ? ach.tags : [] // Ensure tags is an array
                    };
                } else {
                     console.warn(`Skipping invalid achievement data during migration for ${gameId}:`, ach);
                }
            });
            // Save in the new format
            localStorage.setItem(userProgressKey, JSON.stringify(userProgress));
            // Optionally remove the old key after successful migration
            localStorage.removeItem(legacyAchievementsKey);
             console.log(`Migration complete for ${gameId}.`);
        } catch (e) {
            console.error(`Error migrating legacy data for ${gameId}:`, e);
             // If migration fails, don't delete the old key, clear potential new key
            localStorage.removeItem(userProgressKey);
            userProgress = {}; 
        }
    } 
    // If neither exists, userProgress remains {} and will be handled below

    // Merge base data with user progress
    const mergedAchievements = baseAchievements.map(baseAch => {
         // Ensure baseAch and baseAch.id exist
        if (!baseAch || baseAch.id === undefined) {
            console.warn(`Invalid base achievement data found for ${gameId}:`, baseAch);
            return null; // Skip invalid base achievement
        }
        const progress = userProgress[baseAch.id] || {}; // Get progress or empty obj
        
        // Ensure baseAch.tags is an array before attempting to use it
        const baseTags = Array.isArray(baseAch.tags) ? baseAch.tags : [];
        // Ensure progress.tags is an array
        const savedTags = Array.isArray(progress.tags) ? progress.tags : [];

        return {
            ...baseAch, // Start with base data (id, name, desc, icon, original tags etc.)
            completed: progress.completed || false, // Apply saved/default state
            pinned: progress.pinned || false,       // Apply saved/default state
             // Prefer saved tags if they exist, otherwise use base tags, fallback to empty array
            tags: savedTags.length > 0 ? savedTags : baseTags 
        };
    }).filter(ach => ach !== null); // Filter out any null entries from invalid base data

    // It's generally better to let callers decide when to save.
    // Avoid saving automatically on load unless strictly necessary.
    
    return mergedAchievements;
}

// Save ONLY user-specific achievement progress to localStorage
function saveAchievements(gameId, achievements) {
    const userProgressKey = `${gameId}-progress`;
    const userProgress = {};

    achievements.forEach(ach => {
        // Only store state that can change and ensure ach.id exists
        if (ach && ach.id !== undefined) {
            userProgress[ach.id] = {
                completed: ach.completed || false, // Ensure boolean
                pinned: ach.pinned || false,     // Ensure boolean
                tags: Array.isArray(ach.tags) ? ach.tags : [] // Ensure array
            };
        } else {
            console.warn(`Attempted to save achievement with invalid data for ${gameId}:`, ach);
        }
    });

    try {
        localStorage.setItem(userProgressKey, JSON.stringify(userProgress));
    } catch (e) {
        console.error(`Error saving user progress for ${gameId}:`, e);
        // Handle potential storage errors (e.g., quota exceeded)
        alert("Failed to save progress. Local storage might be full or disabled.");
    }
}

// Display achievements in the grid
function displayAchievements(gameId) {
    const achievementsGrid = document.getElementById('achievements-grid');
    // Ensure the grid has the gameId data attribute (might be set in initializeApp too)
    if (achievementsGrid && !achievementsGrid.dataset.gameId) {
        achievementsGrid.dataset.gameId = gameId;
    }
    const achievements = loadAchievements(gameId);
    
    // Sort achievements: pinned first, then uncompleted, then completed
    const sortedAchievements = [...achievements].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
        return 0;
    });

    // Split achievements into completed and uncompleted
    const uncompletedAchievements = sortedAchievements.filter(a => !a.completed);
    const completedAchievements = sortedAchievements.filter(a => a.completed);

    // Generate HTML for uncompleted achievements
    let html = uncompletedAchievements.map(achievement => generateAchievementCard(achievement, gameId)).join('');

    // Add separator and completed achievements if there are any
    if (completedAchievements.length > 0) {
        html += `
            <div class="completed-separator">
                Completed Achievements (${completedAchievements.length})
            </div>
            ${completedAchievements.map(achievement => generateAchievementCard(achievement, gameId)).join('')}
        `;
    }

    achievementsGrid.innerHTML = html;

    // Update progress bar
    updateProgress(achievements);
}

// Helper function to position the tag selector using FIXED positioning
function positionTagSelectorFixed(button, selector) {
    const buttonRect = button.getBoundingClientRect(); // Coords relative to viewport
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Temporarily apply show class to measure, but keep invisible
    selector.style.visibility = 'hidden';
    selector.classList.add('show');
    const selectorHeight = selector.offsetHeight; 
    const selectorWidth = selector.offsetWidth;
    selector.classList.remove('show');
    selector.style.visibility = 'visible';
    // End temporary measure

    let top;
    // Prefer below
    if (buttonRect.bottom + selectorHeight + 5 < windowHeight) {
        top = buttonRect.bottom + 5;
    } 
    // Else try above
    else if (buttonRect.top - selectorHeight - 5 > 0) {
        top = buttonRect.top - selectorHeight - 5;
    } 
    // Fallback: position near top edge if no space above/below
    else {
        top = 5; 
    }

    let left = buttonRect.left;
    // Prevent going off right edge
    if (left + selectorWidth + 5 > windowWidth) {
         left = windowWidth - selectorWidth - 5;
    }
    // Prevent going off left edge
    if (left < 5) {
        left = 5;
    }

    // Apply styles (relies on CSS setting position:fixed)
    selector.style.top = `${top}px`;
    selector.style.left = `${left}px`;
}

// Generate HTML for a single achievement card
function generateAchievementCard(achievement, gameId) {
    // console.log('Generating card for achievement:', achievement); // Debug log removed
    const tagsHtml = achievement.tags && achievement.tags.length > 0 
        ? achievement.tags.map(tag => getTagHtml(tag)).join('') 
        : '';

    // console.log('Tags HTML:', tagsHtml); // Debug log removed

    // --- CORRECTED IMAGE SRC --- 
    // The achievement.icon path is already relative to the game's index.html (e.g., "images/icon.jpg")
    const iconPath = achievement.icon ? achievement.icon : ''; // Use icon path directly, provide fallback if empty

    return `
        <div class="achievement-card ${achievement.completed ? 'completed' : ''} ${achievement.pinned ? 'pinned' : ''}" data-id="${achievement.id}">
            <div class="checkbox"></div>
            <div class="achievement-icon">
                <img src="${iconPath}" alt="${achievement.name}">
            </div>
            <div class="achievement-info">
                <h3>${achievement.name}</h3>
                <p>${achievement.description}</p>
                <div class="achievement-tags">
                    ${tagsHtml}
                    ${!achievement.completed ? `
                        <button class="add-tag-button">+ Add Tag</button>
                        <div class="tag-selector">
                            ${getTagSelectorHtml()}
                        </div>
                    ` : ''}
                </div>
            </div>
            ${!achievement.completed ? `<button class="pin-button">📌</button>` : ''}
        </div>
    `;
}

// Toggle achievement completion
async function toggleAchievement(id, gameId) {
    const cardElement = document.querySelector(`.achievement-card[data-id="${id}"]`);

    // Add class and wait for animation if the card exists
    if (cardElement) {
        cardElement.classList.add('is-moving-out');
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for animation (match CSS)
    }

    // --- MODIFICATION START ---
    // Assume the achievement exists since the card was clicked.
    // Fetch current state just for saving.
    const currentAchievements = loadAchievements(gameId);
    // --- FIX: Parse the id string from dataset to integer for comparison ---
    const achievementToUpdate = currentAchievements.find(a => a.id === parseInt(id));

    if (achievementToUpdate) {
        achievementToUpdate.completed = !achievementToUpdate.completed;
        if (achievementToUpdate.completed) {
            achievementToUpdate.pinned = false; // Unpin when completed
        }
        saveAchievements(gameId, currentAchievements); // Save the modified list
        displayAchievements(gameId); // Re-render using loadAchievements
    // --- MODIFICATION END ---
    } else {
        // This block should ideally not be reached if the card existed,
        // but keep the error log just in case.
        console.error(`[toggleAchievement] Achievement data not found for ID: ${id} in game: ${gameId} after assuming it exists.`);
        // If we animated out but didn't find the data, remove the class to make it reappear
        if (cardElement) {
            cardElement.classList.remove('is-moving-out');
        }
    }
}

// Toggle achievement pin
async function togglePin(id, gameId) {
    const cardElement = document.querySelector(`.achievement-card[data-id="${id}"]`);
    
    // Add class and wait for animation if the card exists
    if (cardElement) {
        cardElement.classList.add('is-moving-out');
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for animation (match CSS)
    }
    
    const achievements = loadAchievements(gameId);
    // --- FIX: Parse the id string from dataset to integer for comparison ---
    const achievement = achievements.find(a => a.id === parseInt(id));

    if (achievement && !achievement.completed) {
        achievement.pinned = !achievement.pinned;
        saveAchievements(gameId, achievements); // Save once
        displayAchievements(gameId); // Re-render
    } else {
        // Optional: Log error if achievement not found
        console.error(`Achievement data not found for ID: ${id} in game: ${gameId}`);
        // If we animated out but didn't find the data, remove the class
        if (cardElement) {
            cardElement.classList.remove('is-moving-out');
        }
    }
}

// Toggle achievement tag
function toggleTag(id, tag, gameId) { 
    // console.log(`toggleTag called for id: ${id}, tag: ${tag}, gameId: ${gameId}, timestamp: ${Date.now()}`); // DEBUG LINE REMOVED
    const achievements = loadAchievements(gameId);
    // --- FIX: Parse the id string from dataset to integer for comparison ---
    const achievement = achievements.find(a => a.id === parseInt(id));
    
    if (achievement) {
        if (!achievement.tags) {
            achievement.tags = [];
        }
        
        const tagIndex = achievement.tags.indexOf(tag);
        if (tagIndex === -1) {
            achievement.tags.push(tag);
        } else {
            achievement.tags.splice(tagIndex, 1);
        }
        
        saveAchievements(gameId, achievements); // Save the updated data

        // --- NEW: Target DOM update for the specific card's tags --- 
        const cardElement = document.querySelector(`.achievement-card[data-id="${id}"]`);
        if (cardElement) {
            const tagsContainer = cardElement.querySelector('.achievement-tags');
            if (tagsContainer) {
                // Regenerate HTML only for the tags based on the updated achievement.tags
                const newTagsHtml = achievement.tags && achievement.tags.length > 0 
                    ? achievement.tags.map(t => getTagHtml(t)).join('') 
                    : '';
                
                // Find existing tags and the button to replace smartly
                const existingTags = tagsContainer.querySelectorAll('.achievement-tag');
                const addTagButton = tagsContainer.querySelector('.add-tag-button');
                const tagSelector = tagsContainer.querySelector('.tag-selector'); // Keep selector if exists

                // Clear existing tags
                existingTags.forEach(tagEl => tagEl.remove());

                // Insert new tags HTML before the add button (if button exists)
                if (addTagButton) {
                    addTagButton.insertAdjacentHTML('beforebegin', newTagsHtml);
                } else {
                    // If no add button (e.g., completed), just set the innerHTML
                    // (Might need adjustment if other elements are inside)
                    tagsContainer.innerHTML = newTagsHtml; 
                }
            }
        }
        // --- Removed call to displayAchievements and setTimeout --- 

    } else {
        // Optional: Log error if achievement not found (shouldn't normally happen)
        console.error(`Achievement data not found for ID: ${id} in game: ${gameId}`);
    }
}

// Update progress bar
function updateProgress(achievements) {
    const total = achievements.length;
    const completed = achievements.filter(a => a.completed).length;
    const percentage = (completed / total) * 100;
    
    document.getElementById('progress').style.width = `${percentage}%`;
    document.getElementById('progress-text').textContent = `${completed}/${total} Achievements`;
}

// Reset game progress by removing user progress data
function resetGameProgress(gameId) {
    if (confirm('Are you sure you want to reset all progress for this game? This cannot be undone.')) {
        localStorage.removeItem(`${gameId}-progress`); // Use the new key
        // Also attempt to remove the legacy key in case migration didn't happen or failed
        localStorage.removeItem(`${gameId}-achievements`); 
        // --- FIX: Directly call displayAchievements to re-render --- 
        displayAchievements(gameId); // Re-render the list with default state
        // initializeApp(gameId); // OLD: Caused re-adding listeners
        // Optionally, could do a full reload: window.location.reload(); 
    }
}

// Initialize reset button if it exists
function initializeResetButton(gameId) {
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', () => resetGameProgress(gameId));
    }
}

// ----- NEW Initialization Function ----- 
function initializeApp(gameId) {
    const achievementsGrid = document.getElementById('achievements-grid');
    if (!achievementsGrid) {
        console.error('Initialization failed: #achievements-grid not found.');
        return;
    }

    // Store gameId on the grid element for the listener to access
    achievementsGrid.dataset.gameId = gameId;

    // --- Attach Delegated Event Listener ONCE --- 
    achievementsGrid.addEventListener('click', (e) => {
        const currentGrid = e.currentTarget; // Use currentTarget to get the grid
        const currentGameId = currentGrid.dataset.gameId; // Get gameId from data attribute
        if (!currentGameId) return; // Exit if gameId isn't set

        const card = e.target.closest('.achievement-card');
        if (!card) return; // Click wasn't inside an achievement card

        const achievementId = card.dataset.id;

        // Checkbox click
        if (e.target.matches('.checkbox')) {
            e.stopPropagation();
            toggleAchievement(achievementId, currentGameId);
            return;
        }

        // Pin button click
        if (e.target.matches('.pin-button')) {
            e.stopPropagation();
            togglePin(achievementId, currentGameId);
            return;
        }

        // Existing tag click (for removal)
        const clickedTag = e.target.closest('.achievement-tag');
        if (clickedTag && !clickedTag.matches('.add-tag-button')) {
             e.stopPropagation();
             if (!card.classList.contains('completed')) {
                 // --- Reverted: Call toggleTag directly --- 
                 toggleTag(achievementId, clickedTag.dataset.tag, currentGameId);
             }
             return;
        }

        // Add tag button click
        const addTagButton = e.target.closest('.add-tag-button');
        if (addTagButton) {
            e.stopPropagation();
            const tagSelector = card.querySelector('.tag-selector');
            if (!tagSelector) return;

            const isCurrentlyShown = tagSelector.classList.contains('show');

            // Always close others *before* potentially opening/closing the new one
            document.querySelectorAll('.tag-selector.show').forEach(selector => {
                if (selector !== tagSelector) {
                    selector.classList.remove('show');
                }
            });

            // If it wasn't shown, position it *before* showing
            if (!isCurrentlyShown) {
                positionTagSelectorFixed(addTagButton, tagSelector); // Use NEW positioning func
            }
            
            // Toggle visibility of the clicked selector
            tagSelector.classList.toggle('show');
            return;
        }

        // Tag option click (inside selector)
        const tagOption = e.target.closest('.tag-option');
        if (tagOption) {
            e.stopPropagation();
            const tagSelector = tagOption.closest('.tag-selector');
            const tag = tagOption.dataset.tag;
            toggleTag(achievementId, tag, currentGameId);
            if (tagSelector) {
                tagSelector.classList.remove('show');
            }
            return;
        }
    });

    // --- Attach Document Click Listener for closing tags ONCE --- 
    if (!document._closeTagSelectorListenerAdded) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.add-tag-button') && !e.target.closest('.tag-selector')) {
                document.querySelectorAll('.tag-selector.show').forEach(selector => {
                    selector.classList.remove('show');
                });
            }
        });
        document._closeTagSelectorListenerAdded = true;
    }

    // --- Initialize other components --- 
    initializeResetButton(gameId);

    // --- Initial Render --- 
    displayAchievements(gameId);
} 