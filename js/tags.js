// Available tags for achievements
window.availableTags = [
    {
        id: "missable",
        name: "Missable",
        description: "This achievement can be missed if certain actions are not taken"
    },
    {
        id: "story",
        name: "Story",
        description: "This achievement is part of the story and cannot be missed"
    },
    {
        id: "difficulty",
        name: "Difficulty",
        description: "This achievement is difficulty dependent"
    },
    {
        id: "collectathon",
        name: "Collectathon",
        description: "This achievement is for collecting a certain number of items"
    },
    {
        id: "online",
        name: "Online",
        description: "This achievement requires an internet connection"
    }
];

// Get tag HTML for the tag selector
function getTagSelectorHtml() {
    return window.availableTags
        .map(tag => `<div class="tag-option ${tag.id}" data-tag="${tag.id}">${tag.name}</div>`)
        .join('');
}

// Get tag HTML for displaying on achievement cards
function getTagHtml(tagId) {
    const tag = window.availableTags.find(t => t.id === tagId);
    if (tag) {
        return `<span class="achievement-tag ${tag.id}" data-tag="${tag.id}" title="${tag.description}">${tag.name}</span>`;
    }
    return '';
} 