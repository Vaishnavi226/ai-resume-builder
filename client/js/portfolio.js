// Portfolio Page Controller

let skillsList = [];
let previewDebounceTimer;

document.addEventListener('DOMContentLoaded', () => {
  injectNavbar();
  initDynamicFields();
  initColorPickers();
  loadPortfolioData();

  // Bind key actions
  document.getElementById('btn-save-portfolio').addEventListener('click', savePortfolio);
  document.getElementById('btn-portfolio-ai-suggest').addEventListener('click', improvePortfolioWithAI);

  document.getElementById('syncResume').addEventListener('change', async () => {
    updateSyncUI();
    await savePortfolioToggleState();
    await loadPortfolioData();
  });

  // Monitor all live updates for immediate preview compilation
  const form = document.getElementById('portfolio-form');
  form.addEventListener('input', triggerPreviewUpdate);
  form.addEventListener('change', triggerPreviewUpdate);

  // Initialize new layout controls and download trigger dropdown
  initFullscreenControls();
  initDownloadDropdown();
});

// 1. Color Picker and Text Value Sync
function initColorPickers() {
  const primaryColor = document.getElementById('port-primary-color');
  const primaryColorText = document.getElementById('port-primary-color-text');
  const secondaryColor = document.getElementById('port-secondary-color');
  const secondaryColorText = document.getElementById('port-secondary-color-text');
  const tertiaryColor = document.getElementById('port-tertiary-color');
  const tertiaryColorText = document.getElementById('port-tertiary-color-text');
  const bgColor = document.getElementById('port-bg-color');
  const bgColorText = document.getElementById('port-bg-color-text');

  primaryColor.addEventListener('input', () => {
    primaryColorText.value = primaryColor.value;
    triggerPreviewUpdate();
  });
  primaryColorText.addEventListener('input', () => {
    if (/^#[0-9A-F]{6}$/i.test(primaryColorText.value)) {
      primaryColor.value = primaryColorText.value;
      triggerPreviewUpdate();
    }
  });

  secondaryColor.addEventListener('input', () => {
    secondaryColorText.value = secondaryColor.value;
    triggerPreviewUpdate();
  });
  secondaryColorText.addEventListener('input', () => {
    if (/^#[0-9A-F]{6}$/i.test(secondaryColorText.value)) {
      secondaryColor.value = secondaryColorText.value;
      triggerPreviewUpdate();
    }
  });

  tertiaryColor.addEventListener('input', () => {
    tertiaryColorText.value = tertiaryColor.value;
    triggerPreviewUpdate();
  });
  tertiaryColorText.addEventListener('input', () => {
    if (/^#[0-9A-F]{6}$/i.test(tertiaryColorText.value)) {
      tertiaryColor.value = tertiaryColorText.value;
      triggerPreviewUpdate();
    }
  });

  bgColor.addEventListener('input', () => {
    bgColorText.value = bgColor.value;
    triggerPreviewUpdate();
  });
  bgColorText.addEventListener('input', () => {
    if (/^#[0-9A-F]{6}$/i.test(bgColorText.value)) {
      bgColor.value = bgColorText.value;
      triggerPreviewUpdate();
    }
  });
}

// 2. Dynamic Input Fields (Skills, Projects)
function initDynamicFields() {
  // Add Project Card
  document.getElementById('btn-add-project').addEventListener('click', () => {
    addProjectCard();
    triggerPreviewUpdate();
  });

  // Profile photo listener
  const profileInput = document.getElementById('profilePhotoInput');
  const profilePreview = document.getElementById('profile-photo-preview');

  profileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Profile photo size exceeds 2MB limit. Please upload a smaller image.');
        profileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = function(evt) {
        const base64String = evt.target.result;
        profileInput.dataset.base64 = base64String;
        profilePreview.src = base64String;
        profilePreview.style.display = 'block';
        triggerPreviewUpdate();
      };
      reader.readAsDataURL(file);
    }
  });

  // Add Skills
  const skillInput = document.getElementById('port-skill-input');
  const addSkillBtn = document.getElementById('port-btn-add-skill');

  const processAddSkill = () => {
    const skillVal = skillInput.value.trim();
    if (skillVal && !skillsList.includes(skillVal)) {
      skillsList.push(skillVal);
      renderSkillTags();
      skillInput.value = '';
      triggerPreviewUpdate();
    }
  };

  addSkillBtn.addEventListener('click', processAddSkill);
  skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processAddSkill();
    }
  });
}

