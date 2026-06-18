const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Portfolio = require('../models/Portfolio');
const Resume = require('../models/Resume');
const auth = require('../middleware/auth');
const grokService = require('../services/grokService');
const geminiService = require('../services/geminiService');

// In-memory store for generated preview HTML documents (expires in 10 minutes)
const previewCache = new Map();

function setPreview(id, html) {
  previewCache.set(id, { html, timestamp: Date.now() });
  
  // Clean up cache entries older than 10 minutes
  const tenMinsAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, val] of previewCache.entries()) {
    if (val.timestamp < tenMinsAgo) {
      previewCache.delete(key);
    }
  }
}

// Group flat skills list into 3 logical categories
function groupSkills(flatSkills) {
  const frontendKeywords = ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'js', 'next.js', 'svelte', 'tailwind', 'sass', 'bootstrap', 'jquery', 'flutter', 'ui', 'ux', 'frontend'];
  const backendKeywords = ['node', 'express', 'django', 'flask', 'spring', 'springboot', 'java', 'python', 'ruby', 'rails', 'php', 'laravel', 'c#', '.net', 'asp', 'graphql', 'rest', 'api', 'backend'];
  const dbKeywords = ['sql', 'mysql', 'postgres', 'mongodb', 'mongo', 'mongoose', 'sqlite', 'redis', 'firebase', 'supabase', 'database', 'db', 'cassandra', 'oracle'];

  const frontend = [];
  const backend = [];
  const logicOps = [];

  flatSkills.forEach(skill => {
    const lower = skill.toLowerCase();
    if (frontendKeywords.some(kw => lower.includes(kw))) {
      if (frontend.length < 4) frontend.push(skill);
    } else if (backendKeywords.some(kw => lower.includes(kw)) || dbKeywords.some(kw => lower.includes(kw))) {
      if (backend.length < 4) backend.push(skill);
    } else {
      if (logicOps.length < 4) logicOps.push(skill);
    }
  });

  // Fallbacks if lists are sparse
  if (frontend.length === 0) frontend.push('HTML5', 'CSS3', 'React');
  if (backend.length === 0) backend.push('Node.js', 'MongoDB', 'SQL');
  if (logicOps.length === 0) logicOps.push('Java', 'DSA', 'Git');

  return [
    { name: 'Frontend Mastery', percentage: 95, skills: frontend },
    { name: 'Backend & DB', percentage: 88, skills: backend },
    { name: 'Logic & Ops', percentage: 92, skills: logicOps }
  ];
}

function getContrastColor(hexColor) {
  if (!hexColor) return '#101415';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return '#101415';
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#101415' : '#ffffff';
}

function getCardStyleCss(styleChoice, primaryColor) {
  if (styleChoice === 'glassmorphic') {
    return `
.theme-card {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.theme-card-hover:hover {
    border-color: ${primaryColor}50;
    background: rgba(255, 255, 255, 0.04);
    transform: translateY(-6px);
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 20px ${primaryColor}15;
}
`;
  } else if (styleChoice === 'bordered') {
    return `
.theme-card {
    background: transparent;
    border: 2px solid ${primaryColor}20;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.theme-card-hover:hover {
    border-color: ${primaryColor};
    transform: translateY(-6px);
    box-shadow: 0 15px 35px -10px ${primaryColor}25;
}
`;
  } else if (styleChoice === 'glowing') {
    return `
.theme-card {
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid ${primaryColor}15;
    box-shadow: 0 0 15px ${primaryColor}10;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.theme-card-hover:hover {
    border-color: ${primaryColor}70;
    box-shadow: 0 0 35px ${primaryColor}30;
    transform: translateY(-6px);
}
`;
  } else {
    // flat style
    return `
.theme-card {
    background: rgba(255, 255, 255, 0.03);
    border: none;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.theme-card-hover:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-6px);
    box-shadow: 0 15px 30px -10px rgba(0,0,0,0.5);
}
`;
  }
}

