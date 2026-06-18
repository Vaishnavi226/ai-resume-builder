const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const auth = require('../middleware/auth');
const grokService = require('../services/grokService');
const geminiService = require('../services/geminiService');
const latexService = require('../services/latexService');
const atsService = require('../services/atsService');

// Helper to escape LaTeX special characters to prevent compilation failures
function escapeLatex(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// GET /api/resume - Fetch current user's resume
router.get('/', auth, async (req, res) => {
  try {
    let resume = await Resume.findOne({ userId: req.userId });
    if (!resume) {
      // Return empty structures if user hasn't created a resume yet
      return res.json({
        personalInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '', website: '', youtube: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        projects: [],
        jobDescription: ''
      });
    }
    res.json(resume);
  } catch (error) {
    console.error('Fetch Resume Error:', error.message);
    res.status(500).json({ message: 'Error fetching resume data' });
  }
});

// PUT /api/resume - Save/update current user's resume
router.put('/', auth, async (req, res) => {
  const { personalInfo, summary, experience, education, skills, projects, jobDescription } = req.body;

  try {
    let resume = await Resume.findOne({ userId: req.userId });

    if (resume) {
      resume.personalInfo = personalInfo || resume.personalInfo;
      resume.summary = typeof summary === 'string' ? summary : resume.summary;
      resume.experience = experience || resume.experience;
      resume.education = education || resume.education;
      resume.skills = skills || resume.skills;
      resume.projects = projects || resume.projects;
      resume.jobDescription = typeof jobDescription === 'string' ? jobDescription : resume.jobDescription;
      await resume.save();
    } else {
      resume = new Resume({
        userId: req.userId,
        personalInfo,
        summary,
        experience,
        education,
        skills,
        projects,
        jobDescription
      });
      await resume.save();
    }

    res.json({ message: 'Resume saved successfully', resume });
  } catch (error) {
    console.error('Save Resume Error:', error.message);
    res.status(500).json({ message: 'Error saving resume data' });
  }
});

// POST /api/resume/ai-suggest - Suggest improvements using Grok API
router.post('/ai-suggest', auth, async (req, res) => {
  const { resumeData, jobDescription } = req.body;

  if (!resumeData) {
    return res.status(400).json({ message: 'Resume data is required for suggestions' });
  }

  try {
    const suggestions = await geminiService.suggestResumeImprovements(resumeData, jobDescription);
    res.json(suggestions);
  } catch (error) {
    console.error('AI Suggestion route error:', error.message);
    res.status(500).json({ message: `AI suggestion failed: ${error.message}` });
  }
});

// POST /api/resume/generate-pdf - Fills LaTeX and compiles
router.post('/generate-pdf', auth, async (req, res) => {
  const { personalInfo, summary, experience, education, skills, projects } = req.body;

  try {
    const templatePath = path.join(__dirname, '../templates/resume.tex');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ message: 'LaTeX resume template is missing on server' });
    }

    let texTemplate = fs.readFileSync(templatePath, 'utf8');

    // Build LaTeX Experience Blocks using new custom commands
    const experienceContent = (experience || []).map(exp => {
      const jobTitle = escapeLatex(exp.jobTitle);
      const company = escapeLatex(exp.company);
      const location = escapeLatex(exp.location);
      const startDate = escapeLatex(exp.startDate);
      const endDate = escapeLatex(exp.endDate);
      const bullets = (exp.bulletPoints || [])
        .filter(bp => bp.trim() !== '')
        .map(bp => `        \\resumeItem{${escapeLatex(bp)}}`)
        .join('\n');

      let block = `    \\resumeSubheading\n      {${company}}{${startDate} -- ${endDate}}\n      {${jobTitle}}{${location}}`;
      if (bullets.length > 0) {
        block += `\n      \\resumeItemListStart\n${bullets}\n      \\resumeItemListEnd`;
      }
      return block;
    }).join('\n\n');

    // Build LaTeX Education Blocks using new custom commands
    const educationContent = (education || [])
      .filter(edu => edu.school && edu.school.trim() !== '' && edu.school.trim() !== 'Not Specified')
      .map(edu => {
        const degree = escapeLatex(edu.degree);
        const school = escapeLatex(edu.school);
        const year = escapeLatex(edu.year);
        const pct = edu.percentage ? `Score: ${escapeLatex(edu.percentage)}` : '';
        
        return `    \\resumeSubheading\n      {${school}}{${year}}\n      {${degree}}{${pct}}`;
      }).join('\n\n');

    // Build LaTeX Skills Block
    const flatSkillsList = (skills || [])
      .filter(s => s.trim() !== '')
      .map(s => escapeLatex(s.trim()))
      .join(', ');
    const skillsContent = flatSkillsList ? `\\textbf{Skills} {: ${flatSkillsList}}` : '';

    // Build LaTeX Projects Block using new custom commands
    const projectsContent = (projects || []).map(proj => {
      const title = escapeLatex(proj.title || '');
      const description = escapeLatex(proj.description || '');
      const technologies = (proj.technologies || []).filter(t => t.trim() !== '').map(t => escapeLatex(t.trim())).join(', ');
      
      let heading = `\\textbf{${title}}`;
      if (technologies) {
        heading += ` $|$ \\emph{${technologies}}`;
      }
      
      let linkItem = '';
      if (proj.link && proj.link.trim() !== '') {
        const cleanLink = proj.link.replace(/^(https?:\/\/)?(www\.)?/, '').trim();
        linkItem = `\\item \\href{https://${cleanLink}}{Link: ${escapeLatex(cleanLink)}}`;
      }
      
      let itemBlock = `      \\resumeItem{${description}}`;
      if (linkItem) {
        itemBlock += `\n      ${linkItem}`;
      }
      
      return `    \\resumeProjectHeading\n      {${heading}}{}\n      \\resumeItemListStart\n${itemBlock}\n      \\resumeItemListEnd`;
    }).join('\n\n');

    // Safely interpolate values
    let filledTex = texTemplate
      .replace('{{fullName}}', escapeLatex((personalInfo && personalInfo.fullName) || 'Resume Owner'))
      .replace('{{email}}', escapeLatex((personalInfo && personalInfo.email) || ''))
      .replace('{{phone}}', escapeLatex((personalInfo && personalInfo.phone) || ''))
      .replace('{{youtube}}', escapeLatex((personalInfo && personalInfo.youtube) || ''))
      .replace('{{location}}', escapeLatex((personalInfo && personalInfo.location) || ''))
      .replace('{{experienceContent}}', experienceContent || '')
      .replace('{{educationContent}}', educationContent || '')
      .replace('{{skillsContent}}', skillsContent || '')
      .replace('{{projectsContent}}', projectsContent || '');

    // Compile LaTeX via latexService
    const pdfBuffer = await latexService.compileLatex(filledTex);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error.message);
    res.status(500).json({ message: `LaTeX Compilation Failed: ${error.message}` });
  }
});

// POST /api/resume/ats-score - Calculate ATS compatibility score
router.post('/ats-score', auth, async (req, res) => {
  const { resumeData, jobDescription } = req.body;

  if (!resumeData) {
    return res.status(400).json({ message: 'Resume data is required' });
  }

  try {
    const scores = await atsService.getATScores(resumeData, jobDescription);
    res.json(scores);
  } catch (error) {
    console.error('ATS Scoring route error:', error.message);
    res.status(500).json({ message: `ATS compatibility scoring failed: ${error.message}` });
  }
});

module.exports = router;
