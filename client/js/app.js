// Global Client State & Utility Engine

const API_BASE = 'http://localhost:5000/api';

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem('token');
  const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
  
  if (!token && !isAuthPage) {
    window.location.href = 'index.html';
  } else if (token && isAuthPage) {
    window.location.href = 'resume.html';
  }
}

// Global fetch helper that attaches token and handles unauthorized responses
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Session expired or invalid token
    localStorage.removeItem('token');
    showToast('Your session has expired. Please log in again.', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    throw new Error('Unauthorized');
  }

  return response;
}

// Show standard toast notifications
function showToast(message, type = 'success') {
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);
  
  const closeSpan = document.createElement('span');
  closeSpan.style.cursor = 'pointer';
  closeSpan.style.fontWeight = 'bold';
  closeSpan.style.marginLeft = '10px';
  closeSpan.innerHTML = '&times;';
  closeSpan.addEventListener('click', () => {
    toast.remove();
  });
  toast.appendChild(closeSpan);

  container.appendChild(toast);

  // Automatically fade out after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Injects the shared navigation bar into pages
function injectNavbar() {
  const header = document.querySelector('header');
  if (!header) return;

  const currentPath = window.location.pathname;
  const isResume = currentPath.includes('resume.html');
  const isPortfolio = currentPath.includes('portfolio.html');

  header.innerHTML = `
    <div class="nav-container">
      <div class="logo">
        <div class="logo-icon">&Delta;</div>
        <span>NextHire</span>
      </div>
      <nav class="nav-links">
        <a href="resume.html" class="nav-item ${isResume ? 'active' : ''}">Resume Builder</a>
        <a href="portfolio.html" class="nav-item ${isPortfolio ? 'active' : ''}">Portfolio Builder</a>
        <button class="btn-logout" id="logout-btn">Log Out</button>
      </nav>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  });
}

// Run auth check immediately
checkAuth();
