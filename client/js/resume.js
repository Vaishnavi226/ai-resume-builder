// Resume Builder Controller

let skillsList = [];

document.addEventListener('DOMContentLoaded', () => {
  injectNavbar();
  initTabs();
  initDynamicLists();
  loadResumeData();

  // Bind main actions
  document.getElementById('btn-save-resume').addEventListener('click', saveResume);
  document.getElementById('btn-compile-pdf').addEventListener('click', generatePDF);
  document.getElementById('btn-ai-suggest').addEventListener('click', improveWithAI);
  document.getElementById('checkAtsBtn').addEventListener('click', checkAtsScore);
});

// 1. Tab Navigation Logic
function initTabs() {
  const tabButtons = document.querySelectorAll('.resume-tab-btn');
  const tabPanes = document.querySelectorAll('.resume-tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
}

// 2. Dynamic Inputs Managers (Experience, Education, Skills, Projects)
function initDynamicLists() {
  // Add Experience card
  document.getElementById('btn-add-experience').addEventListener('click', () => {
    addExperienceCard();
  });

  // Add Project card
  document.getElementById('btn-add-project').addEventListener('click', () => {
    addProjectCard();
  });

  // Add Skill Tag
  const skillInput = document.getElementById('skill-input');
  const addSkillBtn = document.getElementById('btn-add-skill');

  const processAddSkill = () => {
    const skillVal = skillInput.value.trim();
    if (skillVal && !skillsList.includes(skillVal)) {
      skillsList.push(skillVal);
      renderSkillTags();
      skillInput.value = '';
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

// Render experience cards inside DOM
function addExperienceCard(data = {}) {
  const container = document.getElementById('experience-container');
  const cardId = 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const card = document.createElement('div');
  card.className = 'dynamic-item-card';
  card.id = cardId;

  card.innerHTML = `
    <button class="remove-btn" type="button">Remove</button>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px;">
      <div class="form-group" style="margin-bottom: 0;">
        <label>Job Title</label>
        <input type="text" class="exp-title" value="${data.jobTitle || ''}" placeholder="e.g. Senior Software Engineer" required>
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Company / Organization</label>
        <input type="text" class="exp-company" value="${data.company || ''}" placeholder="e.g. Acme Corp" required>
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Location</label>
        <input type="text" class="exp-location" value="${data.location || ''}" placeholder="e.g. San Francisco, CA">
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Start & End Dates</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" class="exp-start" value="${data.startDate || ''}" placeholder="e.g. Jan 2022" style="flex: 1;">
          <input type="text" class="exp-end" value="${data.endDate || ''}" placeholder="e.g. Present" style="flex: 1;">
        </div>
      </div>
    </div>
    
    <div class="form-group" style="margin-bottom: 0;">
      <label>Key Achievements / Bullet Points</label>
      <div class="bullet-list-builder">
        <div class="bullets-input-container">
          <!-- Dynamic bullets will render here -->
        </div>
        <button class="btn btn-outline btn-add-bullet" type="button" style="padding: 6px 12px; font-size: 0.8rem; margin-top: 5px;">+ Add Bullet Point</button>
      </div>
    </div>
  `;

  container.appendChild(card);

  // Bind remove experience button cleanly
  card.querySelector('.remove-btn').addEventListener('click', () => {
    card.remove();
  });

  // Bind add bullet button cleanly
  card.querySelector('.btn-add-bullet').addEventListener('click', () => {
    addBulletInputLine(cardId);
  });

  // Populate bullets if provided, or add a default empty line
  const bullets = data.bulletPoints || [];
  if (bullets.length > 0) {
    bullets.forEach(bp => addBulletInputLine(cardId, bp));
  } else {
    addBulletInputLine(cardId);
  }
}

// Add experience bullet points lines
function addBulletInputLine(cardId, value = '') {
  const card = document.getElementById(cardId);
  if (!card) return;
  const container = card.querySelector('.bullets-input-container');
  const lineId = 'bullet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

  const div = document.createElement('div');
  div.className = 'bullet-item-input';
  div.id = lineId;
  div.innerHTML = `
    <input type="text" class="exp-bullet-value" value="${value.replace(/"/g, '&quot;')}" placeholder="Action Verb + Task + Impact Metrics" style="flex: 1; padding: 8px;">
    <button class="btn btn-outline bullet-remove-btn" type="button" style="padding: 8px 12px; color: var(--error-color);">&times;</button>
  `;
  container.appendChild(div);

  // Bind remove bullet button cleanly
  div.querySelector('.bullet-remove-btn').addEventListener('click', () => {
    div.remove();
  });
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
    <div style="font-weight: 600; color: var(--primary); margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.9rem;">
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

// Render project cards inside DOM
function addProjectCard(data = {}) {
  const container = document.getElementById('projects-container');
  const cardId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const card = document.createElement('div');
  card.className = 'dynamic-item-card';
  card.id = cardId;

  const titleVal = data.title || '';
  const descVal = data.description || '';
  const linkVal = data.link || '';
  const techVal = Array.isArray(data.technologies) ? data.technologies.join(', ') : (data.technologies || '');

  card.innerHTML = `
    <div class="card-header-toggle" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; user-select: none;">
      <span class="proj-title-display" style="font-weight: 600; color: var(--primary-accent);">${titleVal || 'New Project'}</span>
      <div style="display: flex; gap: 10px; align-items: center;">
        <button class="btn-collapse-toggle" type="button" style="background: none; border: none; font-size: 0.8rem; cursor: pointer; color: var(--text-muted);">Collapse</button>
        <button class="remove-btn-raw" type="button" style="background: none; border: none; font-size: 0.85rem; color: var(--error-color); font-weight: bold; cursor: pointer;">Remove</button>
      </div>
    </div>
    <div class="card-body-content">
      <div class="form-group">
        <label>Project Title</label>
        <input type="text" class="proj-title" value="${titleVal.replace(/"/g, '&quot;')}" placeholder="e.g. AI Chatbot" required>
      </div>
      <div class="form-group">
        <label>Short Description (Max 200 chars)</label>
        <textarea class="proj-desc" maxlength="200" placeholder="A one-line summary of your project..." style="min-height: 60px;">${descVal}</textarea>
        <div class="char-counter" style="font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: 2px;">
          <span class="char-count">${descVal.length}</span>/200 characters
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Link (URL)</label>
          <input type="text" class="proj-link" value="${linkVal.replace(/"/g, '&quot;')}" placeholder="e.g. github.com/user/project">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Technologies (comma-separated)</label>
          <input type="text" class="proj-tech" value="${techVal.replace(/"/g, '&quot;')}" placeholder="e.g. React, Node.js, Python">
        </div>
      </div>
    </div>
  `;

  container.appendChild(card);

  // Bind collapse / toggle logic
  const cardHeader = card.querySelector('.card-header-toggle');
  const collapseBtn = card.querySelector('.btn-collapse-toggle');
  const bodyContent = card.querySelector('.card-body-content');

  const toggleCollapse = () => {
    const isCollapsed = bodyContent.style.display === 'none';
    bodyContent.style.display = isCollapsed ? 'block' : 'none';
    collapseBtn.textContent = isCollapsed ? 'Collapse' : 'Expand';
  };

  cardHeader.addEventListener('click', (e) => {
    if (!e.target.classList.contains('remove-btn-raw') && !e.target.classList.contains('btn-collapse-toggle')) {
      toggleCollapse();
    }
  });

  collapseBtn.addEventListener('click', () => {
    toggleCollapse();
  });

  // Bind title display sync
  const titleInput = card.querySelector('.proj-title');
  const titleDisplay = card.querySelector('.proj-title-display');
  titleInput.addEventListener('input', () => {
    titleDisplay.textContent = titleInput.value.trim() || 'New Project';
  });

  // Bind character counter
  const descTextarea = card.querySelector('.proj-desc');
  const charCountSpan = card.querySelector('.char-count');
  descTextarea.addEventListener('input', () => {
    charCountSpan.textContent = descTextarea.value.length;
  });

  // Bind remove button
  const removeBtn = card.querySelector('.remove-btn-raw');
  removeBtn.addEventListener('click', () => {
    card.remove();
  });
}

// Render skills tags
function renderSkillTags() {
  const container = document.getElementById('skills-tags-container');
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
}

// 3. Collect State Data from Form
function collectResumeState() {
  const fullName = document.getElementById('p-fullname').value;
  const email = document.getElementById('p-email').value;
  const phone = document.getElementById('p-phone').value;
  const location = document.getElementById('p-location').value;
  const linkedin = document.getElementById('p-linkedin').value;
  const website = document.getElementById('p-website').value;
  const youtube = document.getElementById('p-youtube').value;

  const summary = document.getElementById('r-summary').value;
  const jobDescription = document.getElementById('r-jd').value;

  // Collect Experience List
  const experience = [];
  const expCards = document.querySelectorAll('#experience-container .dynamic-item-card');
  expCards.forEach(card => {
    const jobTitle = card.querySelector('.exp-title').value;
    const company = card.querySelector('.exp-company').value;
    const loc = card.querySelector('.exp-location').value;
    const startDate = card.querySelector('.exp-start').value;
    const endDate = card.querySelector('.exp-end').value;

    const bulletPoints = [];
    const bulletInputs = card.querySelectorAll('.exp-bullet-value');
    bulletInputs.forEach(input => {
      const val = input.value.trim();
      if (val) bulletPoints.push(val);
    });

    if (jobTitle && company) {
      experience.push({ jobTitle, company, location: loc, startDate, endDate, bulletPoints });
    }
  });

  // Collect Education List (Graduation, HSC, SSC)
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

  // Collect Projects List
  const projects = [];
  const projCards = document.querySelectorAll('#projects-container .dynamic-item-card');
  projCards.forEach(card => {
    const title = card.querySelector('.proj-title').value.trim();
    const description = card.querySelector('.proj-desc').value.trim();
    const link = card.querySelector('.proj-link').value.trim();
    const techString = card.querySelector('.proj-tech').value.trim();

    const technologies = techString ? techString.split(',').map(t => t.trim()).filter(t => t !== '') : [];

    if (title) {
      projects.push({ title, description, link, technologies });
    }
  });

  return {
    personalInfo: { fullName, email, phone, location, linkedin, website, youtube },
    summary,
    experience,
    education,
    skills: skillsList,
    projects,
    jobDescription
  };
}

// 4. Fetch and Save Logic
async function loadResumeData() {
  try {
    const res = await apiFetch('/resume');
    const data = await res.json();

    if (data) {
      // Personal
      document.getElementById('p-fullname').value = data.personalInfo?.fullName || '';
      document.getElementById('p-email').value = data.personalInfo?.email || '';
      document.getElementById('p-phone').value = data.personalInfo?.phone || '';
      document.getElementById('p-location').value = data.personalInfo?.location || '';
      document.getElementById('p-linkedin').value = data.personalInfo?.linkedin || '';
      document.getElementById('p-website').value = data.personalInfo?.website || '';
      document.getElementById('p-youtube').value = data.personalInfo?.youtube || '';

      // Summary / JD
      document.getElementById('r-summary').value = data.summary || '';
      document.getElementById('r-jd').value = data.jobDescription || '';

      // Render Experience Cards
      const expContainer = document.getElementById('experience-container');
      expContainer.innerHTML = '';
      if (data.experience && data.experience.length > 0) {
        data.experience.forEach(exp => addExperienceCard(exp));
      } else {
        addExperienceCard(); // Add one empty card by default
      }

      // Render Education Cards (Graduation, HSC, SSC)
      const eduContainer = document.getElementById('education-container');
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

      // Render Skills
      skillsList = data.skills || [];
      renderSkillTags();

      // Render Projects
      const projContainer = document.getElementById('projects-container');
      projContainer.innerHTML = '';
      if (data.projects && data.projects.length > 0) {
        data.projects.forEach(proj => addProjectCard(proj));
      } else {
        addProjectCard(); // Add one empty card by default
      }
    }
  } catch (error) {
    showToast('Failed to load resume details.', 'error');
  }
}

async function saveResume() {
  const saveBtn = document.getElementById('btn-save-resume');
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner spinner-dark"></span> Saving...';

  const resumeState = collectResumeState();

  try {
    const res = await apiFetch('/resume', {
      method: 'PUT',
      body: JSON.stringify(resumeState)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Resume saved successfully!', 'success');
    } else {
      showToast(data.message || 'Error occurred while saving.', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to database.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
}

// 5. Grok AI suggestions Integration
async function improveWithAI() {
  const aiBtn = document.getElementById('btn-ai-suggest');
  const originalText = aiBtn.innerHTML;
  
  aiBtn.disabled = true;
  aiBtn.innerHTML = '<span class="spinner"></span> Thinking...';
  
  const resumeState = collectResumeState();
  const jobDescription = resumeState.jobDescription;

  try {
    const response = await apiFetch('/resume/ai-suggest', {
      method: 'POST',
      body: JSON.stringify({
        resumeData: resumeState,
        jobDescription
      })
    });

    const suggestions = await response.json();
    if (response.ok && suggestions) {
      if (suggestions.notification) {
        showToast(suggestions.notification, 'error');
      } else {
        showToast('Resume content upgraded with AI!', 'success');
      }

      // 1. Replace summary
      document.getElementById('r-summary').value = suggestions.summary || '';

      // 2. Map and replace experience bullet points
      const expCards = document.querySelectorAll('#experience-container .dynamic-item-card');
      
      (suggestions.experience || []).forEach((sugExp, index) => {
        if (index < expCards.length) {
          const card = expCards[index];
          // Clear current bullets input fields
          const bulletsContainer = card.querySelector('.bullets-input-container');
          bulletsContainer.innerHTML = '';
          
          // Re-render improved bullets
          (sugExp.bulletPoints || []).forEach(bp => {
            addBulletInputLine(card.id, bp);
          });
        }
      });

      // Highlight the fields by jumping to Summary tab
      document.querySelector('.resume-tab-btn[data-tab="tab-summary"]').click();
    } else {
      showToast(suggestions.message || 'AI suggest completed with error.', 'error');
    }
  } catch (err) {
    showToast('Failed to optimize resume: ' + err.message, 'error');
  } finally {
    aiBtn.disabled = false;
    aiBtn.innerHTML = originalText;
  }
}

// 6. PDF Compiler PDF compilation triggering
async function generatePDF() {
  const pdfBtn = document.getElementById('btn-compile-pdf');
  const originalText = pdfBtn.innerHTML;

  pdfBtn.disabled = true;
  pdfBtn.innerHTML = '<span class="spinner"></span> Compiling...';

  const resumeState = collectResumeState();

  try {
    const res = await apiFetch('/resume/generate-pdf', {
      method: 'POST',
      body: JSON.stringify(resumeState)
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(resumeState.personalInfo.fullName || 'resume').replace(/\s+/g, '_')}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('LaTeX PDF compiled and downloaded!', 'success');
    } else {
      const errData = await res.json();
      showToast(errData.message || 'LaTeX PDF compilation failed.', 'error');
    }
  } catch (error) {
    showToast('Failed to compile LaTeX: ' + error.message, 'error');
  } finally {
    pdfBtn.disabled = false;
    pdfBtn.innerHTML = originalText;
  }
}

async function checkAtsScore() {
  const atsBtn = document.getElementById('checkAtsBtn');
  const originalHtml = atsBtn.innerHTML;
  
  atsBtn.disabled = true;
  atsBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
  
  const resumeState = collectResumeState();
  const jobDescription = resumeState.jobDescription;
  
  try {
    const response = await apiFetch('/resume/ats-score', {
      method: 'POST',
      body: JSON.stringify({
        resumeData: resumeState,
        jobDescription
      })
    });
    
    const data = await response.json();
    if (response.ok && data) {
      displayAtsScore(data);
      showToast('ATS evaluation complete!', 'success');
    } else {
      showToast(data.message || 'ATS evaluation failed.', 'error');
    }
  } catch (error) {
    showToast('Failed to evaluate ATS compatibility: ' + error.message, 'error');
  } finally {
    atsBtn.disabled = false;
    atsBtn.innerHTML = originalHtml;
  }
}

function displayAtsScore(data) {
  const panel = document.getElementById('atsScorePanel');
  panel.style.display = 'block';
  
  // Set match text
  const scoreSpan = document.getElementById('atsFinalScore');
  scoreSpan.textContent = data.finalScore;
  
  // Animate circular progress ring
  const circle = document.getElementById('atsProgressCircle');
  const circumference = 2 * Math.PI * 50; // ~314.16
  const offset = circumference - (data.finalScore / 100) * circumference;
  circle.style.strokeDashoffset = offset;
  
  // Color the stroke based on score threshold
  if (data.finalScore < 50) {
    circle.setAttribute('stroke', 'var(--error-color)');
  } else if (data.finalScore <= 70) {
    circle.setAttribute('stroke', '#F97316'); // Orange
  } else {
    circle.setAttribute('stroke', '#10B981'); // Green
  }
  
  // Display Rule vs AI Scores
  document.getElementById('atsRuleScore').textContent = `${data.ruleScore}/100`;
  document.getElementById('atsAiScore').textContent = data.aiScore !== null ? `${data.aiScore}/100` : 'N/A';
  
  // Offline Alert
  const offlineAlert = document.getElementById('atsOfflineAlert');
  if (data.note) {
    offlineAlert.textContent = `⚠️ ${data.note}`;
    offlineAlert.style.display = 'block';
  } else {
    offlineAlert.style.display = 'none';
  }
  
  // Keywords
  const keywordsSection = document.getElementById('atsKeywordsSection');
  const keywordsContainer = document.getElementById('atsMissingKeywords');
  keywordsContainer.innerHTML = '';
  if (data.aiBreakdown && data.aiBreakdown.missingKeywords && data.aiBreakdown.missingKeywords.length > 0) {
    data.aiBreakdown.missingKeywords.forEach(kw => {
      const pill = document.createElement('div');
      pill.className = 'skill-tag';
      pill.style.background = '#fef2f2';
      pill.style.color = '#ef4444';
      pill.style.border = '1px solid #fee2e2';
      pill.innerHTML = `<span>${kw}</span>`;
      keywordsContainer.appendChild(pill);
    });
    keywordsSection.style.display = 'block';
  } else {
    keywordsSection.style.display = 'none';
  }
  
  // Strengths
  const strengthsSection = document.getElementById('atsStrengthsSection');
  const strengthsList = document.getElementById('atsStrengths');
  strengthsList.innerHTML = '';
  if (data.aiBreakdown && data.aiBreakdown.strengths && data.aiBreakdown.strengths.length > 0) {
    data.aiBreakdown.strengths.forEach(st => {
      const li = document.createElement('li');
      li.textContent = st;
      strengthsList.appendChild(li);
    });
    strengthsSection.style.display = 'block';
  } else {
    strengthsSection.style.display = 'none';
  }
  
  // Merged suggestions list: rule failures + AI improvements
  const suggestionsList = document.getElementById('atsSuggestions');
  suggestionsList.innerHTML = '';
  
  // Add rule failures
  if (data.ruleBreakdown && data.ruleBreakdown.length > 0) {
    data.ruleBreakdown.forEach(rule => {
      if (!rule.passed) {
        const li = document.createElement('li');
        li.className = 'failed';
        li.textContent = rule.suggestion;
        suggestionsList.appendChild(li);
      }
    });
  }
  
  // Add AI improvements
  if (data.aiBreakdown && data.aiBreakdown.improvements && data.aiBreakdown.improvements.length > 0) {
    data.aiBreakdown.improvements.forEach(imp => {
      const li = document.createElement('li');
      li.className = 'ai-improvement';
      li.textContent = imp;
      suggestionsList.appendChild(li);
    });
  }
  
  // Scroll panel into view smoothly
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
