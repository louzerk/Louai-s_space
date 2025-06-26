document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    // Dark mode toggle listener
    darkModeToggle.addEventListener('change', function() {
        if (this.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
    });

    // Add improved comment styles
    addImprovedCommentStyles();

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

// Display comments in the DOM - IMPROVED VERSION
function displayComments(comments) {
    const commentsSection = document.getElementById('comments_section');
    if (!commentsSection) return;

    commentsSection.innerHTML = '';

    if (comments.length === 0) {
        commentsSection.innerHTML = `
            <div class="no-comments">
                <div class="no-comments-icon">💬</div>
                <p>No reviews yet. Be the first to share your thoughts!</p>
            </div>
        `;
        return;
    }

    comments.forEach((comment, index) => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-card';
        commentElement.style.animationDelay = `${index * 0.1}s`;

        const date = new Date(comment.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Get initials for avatar
        const initials = comment.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();

        commentElement.innerHTML = `
            <div class="comment-header">
                <div class="comment-avatar">${initials}</div>
                <div class="comment-info">
                    <div class="comment-author">${escapeHtml(comment.name)}</div>
                    <div class="comment-date">${date}</div>
                </div>
            </div>
            <div class="comment-content">
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
            </div>
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

// Enhanced CSS for better comment styling
function addImprovedCommentStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Comments container */
        #comments_section {
            max-height: 400px;
            overflow-y: auto;
            padding: 15px;
            scrollbar-width: thin;
            scrollbar-color: #ccc transparent;
        }

        #comments_section::-webkit-scrollbar {
            width: 6px;
        }

        #comments_section::-webkit-scrollbar-track {
            background: transparent;
        }

        #comments_section::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 3px;
        }

        /* No comments state */
        .no-comments {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }

        .no-comments-icon {
            font-size: 48px;
            margin-bottom: 15px;
            opacity: 0.5;
        }

        .no-comments p {
            font-style: italic;
            margin: 0;
            font-size: 16px;
        }

        /* Comment cards */
        .comment-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
            animation: slideIn 0.5s ease forwards;
            opacity: 0;
            transform: translateY(20px);
        }

        .comment-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        }

        .comment-card:last-child {
            margin-bottom: 0;
        }

        /* Comment header */
        .comment-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }

        .comment-avatar {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 14px;
            margin-right: 15px;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .comment-info {
            flex: 1;
        }

        .comment-author {
            font-weight: 600;
            color: #2d3748;
            font-size: 16px;
            margin-bottom: 3px;
        }

        .comment-date {
            color: #718096;
            font-size: 13px;
            font-weight: 400;
        }

        /* Comment content */
        .comment-content {
            padding-left: 0;
        }

        .comment-text {
            color: #4a5568;
            line-height: 1.6;
            font-size: 15px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        /* Animation */
        @keyframes slideIn {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Dark mode styles */
        body.dark-mode .comment-card {
            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            border-color: rgba(255, 255, 255, 0.1);
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        }

        body.dark-mode .comment-card:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        body.dark-mode .comment-avatar {
            background: linear-gradient(135deg, #FFB6B6 0%, #FF8A80 100%);
            color: #1a202c;
            box-shadow: 0 2px 8px rgba(255, 182, 182, 0.3);
        }

        body.dark-mode .comment-author {
            color: #f7fafc;
        }

        body.dark-mode .comment-date {
            color: #a0aec0;
        }

        body.dark-mode .comment-text {
            color: #e2e8f0;
        }

        body.dark-mode .no-comments {
            color: #a0aec0;
        }

        body.dark-mode #comments_section::-webkit-scrollbar-thumb {
            background: #4a5568;
        }

        /* Mobile responsiveness */
        @media screen and (max-width: 480px) {
            .comment-card {
                padding: 16px;
                margin-bottom: 12px;
                border-radius: 12px;
            }

            .comment-avatar {
                width: 40px;
                height: 40px;
                font-size: 13px;
                margin-right: 12px;
            }

            .comment-author {
                font-size: 15px;
            }

            .comment-text {
                font-size: 14px;
            }

            #comments_section {
                max-height: 300px;
                padding: 10px;
            }
        }
    `;
    document.head.appendChild(style);
}