// Helper function to build the portfolio HTML from the template
function compilePortfolioHtml(data) {
  const templatePath = path.join(__dirname, '../templates/portfolioTheme.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Portfolio HTML template is missing on server');
  }

  let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

  const { fullName, profileImage, tagline, bio, skills, projects, theme, socialLinks, education, stats, skillCategories } = data;

  const primaryColor = (theme && theme.primaryColor) || '#d2bbff';
  const onPrimaryColor = getContrastColor(primaryColor);
  const secondaryColor = (theme && theme.secondaryColor) || '#bec6e0';
  const tertiaryColor = (theme && theme.tertiaryColor) || '#3cddc7';
  const backgroundColor = (theme && theme.backgroundColor) || '#101415';
  const font = (theme && theme.font) || 'Geist';
  const styleChoice = (theme && theme.cardStyle) || 'glassmorphic';

  // 1. Compile Profile Photo
  let profileImageHtml = '';
  if (profileImage) {
    profileImageHtml = `<div class="relative rounded-3xl w-64 h-64 md:w-96 md:h-96 p-1.5 bg-gradient-to-tr from-[${primaryColor}]/30 to-[${tertiaryColor}]/30 border border-white/10 shadow-2xl overflow-hidden group/img"><img src="${profileImage}" class="w-full h-full rounded-2xl object-cover grayscale group-hover/img:grayscale-0 group-hover/img:scale-[1.02] transition-all duration-500" alt="${fullName || 'Profile image'}"><div class="absolute inset-0 bg-gradient-to-t from-[#101415]/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none"></div></div>`;
  } else {
    profileImageHtml = `<div class="relative rounded-3xl w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-md flex flex-col items-center justify-center border border-white/10 shadow-2xl group/avatar overflow-hidden"><div class="absolute inset-0 bg-gradient-to-tr from-[${primaryColor}]/10 via-transparent to-[${tertiaryColor}]/10 opacity-50 group-hover/avatar:opacity-100 transition-opacity duration-500"></div><div class="absolute -top-10 -left-10 w-40 h-40 bg-[${primaryColor}]/20 rounded-full blur-3xl group-hover/avatar:scale-110 transition-transform duration-500"></div><div class="absolute -bottom-10 -right-10 w-40 h-40 bg-[${tertiaryColor}]/20 rounded-full blur-3xl group-hover/avatar:scale-110 transition-transform duration-500"></div><div class="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center shadow-lg group-hover/avatar:border-primary/30 group-hover/avatar:shadow-primary/10 transition-all duration-500"><span class="material-symbols-outlined text-5xl text-primary drop-shadow-[0_0_15px_rgba(210,187,255,0.6)] animate-pulse-slow">person</span></div><span class="relative z-10 mt-4 text-xs font-label-caps text-on-surface-variant tracking-widest opacity-60 group-hover/avatar:opacity-100 group-hover/avatar:text-primary transition-all duration-300">Creator Avatar</span></div>`;
  }

  // 2. Navigation logo name (e.g. Vaishnavi.T)
  let navName = 'Portfolio';
  if (fullName && fullName.trim() !== '') {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      navName = parts[0] + '.' + parts[parts.length - 1][0].toUpperCase();
    } else {
      navName = parts[0];
    }
  }

  // 3. Compile Social Links
  let socialLinksContent = '';
  if (socialLinks) {
    if (socialLinks.linkedin) {
      const clean = socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : 'https://' + socialLinks.linkedin;
      socialLinksContent += `<a class="w-12 h-12 rounded-full bg-white/3 border border-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary hover:scale-110 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-md" href="${clean}" target="_blank"><span class="material-symbols-outlined text-2xl">public</span></a>`;
    }
    if (socialLinks.github) {
      const clean = socialLinks.github.startsWith('http') ? socialLinks.github : 'https://' + socialLinks.github;
      socialLinksContent += `<a class="w-12 h-12 rounded-full bg-white/3 border border-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary hover:scale-110 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-md" href="${clean}" target="_blank"><span class="material-symbols-outlined text-2xl">terminal</span></a>`;
    }
    if (socialLinks.twitter) {
      const clean = socialLinks.twitter.startsWith('http') ? socialLinks.twitter : 'https://' + socialLinks.twitter;
      socialLinksContent += `<a class="w-12 h-12 rounded-full bg-white/3 border border-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary hover:scale-110 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-md" href="${clean}" target="_blank"><span class="material-symbols-outlined text-2xl">mail</span></a>`;
    }
    if (socialLinks.youtube) {
      const clean = socialLinks.youtube.startsWith('http') ? socialLinks.youtube : 'https://youtube.com/' + socialLinks.youtube.replace(/^@/, '');
      socialLinksContent += `<a class="w-12 h-12 rounded-full bg-white/3 border border-white/5 flex items-center justify-center text-on-surface-variant hover:text-primary hover:scale-110 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-md" href="${clean}" target="_blank"><span class="material-symbols-outlined text-2xl">video_library</span></a>`;
    }
  }

  // 4. Compile Stats Grid
  const statsList = stats && stats.length === 4 ? stats : [
    { value: '2+', label: 'Years Exp.' },
    { value: '15+', label: 'Projects' },
    { value: '500+', label: 'DSA Solved' },
    { value: '10+', label: 'Certs' }
  ];
  const statsHtml = statsList.map(st => `
    <div>
      <div class="text-primary font-bold text-headline-sm">${st.value || '0'}</div>
      <div class="text-label-caps font-label-caps text-on-surface-variant">${st.label || 'N/A'}</div>
    </div>
  `).join('\n');

  // 5. Compile Technical Arsenal (Grouped Skills)
  const skillCats = skillCategories && skillCategories.length === 3 ? skillCategories : [
    { name: 'Frontend Mastery', percentage: 95, skills: ['HTML5', 'CSS3', 'React'] },
    { name: 'Backend & DB', percentage: 88, skills: ['Node.js', 'MongoDB', 'SQL'] },
    { name: 'Logic & Ops', percentage: 92, skills: ['Java', 'DSA', 'Git'] }
  ];
  const icons = ['html', 'database', 'code'];
  const colors = ['text-primary', 'text-tertiary', 'text-secondary'];
  const progressColors = ['bg-primary', 'bg-tertiary', 'bg-secondary'];
  const skillsHtml = skillCats.map((cat, idx) => {
    const icon = icons[idx % 3];
    const color = colors[idx % 3];
    const progColor = progressColors[idx % 3];
    const tags = (cat.skills || []).map(t => `<span class="${progColor}/10 border border-${progColor}/30 px-3 py-1 rounded-full text-label-caps font-label-caps text-on-surface">${t}</span>`).join('\n');

    return `
      <div class="theme-card p-8 rounded-2xl theme-card-hover">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-4">
            <span class="material-symbols-outlined ${color}">${icon}</span>
            <span class="font-bold">${cat.name}</span>
          </div>
          <span class="text-primary font-label-code">${cat.percentage}%</span>
        </div>
        <div class="space-y-4">
          <div class="h-2 bg-white/5 rounded-full overflow-hidden">
            <div class="h-full ${progColor} progress-fill" style="width: ${cat.percentage}%"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            ${tags}
          </div>
        </div>
      </div>
    `;
  }).join('\n');

  // 6. Compile Projects (Sorted by order)
  const sortedProjects = [...(projects || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const projectsContent = sortedProjects.map((proj, idx) => {
    let imageHtml = '';
    if (proj.image) {
      imageHtml = `<img src="${proj.image}" alt="${proj.title}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700">`;
    } else {
      imageHtml = `<div class="w-full h-48 bg-surface-container flex items-center justify-center"><span class="material-symbols-outlined text-5xl text-primary opacity-30">image</span></div>`;
    }

    let linkHtml = '';
    if (proj.link) {
      let cleanLink = proj.link.trim();
      if (cleanLink && !cleanLink.startsWith('http')) {
        cleanLink = 'https://' + cleanLink;
      }
      linkHtml = `
        <a class="text-on-surface-variant hover:text-primary transition-colors" href="${cleanLink}" target="_blank"><span class="material-symbols-outlined">link</span></a>
      `;
    }

    const techHtml = (proj.technologies || []).map(t => `<span class="bg-white/5 px-3 py-1 rounded-md text-label-caps font-label-caps">${t}</span>`).join('\n');

    return `
      <div class="group relative">
        <div class="overflow-hidden rounded-3xl theme-card flex flex-col h-full">
          <div class="overflow-hidden h-48">
            ${imageHtml}
          </div>
          <div class="p-6 flex-grow flex flex-col justify-between space-y-4">
            <div class="space-y-2">
              <div class="flex justify-between items-start">
                <h3 class="font-headline-sm text-headline-sm text-on-surface">${proj.title}</h3>
                <div class="flex gap-3">
                  ${linkHtml}
                </div>
              </div>
              <p class="text-on-surface-variant text-sm leading-relaxed">${proj.description || ''}</p>
            </div>
            <div class="space-y-4">
              <div class="flex flex-wrap gap-2">
                ${techHtml}
              </div>
              ${proj.link ? `
                <a href="${proj.link.startsWith('http') ? proj.link : 'https://' + proj.link}" class="bg-primary text-on-primary px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 w-full hover:scale-102 hover:shadow-[0_0_15px_rgba(210,187,255,0.3)] transition-all text-sm" target="_blank">
                  View Project <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('\n');

  // 7. Compile Timeline (Educational Journey)
  let eduList = (education && education.length > 0) ? [...education] : [
    { degree: 'Graduation', school: 'Stanford University', year: '2021 - 2025', percentage: '3.9 GPA' },
    { degree: 'HSC', school: 'West High School', year: '2019 - 2021', percentage: '91%' },
    { degree: 'SSC', school: 'West Middle School', year: '2019', percentage: '94%' }
  ];
  if (education && education.length > 0) {
    const firstDeg = (eduList[0].degree || '').toLowerCase();
    if (firstDeg.includes('ssc') || firstDeg.includes('10') || firstDeg.includes('matric') || firstDeg.includes('school')) {
      eduList.reverse();
    }
  }
  const timelineHtml = eduList.map((edu, idx) => {
    const isEven = idx % 2 === 0;
    const alignmentClass = isEven ? 'md:flex-row' : 'md:flex-row-reverse';
    const textAlignmentClass = isEven ? 'text-right' : 'text-left';
    const marginClass = isEven ? 'md:ml-0' : 'md:mr-0';
    const dotBorderColor = isEven ? 'border-primary' : 'border-tertiary';
    const dotIconColor = isEven ? 'text-primary' : 'text-tertiary';
    const dotIcon = idx === 0 ? 'school' : idx === 1 ? 'workspace_premium' : 'code';

    return `
      <div class="relative flex flex-col md:flex-row items-center justify-between mb-24 last:mb-0 group ${alignmentClass}">
        <div class="w-full md:w-[45%] ${textAlignmentClass} hidden md:block">
          <div class="text-tertiary font-label-code text-xl mb-2">${edu.year || ''}</div>
          <h4 class="font-headline-sm text-headline-sm">${edu.degree}</h4>
          ${edu.percentage ? `<div class="text-primary font-bold text-xs mt-1">Score: ${edu.percentage}</div>` : ''}
        </div>
        <div class="z-10 w-12 h-12 rounded-full theme-card border-2 ${dotBorderColor} flex items-center justify-center bg-[#101415] group-hover:scale-125 transition-transform">
          <span class="material-symbols-outlined ${dotIconColor} text-lg">${dotIcon}</span>
        </div>
        <div class="w-full md:w-[45%] theme-card p-6 rounded-2xl ${marginClass} mt-4 md:mt-0">
          <div class="md:hidden text-tertiary font-label-code mb-2">${edu.year || ''}</div>
          <h4 class="md:hidden font-headline-sm text-headline-sm mb-2">${edu.degree}</h4>
          <p class="text-primary font-semibold text-sm mb-2">${edu.school}</p>
          ${edu.percentage ? `<p class="text-tertiary font-medium text-xs mb-2">Score: ${edu.percentage}</p>` : ''}
        </div>
      </div>
    `;
  }).join('\n');

  // 8. Contact Info Html
  let emailVal = data.email || 'hello@developer.io';
  let phoneVal = data.phone || '+91 (800) 123-4567';
  let locationVal = data.location || 'Bengaluru, India';

  const contactInfoHtml = `
    <div class="flex items-center gap-6 group theme-card p-5 rounded-2xl theme-card-hover transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/25 transition-all">
            <span class="material-symbols-outlined text-primary text-xl">mail</span>
        </div>
        <div>
            <div class="text-label-caps font-label-caps text-on-surface-variant text-[10px] tracking-widest">Email Me</div>
            <div class="font-bold text-sm sm:text-base text-on-surface">${emailVal}</div>
        </div>
    </div>
    <div class="flex items-center gap-6 group theme-card p-5 rounded-2xl theme-card-hover transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center group-hover:bg-tertiary/25 transition-all">
            <span class="material-symbols-outlined text-tertiary text-xl">call</span>
        </div>
        <div>
            <div class="text-label-caps font-label-caps text-on-surface-variant text-[10px] tracking-widest">Call Me</div>
            <div class="font-bold text-sm sm:text-base text-on-surface">${phoneVal}</div>
        </div>
    </div>
    <div class="flex items-center gap-6 group theme-card p-5 rounded-2xl theme-card-hover transition-all duration-300">
        <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/25 transition-all">
            <span class="material-symbols-outlined text-primary text-xl">location_on</span>
        </div>
        <div>
            <div class="text-label-caps font-label-caps text-on-surface-variant text-[10px] tracking-widest">Based in</div>
            <div class="font-bold text-sm sm:text-base text-on-surface">${locationVal}</div>
        </div>
    </div>
  `;

  // 9. Footer Social links
  let footerSocialLinksHtml = '';
  if (socialLinks) {
    if (socialLinks.linkedin) {
      const clean = socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : 'https://' + socialLinks.linkedin;
      footerSocialLinksHtml += `<a class="text-on-surface-variant hover:text-tertiary transition-colors font-label-caps text-label-caps" href="${clean}" target="_blank">LinkedIn</a>`;
    }
    if (socialLinks.github) {
      const clean = socialLinks.github.startsWith('http') ? socialLinks.github : 'https://' + socialLinks.github;
      footerSocialLinksHtml += `<a class="text-on-surface-variant hover:text-tertiary transition-colors font-label-caps text-label-caps" href="${clean}" target="_blank">GitHub</a>`;
    }
    if (socialLinks.twitter) {
      const clean = socialLinks.twitter.startsWith('http') ? socialLinks.twitter : 'https://' + socialLinks.twitter;
      footerSocialLinksHtml += `<a class="text-on-surface-variant hover:text-tertiary transition-colors font-label-caps text-label-caps" href="${clean}" target="_blank">Twitter</a>`;
    }
    if (socialLinks.youtube) {
      const clean = socialLinks.youtube.startsWith('http') ? socialLinks.youtube : 'https://youtube.com/' + socialLinks.youtube.replace(/^@/, '');
      footerSocialLinksHtml += `<a class="text-on-surface-variant hover:text-tertiary transition-colors font-label-caps text-label-caps" href="${clean}" target="_blank">YouTube</a>`;
    }
  }

  // 10. Generate Card Style CSS
  const cardStyleCss = getCardStyleCss(styleChoice, primaryColor);

  const currentYear = new Date().getFullYear();

  // Replace placeholders in template
  let compiledHtml = htmlTemplate
    .replace(/{{fullName}}/g, fullName || 'Developer Portfolio')
    .replace(/{{tagline}}/g, tagline || '')
    .replace(/{{bio}}/g, bio || 'Web applications builder.')
    .replace(/{{primaryColor}}/g, primaryColor)
    .replace(/{{onPrimaryColor}}/g, onPrimaryColor)
    .replace(/{{secondaryColor}}/g, secondaryColor)
    .replace(/{{tertiaryColor}}/g, tertiaryColor)
    .replace(/{{backgroundColor}}/g, backgroundColor)
    .replace(/{{font}}/g, font)
    .replace(/{{navName}}/g, navName)
    .replace('{{cardStyleCss}}', cardStyleCss)
    .replace('{{profileImageHtml}}', profileImageHtml)
    .replace('{{socialLinksContent}}', socialLinksContent)
    .replace('{{statsHtml}}', statsHtml)
    .replace('{{skillsHtml}}', skillsHtml)
    .replace('{{projectsContent}}', projectsContent)
    .replace('{{timelineHtml}}', timelineHtml)
    .replace('{{contactInfoHtml}}', contactInfoHtml)
    .replace('{{footerSocialLinksHtml}}', footerSocialLinksHtml)
    .replace('{{currentYear}}', currentYear);

  return compiledHtml;
}

// GET /api/portfolio - Fetch user portfolio data
router.get('/', auth, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ userId: req.userId });
    const resume = await Resume.findOne({ userId: req.userId });

    const syncFromResume = portfolio ? (portfolio.syncFromResume !== undefined ? portfolio.syncFromResume : true) : true;

    // Default response structure matching Vaishnavi's theme default settings
    let response = {
      fullName: '',
      profileImage: '',
      tagline: '',
      bio: '',
      skills: [],
      projects: [],
      education: [],
      stats: [
        { value: '2+', label: 'Years Exp.' },
        { value: '15+', label: 'Projects' },
        { value: '500+', label: 'DSA Solved' },
        { value: '10+', label: 'Certs' }
      ],
      skillCategories: [
        { name: 'Frontend Mastery', percentage: 95, skills: ['HTML5', 'CSS3', 'React'] },
        { name: 'Backend & DB', percentage: 88, skills: ['Node.js', 'MongoDB', 'SQL'] },
        { name: 'Logic & Ops', percentage: 92, skills: ['Java', 'DSA', 'Git'] }
      ],
      theme: {
        primaryColor: '#d2bbff',
        secondaryColor: '#bec6e0',
        tertiaryColor: '#3cddc7',
        backgroundColor: '#101415',
        cardStyle: 'glassmorphic',
        font: 'Geist'
      },
      socialLinks: { github: '', linkedin: '', twitter: '', youtube: '' },
      syncFromResume: syncFromResume
    };

    if (portfolio) {
      response.fullName = portfolio.fullName;
      response.profileImage = portfolio.profileImage;
      response.tagline = portfolio.tagline;
      response.bio = portfolio.bio;
      response.skills = portfolio.skills;
      response.projects = portfolio.projects;
      response.education = portfolio.education || [];
      if (portfolio.stats && portfolio.stats.length > 0) {
        response.stats = portfolio.stats;
      }
      if (portfolio.skillCategories && portfolio.skillCategories.length > 0) {
        response.skillCategories = portfolio.skillCategories;
      }
      response.theme = { ...response.theme, ...portfolio.theme };
      response.socialLinks = portfolio.socialLinks || response.socialLinks;
    }

    if (syncFromResume && resume) {
      response.fullName = resume.personalInfo ? resume.personalInfo.fullName : response.fullName;
      response.bio = resume.summary || response.bio;
      response.skills = resume.skills || response.skills;
      response.education = resume.education || [];
      response.skillCategories = groupSkills(resume.skills || []);
      response.email = resume.personalInfo ? resume.personalInfo.email : '';
      response.phone = resume.personalInfo ? resume.personalInfo.phone : '';
      response.location = resume.personalInfo ? resume.personalInfo.location : '';
      if (resume.personalInfo) {
        response.socialLinks.linkedin = resume.personalInfo.linkedin || response.socialLinks.linkedin;
        response.socialLinks.youtube = resume.personalInfo.youtube || response.socialLinks.youtube;
      }
      
      const resumeProjects = resume.projects || [];
      response.projects = resumeProjects.map((p, index) => {
        const pObj = typeof p.toObject === 'function' ? p.toObject() : p;
        const portProj = portfolio && portfolio.projects && portfolio.projects[index];
        return {
          _id: pObj._id,
          title: pObj.title,
          description: pObj.description,
          link: pObj.link,
          technologies: pObj.technologies,
          image: portProj ? portProj.image : '',
          order: portProj && portProj.order !== undefined ? portProj.order : index
        };
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Fetch Portfolio Error:', error.message);
    res.status(500).json({ message: 'Error fetching portfolio data' });
  }
});

// PUT /api/portfolio - Update user portfolio data
router.put('/', auth, async (req, res) => {
  const { fullName, profileImage, tagline, bio, skills, projects, theme, socialLinks, syncFromResume, education, stats, skillCategories } = req.body;

  // Validate base64 image sizes (~3.5 million characters max, roughly 2.5 MB)
  if (profileImage && profileImage.length > 3500000) {
    return res.status(400).json({ message: 'Profile image size exceeds the maximum limit of 2.5MB.' });
  }

  if (projects && Array.isArray(projects)) {
    for (const proj of projects) {
      if (proj.image && proj.image.length > 3500000) {
        return res.status(400).json({ message: `Project "${proj.title || 'Untitled'}" image size exceeds the maximum limit of 2.5MB.` });
      }
    }
  }

  try {
    let portfolio = await Portfolio.findOne({ userId: req.userId });
    const activeSync = syncFromResume !== undefined ? syncFromResume : (portfolio ? portfolio.syncFromResume : true);

    if (portfolio) {
      if (activeSync) {
        portfolio.fullName = '';
        portfolio.bio = '';
        portfolio.skills = [];
        portfolio.education = [];
      } else {
        portfolio.fullName = typeof fullName === 'string' ? fullName : portfolio.fullName;
        portfolio.bio = typeof bio === 'string' ? bio : portfolio.bio;
        portfolio.skills = skills || portfolio.skills;
        portfolio.education = education || portfolio.education;
        if (skillCategories) portfolio.skillCategories = skillCategories;
      }
      portfolio.profileImage = typeof profileImage === 'string' ? profileImage : portfolio.profileImage;
      portfolio.tagline = typeof tagline === 'string' ? tagline : portfolio.tagline;
      portfolio.projects = projects || portfolio.projects;
      portfolio.theme = theme || portfolio.theme;
      portfolio.socialLinks = socialLinks || portfolio.socialLinks;
      portfolio.syncFromResume = activeSync;
      if (stats) portfolio.stats = stats;
      
      await portfolio.save();
    } else {
      portfolio = new Portfolio({
        userId: req.userId,
        fullName: activeSync ? '' : fullName,
        profileImage,
        tagline,
        bio: activeSync ? '' : bio,
        skills: activeSync ? [] : skills,
        education: activeSync ? [] : education,
        projects,
        theme,
        socialLinks,
        syncFromResume: activeSync,
        stats: stats,
        skillCategories: skillCategories
      });
      await portfolio.save();
    }

    res.json({ message: 'Portfolio saved successfully', portfolio });
  } catch (error) {
    console.error('Save Portfolio Error:', error.message);
    res.status(500).json({ message: 'Error saving portfolio data' });
  }
});

// POST /api/portfolio/preview - Generates preview HTML page and registers a temporary session ID
router.post('/preview', auth, async (req, res) => {
  try {
    let previewData = { ...req.body };
    if (previewData.syncFromResume) {
      const resume = await Resume.findOne({ userId: req.userId });
      if (resume) {
        previewData.fullName = resume.personalInfo ? resume.personalInfo.fullName : previewData.fullName;
        previewData.bio = resume.summary || previewData.bio;
        previewData.skills = resume.skills || previewData.skills;
        previewData.education = resume.education || [];
        previewData.skillCategories = groupSkills(resume.skills || []);
        previewData.email = resume.personalInfo ? resume.personalInfo.email : '';
        previewData.phone = resume.personalInfo ? resume.personalInfo.phone : '';
        previewData.location = resume.personalInfo ? resume.personalInfo.location : '';
        if (!previewData.socialLinks) previewData.socialLinks = {};
        if (resume.personalInfo) {
          previewData.socialLinks.linkedin = resume.personalInfo.linkedin || previewData.socialLinks.linkedin;
          previewData.socialLinks.youtube = resume.personalInfo.youtube || previewData.socialLinks.youtube;
        }
        
        const resumeProjects = resume.projects || [];
        previewData.projects = resumeProjects.map((p, index) => {
          const pObj = typeof p.toObject === 'function' ? p.toObject() : p;
          const frontProj = previewData.projects && previewData.projects[index];
          return {
            ...pObj,
            image: frontProj ? frontProj.image : '',
            order: frontProj && frontProj.order !== undefined ? frontProj.order : index
          };
        });
      }
    }
    const htmlString = compilePortfolioHtml(previewData);
    
    // Generate a temporary cache ID for the preview
    const previewId = crypto.randomBytes(16).toString('hex');
    setPreview(previewId, htmlString);

    res.json({
      previewId,
      previewUrl: `/api/portfolio/preview-render/${previewId}`,
      html: htmlString
    });
  } catch (error) {
    console.error('Portfolio Preview Error:', error.message);
    res.status(500).json({ message: `Failed to generate portfolio preview: ${error.message}` });
  }
});

// GET /api/portfolio/preview-render/:id - Serves the compiled HTML with stripped CSP and X-Frame-Options headers
router.get('/preview-render/:id', (req, res) => {
  try {
    const { id } = req.params;
    const cached = previewCache.get(id);
    if (!cached) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send('Preview expired or not found. Please modify the form to refresh the preview.');
    }

    // Bypass Helmet security headers specifically for this preview frame
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');

    res.setHeader('Content-Type', 'text/html');
    res.send(cached.html);
  } catch (error) {
    console.error('Preview Render Error:', error.message);
    res.status(500).send('Internal Server Error while rendering preview.');
  }
});

// POST /api/portfolio/ai-suggest - Suggest tags, tagline, stats, skills and descriptions using Gemini/Grok API
router.post('/ai-suggest', auth, async (req, res) => {
  const { fullName, tagline, bio, skills, projects, education } = req.body;
  try {
    const suggestions = await geminiService.generatePortfolioAIContent({
      fullName,
      tagline,
      bio,
      skills,
      projects,
      education
    });
    res.json(suggestions);
  } catch (error) {
    console.error('Portfolio AI Suggestion route error:', error.message);
    res.status(500).json({ message: `AI suggestion failed: ${error.message}` });
  }
});

// POST /api/portfolio/download-zip - Packages the portfolio code as separate HTML, CSS, JS, and image files in a ZIP archive
router.post('/download-zip', auth, async (req, res) => {
  try {
    const AdmZip = require('adm-zip');
    let previewData = { ...req.body };
    
    // Resolve sync from resume if enabled
    if (previewData.syncFromResume) {
      const resume = await Resume.findOne({ userId: req.userId });
      if (resume) {
        previewData.fullName = resume.personalInfo ? resume.personalInfo.fullName : previewData.fullName;
        previewData.bio = resume.summary || previewData.bio;
        previewData.skills = resume.skills || previewData.skills;
        previewData.education = resume.education || [];
        previewData.skillCategories = groupSkills(resume.skills || []);
        previewData.email = resume.personalInfo ? resume.personalInfo.email : '';
        previewData.phone = resume.personalInfo ? resume.personalInfo.phone : '';
        previewData.location = resume.personalInfo ? resume.personalInfo.location : '';
        if (!previewData.socialLinks) previewData.socialLinks = {};
        if (resume.personalInfo) {
          previewData.socialLinks.linkedin = resume.personalInfo.linkedin || previewData.socialLinks.linkedin;
          previewData.socialLinks.youtube = resume.personalInfo.youtube || previewData.socialLinks.youtube;
        }
        
        const resumeProjects = resume.projects || [];
        previewData.projects = resumeProjects.map((p, index) => {
          const pObj = typeof p.toObject === 'function' ? p.toObject() : p;
          const frontProj = previewData.projects && previewData.projects[index];
          return {
            ...pObj,
            image: frontProj ? frontProj.image : '',
            order: frontProj && frontProj.order !== undefined ? frontProj.order : index
          };
        });
      }
    }

    const { fullName, theme } = previewData;
    const primaryColor = (theme && theme.primaryColor) || '#d2bbff';
    const secondaryColor = (theme && theme.secondaryColor) || '#bec6e0';
    const tertiaryColor = (theme && theme.tertiaryColor) || '#3cddc7';
    const backgroundColor = (theme && theme.backgroundColor) || '#101415';
    const font = (theme && theme.font) || 'Geist';
    const styleChoice = (theme && theme.cardStyle) || 'glassmorphic';

    // 1. Process base64 images to physical files inside the ZIP
    const assets = [];
    
    if (previewData.profileImage && previewData.profileImage.startsWith('data:image/')) {
      const matches = previewData.profileImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const imgPath = `images/profile.${ext}`;
        assets.push({ path: imgPath, content: buffer });
        previewData.profileImage = imgPath; // Update reference to the local file path
      }
    }

    if (previewData.projects && Array.isArray(previewData.projects)) {
      previewData.projects.forEach((proj, idx) => {
        if (proj.image && proj.image.startsWith('data:image/')) {
          const matches = proj.image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const imgPath = `images/project_${idx}.${ext}`;
            assets.push({ path: imgPath, content: buffer });
            proj.image = imgPath; // Update reference to the local file path
          }
        }
      });
    }

    // 2. Generate Separated CSS (style.css)
    const cardStyleCss = getCardStyleCss(styleChoice, primaryColor);

    const cssContent = `/* Google Fonts & Icon Imports */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Space+Mono&display=swap');

body {
    background-color: ${backgroundColor};
    color: #e0e3e5;
    overflow-x: hidden;
    font-family: 'Inter', sans-serif;
}

h1, h2, h3, h4, h5, h6 {
    font-family: 'Poppins', sans-serif;
}

/* Customizable Card Styles */
${cardStyleCss}

.mesh-gradient {
    background: radial-gradient(circle at 0% 0%, ${primaryColor}20 0%, transparent 50%),
                radial-gradient(circle at 100% 100%, ${tertiaryColor}15 0%, transparent 50%);
}
.progress-fill {
    transition: width 1.5s cubic-bezier(0.65, 0, 0.35, 1);
}
.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
`;

    // 3. Generate Separated JavaScript (app.js)
    const jsContent = `// Simple scroll spy for navigation
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('#nav-links a');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('text-primary', 'font-bold', 'border-b-2', 'border-primary', 'pb-1');
        link.classList.add('text-on-surface-variant', 'font-medium');
        if (link.getAttribute('href').substring(1) === current) {
            link.classList.remove('text-on-surface-variant', 'font-medium');
            link.classList.add('text-primary', 'font-bold', 'border-b-2', 'border-primary', 'pb-1');
        }
    });
});

// Skill progress animation on intersection
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const bars = entry.target.querySelectorAll('.progress-fill');
            bars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

const skillSection = document.getElementById('skills');
if (skillSection) observer.observe(skillSection);
`;

    // 4. Generate index.html
    let htmlContent = compilePortfolioHtml(previewData);
    
    // Replace the inline style block with a stylesheet link
    htmlContent = htmlContent.replace(/<style>\s*body\s*\{[\s\S]*?<\/style>/, '<link rel="stylesheet" href="style.css">');
    
    // Replace the inline script block preceding </body> with app.js reference (targeted specifically by scroll spy comment)
    htmlContent = htmlContent.replace(/<script>\s*\/\/\s*Simple scroll spy for navigation[\s\S]*?<\/script>\s*<\/body>/, '<script src="app.js" defer></script>\n</body>');

    // 5. Create ZIP Archive
    const zip = new AdmZip();
    zip.addFile('index.html', Buffer.from(htmlContent, 'utf-8'));
    zip.addFile('style.css', Buffer.from(cssContent, 'utf-8'));
    zip.addFile('app.js', Buffer.from(jsContent, 'utf-8'));
    
    // Add raw images
    assets.forEach(asset => {
      zip.addFile(asset.path, asset.content);
    });

    const zipBuffer = zip.toBuffer();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=portfolio_project.zip`);
    res.send(zipBuffer);
  } catch (error) {
    console.error('ZIP compilation error:', error.message);
    res.status(500).json({ message: `Failed to compile ZIP package: ${error.message}` });
  }
});

module.exports = router;
module.exports.compilePortfolioHtml = compilePortfolioHtml;