// Render dynamic project cards inside DOM
function addProjectCard(data = {}) {
  const container = document.getElementById('projects-container');
  const cardId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const card = document.createElement('div');
  card.className = 'dynamic-item-card';
  card.id = cardId;
  card.dataset.order = data.order !== undefined ? data.order : 0;

  const techVal = Array.isArray(data.technologies) ? data.technologies.join(', ') : (data.technologies || '');

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; user-select: none;">
      <span style="font-weight: 600; color: var(--primary-accent);">Project Showcase</span>
      <div style="display: flex; gap: 5px; align-items: center;">
        <button class="btn-up-arrow" type="button" style="padding: 2px 6px; font-size: 0.8rem; background: none; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">&uparrow;</button>
        <button class="btn-down-arrow" type="button" style="padding: 2px 6px; font-size: 0.8rem; background: none; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">&downarrow;</button>
        <button class="remove-btn" type="button" style="position: static; padding: 2px 6px; font-size: 0.8rem;">Remove</button>
      </div>
    </div>
    <div class="form-group">
      <label>Project Title</label>
      <input type="text" class="proj-title" value="${(data.title || '').replace(/"/g, '&quot;')}" placeholder="e.g. NextHire AI Engine" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea class="proj-desc" placeholder="A brief explanation of the project's purpose, features, and key challenges solved...">${data.description || ''}</textarea>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px;">
      <div class="form-group" style="margin-bottom: 0;">
        <label>Project Link (URL)</label>
        <input type="text" class="proj-link" value="${(data.link || '').replace(/"/g, '&quot;')}" placeholder="e.g. github.com/johndoe/project">
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Technologies Used</label>
        <input type="text" class="proj-tech" value="${techVal.replace(/"/g, '&quot;')}" placeholder="e.g. React, Node.js, WebGL">
      </div>
    </div>
    <div class="form-group" style="margin-bottom: 0;">
      <label>Project Screenshot / Image</label>
      <div style="display: flex; align-items: center; gap: 15px;">
        <input type="file" class="projectImageInput" accept="image/*" style="border: none; padding: 5px 0; flex: 1;">
        <img src="${data.image || ''}" class="project-image-preview" id="${cardId}_preview" style="display: ${data.image ? 'block' : 'none'}; width: 100px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">
      </div>
    </div>
  `;

  container.appendChild(card);

  // Bind up, down and remove buttons cleanly
  card.querySelector('.btn-up-arrow').addEventListener('click', () => {
    moveProject(cardId, 'up');
  });
  card.querySelector('.btn-down-arrow').addEventListener('click', () => {
    moveProject(cardId, 'down');
  });
  card.querySelector('.remove-btn').addEventListener('click', () => {
    removeProjectCard(cardId);
  });

  // Bind file attachment to base64 reader
  const fileInput = card.querySelector('.projectImageInput');
  const previewImg = card.querySelector('.project-image-preview');

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Project image size exceeds 2MB limit. Please upload a smaller image.');
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = function(evt) {
        const base64String = evt.target.result;
        fileInput.dataset.base64 = base64String;
        previewImg.src = base64String;
        previewImg.style.display = 'block';
        triggerPreviewUpdate();
      };
      reader.readAsDataURL(file);
    }
  });

  // If loading existing base64 image data
  if (data.image) {
    fileInput.dataset.base64 = data.image;
  }
}

function removeProjectCard(cardId) {
  document.getElementById(cardId).remove();
  reassignProjectOrders();
  triggerPreviewUpdate();
}

// Render fixed education cards inside DOM
function addFixedEducationCard(data = {}, label) {
  const container = document.getElementById('education-container');
  if (!container) return;
  const cardId = 'edu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const card = document.createElement('div');
  card.className = 'dynamic-item-card';
  card.id = cardId;

  card.innerHTML = `
    <div style="font-weight: 600; color: var(--primary-accent); margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.9rem;">
      ${label}
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div class="form-group" style="margin-bottom: 0;">
        <label>Degree / Program</label>
        <input type="text" class="edu-degree" value="${(data.degree || '').replace(/"/g, '&quot;')}" placeholder="e.g. M.S. in Computer Science" required>
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>School / University</label>
        <input type="text" class="edu-school" value="${(data.school || '').replace(/"/g, '&quot;')}" placeholder="e.g. Stanford University" required>
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Year / Date Range</label>
        <input type="text" class="edu-year" value="${(data.year || '').replace(/"/g, '&quot;')}" placeholder="e.g. 2018 - 2020">
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Percentage / GPA</label>
        <input type="text" class="edu-percentage" value="${(data.percentage || '').replace(/"/g, '&quot;')}" placeholder="e.g. 85% or 3.8 GPA">
      </div>
    </div>
  `;

  container.appendChild(card);
}

function moveProject(cardId, direction) {
  const container = document.getElementById('projects-container');
  const cards = Array.from(container.querySelectorAll('.dynamic-item-card'));
  const currentIndex = cards.findIndex(c => c.id === cardId);

  if (currentIndex === -1) return;

  if (direction === 'up' && currentIndex > 0) {
    container.insertBefore(cards[currentIndex], cards[currentIndex - 1]);
  } else if (direction === 'down' && currentIndex < cards.length - 1) {
    container.insertBefore(cards[currentIndex + 1], cards[currentIndex]);
  }

  reassignProjectOrders();
  triggerPreviewUpdate();
}

function reassignProjectOrders() {
  const container = document.getElementById('projects-container');
  const cards = container.querySelectorAll('.dynamic-item-card');
  cards.forEach((card, index) => {
    card.dataset.order = index;
  });
}

// Render skill tags inside DOM
function renderSkillTags() {
  const container = document.getElementById('port-skills-tags-container');
  container.innerHTML = '';
  skillsList.forEach(skill => {
    const tag = document.createElement('div');
    tag.className = 'skill-tag';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = skill;
    tag.appendChild(textSpan);
    
    const removeSpan = document.createElement('span');
    removeSpan.className = 'skill-tag-remove';
    removeSpan.innerHTML = '&times;';
    removeSpan.addEventListener('click', () => {
      removeSkillTag(skill);
    });
    tag.appendChild(removeSpan);
    
    container.appendChild(tag);
  });
}

function removeSkillTag(skill) {
  skillsList = skillsList.filter(s => s !== skill);
  renderSkillTags();
  triggerPreviewUpdate();
}

// 3. Collect State Data
function collectPortfolioState() {
  const fullName = document.getElementById('port-fullname').value;
  const tagline = document.getElementById('port-tagline').value;
  const bio = document.getElementById('port-bio').value;

  const profileInput = document.getElementById('profilePhotoInput');
  const profileImage = profileInput.dataset.base64 || '';

  const primaryColor = document.getElementById('port-primary-color').value;
  const secondaryColor = document.getElementById('port-secondary-color').value;
  const tertiaryColor = document.getElementById('port-tertiary-color').value;
  const backgroundColor = document.getElementById('port-bg-color').value;
  const cardStyle = document.getElementById('port-card-style').value;
  const font = document.getElementById('port-font').value;

  const github = document.getElementById('port-github').value;
  const linkedin = document.getElementById('port-linkedin').value;
  const twitter = document.getElementById('port-twitter').value;
  const youtube = document.getElementById('port-youtube').value;

  // Compile Project list
  const projects = [];
  const projCards = document.querySelectorAll('#projects-container .dynamic-item-card');
  projCards.forEach((card, index) => {
    const title = card.querySelector('.proj-title').value;
    const description = card.querySelector('.proj-desc').value;
    const link = card.querySelector('.proj-link').value;
    const techString = card.querySelector('.proj-tech').value;
    
    // Read base64 from file-input dataset or preview src
    const fileInput = card.querySelector('.projectImageInput');
    const image = fileInput.dataset.base64 || '';
    const order = card.dataset.order !== undefined ? parseInt(card.dataset.order) : index;

    const technologies = techString ? techString.split(',').map(t => t.trim()).filter(t => t !== '') : [];

    if (title) {
      projects.push({ title, description, link, image, technologies, order });
    }
  });

  // Sort projects by order value
  projects.sort((a, b) => a.order - b.order);

  // Compile Education list (Graduation, HSC, SSC)
  const education = [];
  const eduCards = document.querySelectorAll('#education-container .dynamic-item-card');
  eduCards.forEach((card, index) => {
    const degreeVal = card.querySelector('.edu-degree').value.trim();
    const schoolVal = card.querySelector('.edu-school').value.trim();
    const year = card.querySelector('.edu-year').value.trim();
    const percentage = card.querySelector('.edu-percentage') ? card.querySelector('.edu-percentage').value.trim() : '';

    // Map/fallback missing fields to prevent validation exceptions in DB
    const degree = degreeVal || (index === 0 ? 'Graduation' : index === 1 ? 'HSC' : 'SSC');
    const school = schoolVal || 'Not Specified';

    education.push({ degree, school, year, percentage });
  });

  // Compile Stats Counters
  const stats = [];
  for (let i = 0; i < 4; i++) {
    const valEl = document.getElementById(`stat-val-${i}`);
    const lblEl = document.getElementById(`stat-lbl-${i}`);
    stats.push({
      value: valEl ? valEl.value : '',
      label: lblEl ? lblEl.value : ''
    });
  }

  // Compile Skill Categories
  const skillCategories = [];
  for (let i = 0; i < 3; i++) {
    const nameEl = document.getElementById(`skill-cat-name-${i}`);
    const pctEl = document.getElementById(`skill-cat-pct-${i}`);
    const tagsEl = document.getElementById(`skill-cat-tags-${i}`);
    
    const name = nameEl ? nameEl.value.trim() : '';
    const percentage = pctEl && pctEl.value ? parseInt(pctEl.value) : 90;
    const tagsString = tagsEl ? tagsEl.value : '';
    const skills = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t !== '') : [];
    
    skillCategories.push({ name, percentage, skills });
  }

  const syncFromResume = document.getElementById('syncResume').checked;

  return {
    fullName,
    profileImage,
    syncFromResume,
    tagline,
    bio,
    skills: skillsList,
    projects,
    education,
    stats,
    skillCategories,
    theme: { primaryColor, secondaryColor, tertiaryColor, backgroundColor, cardStyle, font },
    socialLinks: { github, linkedin, twitter, youtube }
  };
}

// 4. API & Service Integration
async function loadPortfolioData() {
  try {
    const res = await apiFetch('/portfolio');
    const data = await res.json();

    if (data) {
      // Sync state checkbox
      const syncToggle = document.getElementById('syncResume');
      syncToggle.checked = data.syncFromResume !== undefined ? data.syncFromResume : true;

      // Profile details
      document.getElementById('port-fullname').value = data.fullName || '';
      document.getElementById('port-tagline').value = data.tagline || '';
      document.getElementById('port-bio').value = data.bio || '';

      // Profile image
      if (data.profileImage) {
        const profileInput = document.getElementById('profilePhotoInput');
        const profilePreview = document.getElementById('profile-photo-preview');
        profileInput.dataset.base64 = data.profileImage;
        profilePreview.src = data.profileImage;
        profilePreview.style.display = 'block';
      }

      // Theme options
      const primaryColor = data.theme?.primaryColor || '#d2bbff';
      const secondaryColor = data.theme?.secondaryColor || '#bec6e0';
      const tertiaryColor = data.theme?.tertiaryColor || '#3cddc7';
      const backgroundColor = data.theme?.backgroundColor || '#101415';
      const cardStyle = data.theme?.cardStyle || 'glassmorphic';
      const font = data.theme?.font || 'Geist';

      document.getElementById('port-primary-color').value = primaryColor;
      document.getElementById('port-primary-color-text').value = primaryColor;
      document.getElementById('port-secondary-color').value = secondaryColor;
      document.getElementById('port-secondary-color-text').value = secondaryColor;
      document.getElementById('port-tertiary-color').value = tertiaryColor;
      document.getElementById('port-tertiary-color-text').value = tertiaryColor;
      document.getElementById('port-bg-color').value = backgroundColor;
      document.getElementById('port-bg-color-text').value = backgroundColor;
      document.getElementById('port-card-style').value = cardStyle;
      document.getElementById('port-font').value = font;

      // Social links
      document.getElementById('port-github').value = data.socialLinks?.github || '';
      document.getElementById('port-linkedin').value = data.socialLinks?.linkedin || '';
      document.getElementById('port-twitter').value = data.socialLinks?.twitter || '';
      document.getElementById('port-youtube').value = data.socialLinks?.youtube || '';

      // Stats Counters
      if (data.stats && data.stats.length === 4) {
        data.stats.forEach((st, i) => {
          const valEl = document.getElementById(`stat-val-${i}`);
          const lblEl = document.getElementById(`stat-lbl-${i}`);
          if (valEl) valEl.value = st.value || '';
          if (lblEl) lblEl.value = st.label || '';
        });
      }

      // Skill Categories
      if (data.skillCategories && data.skillCategories.length === 3) {
        data.skillCategories.forEach((cat, i) => {
          const nameEl = document.getElementById(`skill-cat-name-${i}`);
          const pctEl = document.getElementById(`skill-cat-pct-${i}`);
          const tagsEl = document.getElementById(`skill-cat-tags-${i}`);
          if (nameEl) nameEl.value = cat.name || '';
          if (pctEl) pctEl.value = cat.percentage || '';
          if (tagsEl) tagsEl.value = cat.skills ? cat.skills.join(', ') : '';
        });
      }

      // Skill tags
      skillsList = data.skills || [];
      renderSkillTags();

      // Projects (Sorted on load)
      const projContainer = document.getElementById('projects-container');
      projContainer.innerHTML = '';
      if (data.projects && data.projects.length > 0) {
        const sortedProjects = [...data.projects].sort((a, b) => (a.order || 0) - (b.order || 0));
        sortedProjects.forEach((proj, idx) => {
          proj.order = idx;
          addProjectCard(proj);
        });
      } else {
        addProjectCard(); // Add one empty project card
      }

      // Education (Graduation, HSC, SSC)
      const eduContainer = document.getElementById('education-container');
      if (eduContainer) {
        eduContainer.innerHTML = '';
        
        const defaultEdu = [
          { degree: 'Graduation', school: '', year: '', percentage: '' },
          { degree: 'HSC', school: '', year: '', percentage: '' },
          { degree: 'SSC', school: '', year: '', percentage: '' }
        ];

        let eduList = [...defaultEdu];
        if (data.education && data.education.length > 0) {
          let tempEdu = [...data.education];
          const firstDeg = (tempEdu[0].degree || '').toLowerCase();
          if (firstDeg.includes('ssc') || firstDeg.includes('10') || firstDeg.includes('matric') || firstDeg.includes('school')) {
            tempEdu.reverse();
          }
          for (let i = 0; i < 3; i++) {
            if (tempEdu[i]) {
              eduList[i] = {
                degree: tempEdu[i].degree || eduList[i].degree,
                school: tempEdu[i].school || '',
                year: tempEdu[i].year || '',
                percentage: tempEdu[i].percentage || ''
              };
            }
          }
        }

        const labels = ['Graduation / Degree', 'HSC (12th)', 'SSC (10th)'];
        eduList.forEach((edu, idx) => {
          addFixedEducationCard(edu, labels[idx]);
        });
      }

      // Update locked visual elements based on sync toggle state
      updateSyncUI();

      // Populate preview iframe
      updateLivePreview();
    }
  } catch (error) {
    showToast('Failed to load portfolio details.', 'error');
  }
}

async function savePortfolio() {
  const saveBtn = document.getElementById('btn-save-portfolio');
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner spinner-dark"></span> Saving...';

  const portfolioState = collectPortfolioState();

  try {
    const res = await apiFetch('/portfolio', {
      method: 'PUT',
      body: JSON.stringify(portfolioState)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Portfolio saved successfully!', 'success');
    } else {
      showToast(data.message || 'Error occurred while saving.', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to database.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
}

// 5. Debounced live preview compiler
function triggerPreviewUpdate() {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(updateLivePreview, 300);
}

async function updateLivePreview() {
  const iframe = document.getElementById('portfolio-preview-frame');
  const portfolioState = collectPortfolioState();

  try {
    const res = await apiFetch('/portfolio/preview', {
      method: 'POST',
      body: JSON.stringify(portfolioState)
    });

    if (res.ok) {
      const data = await res.json();
      
      // Revoke any previous object URL if it exists (for backward compatibility / cleanup)
      if (iframe._blobUrl) {
        URL.revokeObjectURL(iframe._blobUrl);
        iframe._blobUrl = null;
      }
      
      // Point the iframe directly to our dedicated same-origin rendering URL
      iframe.src = data.previewUrl;
    }
  } catch (error) {
    console.error('Failed to compile live preview:', error.message);
  }
}

// 6. Download Static Portfolio HTML File
async function downloadPortfolioHTML() {
  const dlBtn = document.getElementById('btn-download-portfolio');
  const originalText = dlBtn.innerHTML;
  
  dlBtn.disabled = true;
  dlBtn.innerHTML = '<span class="spinner"></span> Packaging...';

  const portfolioState = collectPortfolioState();

  try {
    const res = await apiFetch('/portfolio/preview', {
      method: 'POST',
      body: JSON.stringify(portfolioState)
    });

    if (res.ok) {
      const data = await res.json();
      const htmlString = data.html;
      const blob = new Blob([htmlString], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'index.html'; // Default name for offline upload/hosting
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Offline portfolio index.html downloaded!', 'success');
    } else {
      showToast('Failed to package portfolio HTML.', 'error');
    }
  } catch (error) {
    showToast('Download error: ' + error.message, 'error');
  } finally {
    dlBtn.disabled = false;
    dlBtn.innerHTML = originalText;
  }
}

// 7. AI Enhancements for Portfolio
async function improvePortfolioWithAI() {
  const aiBtn = document.getElementById('btn-portfolio-ai-suggest');
  const originalText = aiBtn.innerHTML;
  
  aiBtn.disabled = true;
  aiBtn.innerHTML = '<span class="spinner spinner-dark"></span> Thinking...';
  
  const portfolioState = collectPortfolioState();
  const requestBody = {
    fullName: portfolioState.fullName,
    tagline: portfolioState.tagline,
    bio: portfolioState.bio,
    skills: portfolioState.skills,
    projects: portfolioState.projects,
    education: portfolioState.education
  };

  try {
    const response = await apiFetch('/portfolio/ai-suggest', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const suggestions = await response.json();
    if (response.ok && suggestions) {
      if (suggestions.notification) {
        showToast(suggestions.notification, 'error');
      } else {
        showToast('Portfolio details enhanced and filled with AI!', 'success');
      }

      // Update tagline in input field
      if (suggestions.tagline) {
        document.getElementById('port-tagline').value = suggestions.tagline;
      }
      
      // Update bio in input field
      if (suggestions.bio) {
        document.getElementById('port-bio').value = suggestions.bio;
      }

      // Update stats counters
      if (suggestions.stats && suggestions.stats.length === 4) {
        suggestions.stats.forEach((st, i) => {
          const valEl = document.getElementById(`stat-val-${i}`);
          const lblEl = document.getElementById(`stat-lbl-${i}`);
          if (valEl) valEl.value = st.value || '';
          if (lblEl) lblEl.value = st.label || '';
        });
      }

      // Update skill categories
      if (suggestions.skillCategories && suggestions.skillCategories.length === 3) {
        suggestions.skillCategories.forEach((cat, i) => {
          const nameEl = document.getElementById(`skill-cat-name-${i}`);
          const pctEl = document.getElementById(`skill-cat-pct-${i}`);
          const tagsEl = document.getElementById(`skill-cat-tags-${i}`);
          if (nameEl) nameEl.value = cat.name || '';
          if (pctEl) pctEl.value = cat.percentage || '';
          if (tagsEl) tagsEl.value = cat.skills ? cat.skills.join(', ') : '';
        });
      }

      // Update projects
      if (suggestions.projects && suggestions.projects.length > 0) {
        const projContainer = document.getElementById('projects-container');
        projContainer.innerHTML = '';
        suggestions.projects.forEach((proj, idx) => {
          proj.order = idx;
          addProjectCard(proj);
        });
      }

      // Update education milestones
      if (suggestions.education && suggestions.education.length > 0) {
        const eduContainer = document.getElementById('education-container');
        if (eduContainer) {
          eduContainer.innerHTML = '';
          const labels = ['SSC (10th)', 'HSC (12th)', 'Graduation / Degree'];
          suggestions.education.forEach((edu, idx) => {
            addFixedEducationCard(edu, labels[idx] || 'Education Milestone');
          });
        }
      }

      triggerPreviewUpdate();
    } else {
      showToast(suggestions.message || 'AI suggest completed with error.', 'error');
    }
  } catch (err) {
    showToast('Failed to optimize portfolio: ' + err.message, 'error');
  } finally {
    aiBtn.disabled = false;
    aiBtn.innerHTML = originalText;
  }
}

// 8. Dynamic UI locking for Resume Synchronization
function updateSyncUI() {
  const isSynced = document.getElementById('syncResume').checked;
  const banners = document.querySelectorAll('.sync-banner');

  banners.forEach(b => {
    b.style.display = isSynced ? 'block' : 'none';
  });

  // Name
  const nameInput = document.getElementById('port-fullname');
  nameInput.readOnly = isSynced;
  nameInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
  nameInput.style.cursor = isSynced ? 'not-allowed' : 'text';

  // Bio
  const bioInput = document.getElementById('port-bio');
  bioInput.readOnly = isSynced;
  bioInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
  bioInput.style.cursor = isSynced ? 'not-allowed' : 'text';

  // Lock skill categories inputs when synced from resume
  for (let i = 0; i < 3; i++) {
    const nameInput = document.getElementById(`skill-cat-name-${i}`);
    const pctInput = document.getElementById(`skill-cat-pct-${i}`);
    const tagsInput = document.getElementById(`skill-cat-tags-${i}`);
    if (nameInput) {
      nameInput.readOnly = isSynced;
      nameInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      nameInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (pctInput) {
      pctInput.readOnly = isSynced;
      pctInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      pctInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (tagsInput) {
      tagsInput.readOnly = isSynced;
      tagsInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      tagsInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
  }

  // Synced social links locking
  const linkedinInput = document.getElementById('port-linkedin');
  if (linkedinInput) {
    linkedinInput.readOnly = isSynced;
    linkedinInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
    linkedinInput.style.cursor = isSynced ? 'not-allowed' : 'text';
  }
  const youtubeInput = document.getElementById('port-youtube');
  if (youtubeInput) {
    youtubeInput.readOnly = isSynced;
    youtubeInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
    youtubeInput.style.cursor = isSynced ? 'not-allowed' : 'text';
  }

  // Skills input area
  const skillsInputArea = document.getElementById('skills-input-area');
  const skillRemoveBtns = document.querySelectorAll('#port-skills-tags-container .skill-tag-remove');

  if (isSynced) {
    skillsInputArea.style.display = 'none';
    skillRemoveBtns.forEach(btn => btn.style.display = 'none');
  } else {
    skillsInputArea.style.display = 'block';
    skillRemoveBtns.forEach(btn => btn.style.display = 'inline');
  }

  // Projects Add Project button
  const addProjBtn = document.getElementById('btn-add-project');
  if (addProjBtn) addProjBtn.style.display = isSynced ? 'none' : 'block';

  // Projects cards internal inputs
  const cards = document.querySelectorAll('#projects-container .dynamic-item-card');
  cards.forEach(card => {
    const titleInput = card.querySelector('.proj-title');
    const descTextarea = card.querySelector('.proj-desc');
    const linkInput = card.querySelector('.proj-link');
    const techInput = card.querySelector('.proj-tech');
    const removeBtn = card.querySelector('.remove-btn');

    if (titleInput) {
      titleInput.readOnly = isSynced;
      titleInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      titleInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (descTextarea) {
      descTextarea.readOnly = isSynced;
      descTextarea.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      descTextarea.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (linkInput) {
      linkInput.readOnly = isSynced;
      linkInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      linkInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (techInput) {
      techInput.readOnly = isSynced;
      techInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      techInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (removeBtn) {
      removeBtn.style.display = isSynced ? 'none' : 'block';
    }

    // Add resume source banner indicator on project card
    let label = card.querySelector('.proj-resume-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'proj-resume-label';
      label.style.fontSize = '0.75rem';
      label.style.fontWeight = '600';
      label.style.color = '#3B82F6';
      label.style.marginBottom = '5px';
      label.textContent = '📎 Synced from resume';
      card.insertBefore(label, card.firstChild);
    }
    label.style.display = isSynced ? 'block' : 'none';
  });

  // Education Add Education button
  const addEduBtn = document.getElementById('btn-add-education');
  if (addEduBtn) addEduBtn.style.display = isSynced ? 'none' : 'block';

  // Education cards internal inputs
  const eduCards = document.querySelectorAll('#education-container .dynamic-item-card');
  eduCards.forEach(card => {
    const degreeInput = card.querySelector('.edu-degree');
    const schoolInput = card.querySelector('.edu-school');
    const yearInput = card.querySelector('.edu-year');
    const percentageInput = card.querySelector('.edu-percentage');
    const removeBtn = card.querySelector('.edu-remove-btn');

    if (degreeInput) {
      degreeInput.readOnly = isSynced;
      degreeInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      degreeInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (schoolInput) {
      schoolInput.readOnly = isSynced;
      schoolInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      schoolInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (yearInput) {
      yearInput.readOnly = isSynced;
      yearInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      yearInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (percentageInput) {
      percentageInput.readOnly = isSynced;
      percentageInput.style.backgroundColor = isSynced ? '#f1f5f9' : '#ffffff';
      percentageInput.style.cursor = isSynced ? 'not-allowed' : 'text';
    }
    if (removeBtn) {
      removeBtn.style.display = isSynced ? 'none' : 'block';
    }

    // Add resume source banner indicator on education card
    let label = card.querySelector('.edu-resume-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'edu-resume-label';
      label.style.fontSize = '0.75rem';
      label.style.fontWeight = '600';
      label.style.color = '#3B82F6';
      label.style.marginBottom = '5px';
      label.textContent = '📎 Synced from resume';
      card.insertBefore(label, card.firstChild);
    }
    label.style.display = isSynced ? 'block' : 'none';
  });
}

async function savePortfolioToggleState() {
  const syncFromResume = document.getElementById('syncResume').checked;
  const portfolioState = collectPortfolioState();
  try {
    await apiFetch('/portfolio', {
      method: 'PUT',
      body: JSON.stringify({
        ...portfolioState,
        syncFromResume
      })
    });
  } catch (err) {
    console.error('Failed to save toggle state:', err);
  }
}

// 9. Fullscreen controls (Native Fullscreen, Tab Opening, Full-Width Layout collapse)
function initFullscreenControls() {
  const btnToggleLayout = document.getElementById('btn-toggle-layout');
  const btnFullscreenIframe = document.getElementById('btn-fullscreen-iframe');
  const btnOpenTab = document.getElementById('btn-open-tab');
  const leftPanel = document.querySelector('.portfolio-left-panel');
  const rightPanel = document.querySelector('.portfolio-right-panel');
  const iframe = document.getElementById('portfolio-preview-frame');

  if (btnToggleLayout && leftPanel && rightPanel) {
    btnToggleLayout.addEventListener('click', () => {
      leftPanel.classList.toggle('collapsed');
      rightPanel.classList.toggle('expanded');
      
      const isExpanded = rightPanel.classList.contains('expanded');
      btnToggleLayout.title = isExpanded ? 'Show Editor Panel' : 'Toggle Full Width Preview';
      btnToggleLayout.style.color = isExpanded ? 'var(--primary-accent)' : '#64748b';
    });
  }

  if (btnFullscreenIframe && iframe) {
    btnFullscreenIframe.addEventListener('click', () => {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.webkitRequestFullscreen) { /* Safari */
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) { /* IE11 */
        iframe.msRequestFullscreen();
      }
    });
  }

  if (btnOpenTab && iframe) {
    btnOpenTab.addEventListener('click', () => {
      if (iframe.src) {
        window.open(iframe.src, '_blank');
      } else {
        showToast('No active preview available yet.', 'error');
      }
    });
  }
}

// 10. Download Options Dropdown & ZIP packager
function initDownloadDropdown() {
  const trigger = document.getElementById('btn-download-trigger');
  const menu = document.getElementById('download-dropdown');
  const dlHtmlBtn = document.getElementById('btn-download-html');
  const dlZipBtn = document.getElementById('btn-download-zip');

  if (trigger && menu) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
      menu.style.display = menu.classList.contains('show') ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
        menu.style.display = 'none';
      }
    });
  }

  if (dlHtmlBtn) {
    dlHtmlBtn.addEventListener('click', (e) => {
      e.preventDefault();
      menu.classList.remove('show');
      menu.style.display = 'none';
      downloadPortfolioHTML();
    });
  }

  if (dlZipBtn) {
    dlZipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      menu.classList.remove('show');
      menu.style.display = 'none';
      downloadPortfolioZIP();
    });
  }
}

async function downloadPortfolioZIP() {
  const dlBtn = document.getElementById('btn-download-trigger');
  const originalHtml = dlBtn.innerHTML;
  
  dlBtn.disabled = true;
  dlBtn.innerHTML = '<span>📦 Zipping...</span>';

  const portfolioState = collectPortfolioState();

  try {
    const res = await apiFetch('/portfolio/download-zip', {
      method: 'POST',
      body: JSON.stringify(portfolioState)
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${portfolioState.fullName ? portfolioState.fullName.replace(/\s+/g, '_') : 'portfolio'}_project.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Source ZIP package downloaded successfully!', 'success');
    } else {
      const errData = await res.json();
      showToast(errData.message || 'Failed to package portfolio ZIP.', 'error');
    }
  } catch (error) {
    showToast('Download error: ' + error.message, 'error');
  } finally {
    dlBtn.disabled = false;
    dlBtn.innerHTML = originalHtml;
  }
}
