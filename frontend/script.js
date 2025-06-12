document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;


    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }


    darkModeToggle.addEventListener('change', function() {
        if (this.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
    });
});
// Frontend JavaScript for visitor counter and comments

document.addEventListener('DOMContentLoaded', function() {
    // Load visitor count on page load
    loadVisitorCount();

    // Increment visitor count (you might want to do this based on unique visits)
    incrementVisitorCount();

    // Load existing comments
    loadComments();

    // Handle form submission
    const submitButton = document.getElementById('total_visitors_button');
    if (submitButton) {
        submitButton.addEventListener('click', handleCommentSubmission);
    }
});

// Load and display visitor count
async function loadVisitorCount() {
    try {
        const response = await fetch('/api/visitors/count');
        const data = await response.json();

        const titleElement = document.getElementById('total_visitors_title');
        if (titleElement) {
            titleElement.textContent = `Total Visitors : ${data.count}`;
        }
    } catch (error) {
        console.error('Error loading visitor count:', error);
    }
}

// Increment visitor count
async function incrementVisitorCount() {
    try {
        const response = await fetch('/api/visitors/increment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        // Update the display with new count
        const titleElement = document.getElementById('total_visitors_title');
        if (titleElement) {
            titleElement.textContent = `Total Visitors : ${data.count}`;
        }
    } catch (error) {
        console.error('Error incrementing visitor count:', error);
    }
}

// Load and display comments
async function loadComments() {
    try {
        const response = await fetch('/api/comments');
        const comments = await response.json();

        displayComments(comments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Display comments in the DOM
function displayComments(comments) {
    const commentsSection = document.getElementById('comments_section');
    if (!commentsSection) return;

    commentsSection.innerHTML = '';

    if (comments.length === 0) {
        commentsSection.innerHTML = '<p style="color: #666; font-style: italic;">No comments yet. Be the first to leave a review!</p>';
        return;
    }

    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';

        const date = new Date(comment.created_at).toLocaleDateString();

        commentElement.innerHTML = `
            <div class="comment-header">
                <strong class="comment-author">${escapeHtml(comment.name)}</strong>
                <span class="comment-date">${date}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.comment)}</div>
        `;

        commentsSection.appendChild(commentElement);
    });
}

// Handle comment form submission
async function handleCommentSubmission(event) {
    event.preventDefault();

    const nameInput = document.getElementById('total_visitors_input_name');
    const commentTextarea = document.getElementById('total_visitors_textarea_feedback');

    if (!nameInput || !commentTextarea) {
        alert('Form elements not found');
        return;
    }

    const name = nameInput.value.trim();
    const comment = commentTextarea.value.trim();

    // Validation
    if (!name) {
        alert('Please enter your name');
        nameInput.focus();
        return;
    }

    if (!comment) {
        alert('Please write your feedback');
        commentTextarea.focus();
        return;
    }

    if (name.length > 100) {
        alert('Name must be less than 100 characters');
        nameInput.focus();
        return;
    }

    // Disable button to prevent double submission
    const submitButton = document.getElementById('total_visitors_button');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, comment })
        });

        const result = await response.json();

        if (response.ok) {
            // Clear form
            nameInput.value = '';
            commentTextarea.value = '';

            // Reload comments to show the new one
            await loadComments();

            alert('Thank you for your review! It has been posted.');
        } else {
            alert(result.error || 'Failed to submit review');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        alert('Network error. Please try again.');
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Review';
    }
}

// Utility function to escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Optional: Add some CSS for comment styling
function addCommentStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .comment-item {
            background: #f9f9f9;
            border-left: 3px solid #007bff;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        
        .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .comment-author {
            color: #333;
            font-size: 14px;
        }
        
        .comment-date {
            color: #666;
            font-size: 12px;
        }
        
        .comment-text {
            color: #555;
            line-height: 1.4;
            white-space: pre-wrap;
        }
        
        #total_visitors_button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

