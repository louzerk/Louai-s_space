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

    // Add professional comment styles
    addProfessionalCommentStyles();

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

// Display comments in the DOM - PROFESSIONAL VERSION
function displayComments(comments) {
    const commentsSection = document.getElementById('comments_section');
    if (!commentsSection) return;

    commentsSection.innerHTML = '';

    if (comments.length === 0) {
        commentsSection.innerHTML = `
            <div class="pro-no-comments">
                <div class="pro-empty-state">
                    <div class="pro-empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            <path d="M8 9h8M8 13h6"/>
                        </svg>
                    </div>
                    <h3>No reviews yet</h3>
                    <p>Be the first to share your experience and help others discover what makes this special.</p>
                </div>
            </div>
        `;
        return;
    }

    // Add header with count
    const headerElement = document.createElement('div');
    headerElement.className = 'pro-comments-header';
    headerElement.innerHTML = `
        <div class="pro-review-stats">
            <span class="pro-review-count">${comments.length}</span>
            <span class="pro-review-label">${comments.length === 1 ? 'Review' : 'Reviews'}</span>
        </div>
        <div class="pro-divider"></div>
    `;
    commentsSection.appendChild(headerElement);

    // Sort comments by date (newest first)
    const sortedComments = [...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sortedComments.forEach((comment, index) => {
        const commentElement = document.createElement('div');
        commentElement.className = 'pro-comment-card';
        commentElement.style.animationDelay = `${index * 0.15}s`;

        const date = new Date(comment.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Get initials for avatar with better logic
        const nameParts = comment.name.trim().split(' ').filter(part => part.length > 0);
        const initials = nameParts.length >= 2 
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
            : nameParts[0] ? nameParts[0].substring(0, 2).toUpperCase() : 'U';

        // Generate consistent avatar color based on name
        const avatarColors = [
            'rgba(85, 85, 85, 0.9)',
            'rgba(85, 85, 85, 0.8)',
            'rgba(85, 85, 85, 0.7)'
        ];
        const colorIndex = comment.name.charCodeAt(0) % avatarColors.length;

        commentElement.innerHTML = `
            <div class="pro-comment-structure">
                <div class="pro-comment-left">
                    <div class="pro-avatar" style="background: ${avatarColors[colorIndex]}">
                        <span class="pro-avatar-text">${initials}</span>
                        <div class="pro-avatar-ring"></div>
                    </div>
                </div>
                <div class="pro-comment-right">
                    <div class="pro-comment-header">
                        <div class="pro-reviewer-info">
                            <h4 class="pro-reviewer-name">${escapeHtml(comment.name)}</h4>
                            <div class="pro-review-meta">
                                <time class="pro-review-date">${date}</time>
                                <span class="pro-review-badge">Verified Review</span>
                            </div>
                        </div>
                    </div>
                    <div class="pro-comment-body">
                        <div class="pro-quote-mark">"</div>
                        <p class="pro-comment-text">${escapeHtml(comment.comment)}</p>
                    </div>
                </div>
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

// Professional CSS using original color scheme
function addProfessionalCommentStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Enhanced comments container */
        #comments_section {
            max-height: 450px;
            overflow-y: auto;
            padding: 0;
            scrollbar-width: thin;
            scrollbar-color: rgba(85, 85, 85, 0.3) transparent;
            position: relative;
        }

        #comments_section::-webkit-scrollbar {
            width: 8px;
        }

        #comments_section::-webkit-scrollbar-track {
            background: rgba(85, 85, 85, 0.1);
            border-radius: 4px;
        }

        #comments_section::-webkit-scrollbar-thumb {
            background: rgba(85, 85, 85, 0.4);
            border-radius: 4px;
            transition: background 0.3s ease;
        }

        #comments_section::-webkit-scrollbar-thumb:hover {
            background: rgba(85, 85, 85, 0.6);
        }

        /* Professional no comments state */
        .pro-no-comments {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 280px;
            padding: 40px 20px;
        }

        .pro-empty-state {
            text-align: center;
            max-width: 300px;
        }

        .pro-empty-icon {
            color: rgba(85, 85, 85, 0.4);
            margin-bottom: 24px;
            display: flex;
            justify-content: center;
        }

        .pro-empty-state h3 {
            color: #555555;
            font-family: 'Crimson Text', serif;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 12px 0;
        }

        .pro-empty-state p {
            color: rgba(85, 85, 85, 0.7);
            font-size: 16px;
            line-height: 1.5;
            margin: 0;
        }

        /* Comments header */
        .pro-comments-header {
            padding: 20px 25px 15px 25px;
            border-bottom: 2px solid rgba(85, 85, 85, 0.1);
            margin-bottom: 20px;
        }

        .pro-review-stats {
            display: flex;
            align-items: baseline;
            gap: 8px;
        }

        .pro-review-count {
            font-size: 32px;
            font-weight: 700;
            color: #555555;
            font-family: 'Crimson Text', serif;
        }

        .pro-review-label {
            font-size: 18px;
            color: rgba(85, 85, 85, 0.8);
            font-family: 'Crimson Text', serif;
        }

        .pro-divider {
            height: 3px;
            background: linear-gradient(90deg, #555555 0%, rgba(85, 85, 85, 0.3) 100%);
            border-radius: 2px;
            margin-top: 15px;
        }

        /* Professional comment cards */
        .pro-comment-card {
            padding: 25px;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            border-left: 4px solid #555555;
            box-shadow: 
                0 2px 12px rgba(85, 85, 85, 0.08),
                0 1px 3px rgba(85, 85, 85, 0.12);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            animation: professionalSlideIn 0.6s ease forwards;
            opacity: 0;
            transform: translateY(30px);
            position: relative;
            overflow: hidden;
        }

        .pro-comment-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(85, 85, 85, 0.2) 50%, transparent 100%);
        }

        .pro-comment-card:hover {
            transform: translateY(-4px);
            box-shadow: 
                0 8px 28px rgba(85, 85, 85, 0.15),
                0 4px 12px rgba(85, 85, 85, 0.1);
            border-left-color: rgba(85, 85, 85, 0.8);
        }

        .pro-comment-card:last-child {
            margin-bottom: 0;
        }

        /* Comment structure */
        .pro-comment-structure {
            display: flex;
            gap: 20px;
        }

        .pro-comment-left {
            flex-shrink: 0;
        }

        .pro-comment-right {
            flex: 1;
            min-width: 0;
        }

        /* Professional avatar */
        .pro-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 4px 16px rgba(85, 85, 85, 0.25);
            transition: all 0.3s ease;
        }

        .pro-avatar-text {
            color: rgba(255, 255, 255, 0.95);
            font-weight: 700;
            font-size: 18px;
            font-family: 'Crimson Text', serif;
            z-index: 2;
        }

        .pro-avatar-ring {
            position: absolute;
            inset: -3px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, #555555, rgba(85, 85, 85, 0.3), #555555);
            z-index: 1;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .pro-comment-card:hover .pro-avatar-ring {
            opacity: 1;
        }

        /* Comment header */
        .pro-comment-header {
            margin-bottom: 16px;
        }

        .pro-reviewer-name {
            color: #555555;
            font-family: 'Crimson Text', serif;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 8px 0;
            line-height: 1.2;
        }

        .pro-review-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .pro-review-date {
            color: rgba(85, 85, 85, 0.6);
            font-size: 14px;
            font-weight: 500;
        }

        .pro-review-badge {
            background: rgba(85, 85, 85, 0.1);
            color: rgba(85, 85, 85, 0.8);
            font-size: 12px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Comment body */
        .pro-comment-body {
            position: relative;
            padding-left: 20px;
        }

        .pro-quote-mark {
            position: absolute;
            left: -5px;
            top: -10px;
            font-size: 48px;
            color: rgba(85, 85, 85, 0.15);
            font-family: 'Crimson Text', serif;
            font-weight: 700;
            line-height: 1;
        }

        .pro-comment-text {
            color: rgba(85, 85, 85, 0.85);
            font-size: 16px;
            line-height: 1.7;
            margin: 0;
            word-wrap: break-word;
            white-space: pre-wrap;
            font-weight: 400;
        }

        /* Animation */
        @keyframes professionalSlideIn {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Dark mode styles - using original colors */
        body.dark-mode #comments_section::-webkit-scrollbar-track {
            background: rgba(255, 182, 182, 0.1);
        }

        body.dark-mode #comments_section::-webkit-scrollbar-thumb {
            background: rgba(255, 182, 182, 0.3);
        }

        body.dark-mode #comments_section::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 182, 182, 0.5);
        }

        body.dark-mode .pro-empty-icon {
            color: rgba(255, 182, 182, 0.4);
        }

        body.dark-mode .pro-empty-state h3 {
            color: rgba(255, 255, 255, 0.9);
        }

        body.dark-mode .pro-empty-state p {
            color: rgba(255, 255, 255, 0.6);
        }

        body.dark-mode .pro-comments-header {
            border-bottom-color: rgba(255, 182, 182, 0.2);
        }

        body.dark-mode .pro-review-count {
            color: rgba(255, 255, 255, 0.9);
        }

        body.dark-mode .pro-review-label {
            color: rgba(255, 255, 255, 0.7);
        }

        body.dark-mode .pro-divider {
            background: linear-gradient(90deg, #FFB6B6 0%, rgba(255, 182, 182, 0.3) 100%);
        }

        body.dark-mode .pro-comment-card {
            background: rgba(42, 42, 42, 0.95);
            border-left-color: #FFB6B6;
            box-shadow: 
                0 2px 12px rgba(0, 0, 0, 0.3),
                0 1px 3px rgba(0, 0, 0, 0.4);
        }

        body.dark-mode .pro-comment-card::before {
            background: linear-gradient(90deg, transparent 0%, rgba(255, 182, 182, 0.3) 50%, transparent 100%);
        }

        body.dark-mode .pro-comment-card:hover {
            box-shadow: 
                0 8px 28px rgba(0, 0, 0, 0.4),
                0 4px 12px rgba(0, 0, 0, 0.3);
            border-left-color: #FFB6B6;
        }

        body.dark-mode .pro-avatar {
            background: linear-gradient(135deg, #FFB6B6 0%, rgba(255, 182, 182, 0.8) 100%);
            box-shadow: 0 4px 16px rgba(255, 182, 182, 0.25);
        }

        body.dark-mode .pro-avatar-text {
            color: #2A2A2A;
        }

        body.dark-mode .pro-avatar-ring {
            background: conic-gradient(from 0deg, #FFB6B6, rgba(255, 182, 182, 0.5), #FFB6B6);
        }

        body.dark-mode .pro-reviewer-name {
            color: rgba(255, 255, 255, 0.9);
        }

        body.dark-mode .pro-review-date {
            color: rgba(255, 255, 255, 0.6);
        }

        body.dark-mode .pro-review-badge {
            background: rgba(255, 182, 182, 0.2);
            color: #FFB6B6;
        }

        body.dark-mode .pro-quote-mark {
            color: rgba(255, 182, 182, 0.2);
        }

        body.dark-mode .pro-comment-text {
            color: rgba(255, 255, 255, 0.8);
        }

        /* Mobile responsiveness */
        @media screen and (max-width: 768px) {
            .pro-comment-card {
                padding: 20px;
                margin-bottom: 16px;
            }

            .pro-comment-structure {
                gap: 16px;
            }

            .pro-avatar {
                width: 48px;
                height: 48px;
            }

            .pro-avatar-text {
                font-size: 16px;
            }

            .pro-reviewer-name {
                font-size: 18px;
            }

            .pro-comment-text {
                font-size: 15px;
            }

            .pro-comments-header {
                padding: 16px 20px 12px 20px;
            }

            .pro-review-count {
                font-size: 28px;
            }

            #comments_section {
                max-height: 350px;
            }
        }

        @media screen and (max-width: 480px) {
            .pro-comment-card {
                padding: 16px;
                border-radius: 12px;
            }

            .pro-comment-structure {
                gap: 12px;
            }

            .pro-avatar {
                width: 44px;
                height: 44px;
            }

            .pro-avatar-text {
                font-size: 15px;
            }

            .pro-reviewer-name {
                font-size: 17px;
            }

            .pro-comment-text {
                font-size: 14px;
                line-height: 1.6;
            }

            .pro-review-meta {
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
            }

            .pro-comment-body {
                padding-left: 16px;
            }

            .pro-quote-mark {
                font-size: 40px;
                top: -8px;
            }
        }
    `;
    document.head.appendChild(style);
}
