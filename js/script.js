// Load achievements from localStorage
function loadAchievements(gameId) {
    const savedAchievements = localStorage.getItem(`${gameId}-achievements`);
    if (savedAchievements) {
        const parsedAchievements = JSON.parse(savedAchievements);
        // Ensure tags array exists for each achievement
        return parsedAchievements.map(achievement => ({
            ...achievement,
            tags: achievement.tags || []
        }));
    }
    
    // Initialize achievements with empty tags array if not present
    const achievements = window.gameAchievements.map(achievement => ({
        ...achievement,
        completed: false,
        pinned: false,
        tags: achievement.tags || []
    }));
    
    // Save to localStorage
    saveAchievements(gameId, achievements);
    
    return achievements;
}

// Save achievements to localStorage
function saveAchievements(gameId, achievements) {
    localStorage.setItem(`${gameId}-achievements`, JSON.stringify(achievements));
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

    return `
        <div class="achievement-card ${achievement.completed ? 'completed' : ''} ${achievement.pinned ? 'pinned' : ''}" data-id="${achievement.id}">
            <div class="checkbox"></div>
            <div class="achievement-icon">
                <img src="../../images/achievements/${gameId}/${achievement.icon}" alt="${achievement.name}">
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
function toggleAchievement(id, gameId) {
    const achievements = loadAchievements(gameId); // Load once
    const achievement = achievements.find(a => a.id === parseInt(id));
    
    if (achievement) {
        achievement.completed = !achievement.completed;
        if (achievement.completed) {
            achievement.pinned = false; // Unpin when completed
        }
        saveAchievements(gameId, achievements); // Save once
        displayAchievements(gameId); // Re-render
    }
}

// Toggle achievement pin
function togglePin(id, gameId) {
    const achievements = loadAchievements(gameId); // Load once
    const achievement = achievements.find(a => a.id === parseInt(id));
    
    if (achievement && !achievement.completed) {
        achievement.pinned = !achievement.pinned;
        saveAchievements(gameId, achievements); // Save once
        displayAchievements(gameId); // Re-render
    }
}

// Toggle achievement tag
function toggleTag(id, tag, gameId) {
    const achievements = loadAchievements(gameId); // Load once
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
        
        saveAchievements(gameId, achievements); // Save once
        displayAchievements(gameId); // Re-render
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

// Reset game progress
function resetGameProgress(gameId) {
    if (confirm('Are you sure you want to reset all progress for this game? This cannot be undone.')) {
        localStorage.removeItem(`${gameId}-achievements`);
        window.location.reload();
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