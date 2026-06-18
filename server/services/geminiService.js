const axios = require('axios');

const SYSTEM_PROMPT = `You are a premium developer portfolio content writer and career coach. Your task is to generate and enhance a user's portfolio data to make it extremely premium, engaging, and ready for recruitment.

You will be given the user's current profile data, skills list, projects, and educational info. 

Requirements:
1. tagline: Produce a professional, punchy developer tagline (max 80 chars).
2. bio: Generate a compelling, 2-3 sentence biography outlining their passion, background, and tech stack.
3. stats: Provide exactly 4 statistics tailored to their experience (e.g., years of experience, projects built, DSA challenges solved, certificates, etc.). Each stat must have a short "value" (e.g., "2+", "500+") and a "label" (e.g., "DSA Solved", "Years Exp.").
4. skillCategories: Categorize their skills list (or infer relevant ones if sparse) into exactly 3 logical buckets (e.g., "Frontend Mastery", "Backend & DB", "Logic & Ops"). For each bucket, provide a "name" (the bucket name), a "percentage" (an integer proficiency score 1-100), and a list of "skills" (array of technology strings, max 4 per category).
5. projects: Enhance the user's current project list, or if empty, generate exactly 3 modern developer projects (each with title, description, list of technologies, and a GitHub/live placeholder link).
6. education: Enhance their educational background or generate a realistic timeline of 3 educational milestones (e.g. Bachelor of Computer Science, Specialization, Certifications) with school name and graduation year range.

IMPORTANT: You must return ONLY a valid JSON object matching this exact structure:
{
  "tagline": "string",
  "bio": "string",
  "stats": [
    { "value": "string", "label": "string" },
    { "value": "string", "label": "string" },
    { "value": "string", "label": "string" },
    { "value": "string", "label": "string" }
  ],
  "skillCategories": [
    { "name": "string", "percentage": 90, "skills": ["string", "string"] },
    { "name": "string", "percentage": 85, "skills": ["string", "string"] },
    { "name": "string", "percentage": 80, "skills": ["string", "string"] }
  ],
  "projects": [
    { "title": "string", "description": "string", "technologies": ["string"], "link": "string" },
    { "title": "string", "description": "string", "technologies": ["string"], "link": "string" },
    { "title": "string", "description": "string", "technologies": ["string"], "link": "string" }
  ],
  "education": [
    { "degree": "string", "school": "string", "year": "string" },
    { "degree": "string", "school": "string", "year": "string" },
    { "degree": "string", "school": "string", "year": "string" }
  ]
}`;

/**
 * Fallback to offline generation based on the candidate's name and skills list.
 */
function generateOfflineMock(data) {
  const name = data.fullName || 'Software Engineer';
  const skills = data.skills && data.skills.length > 0 ? data.skills : ['HTML5', 'CSS3', 'React', 'Node.js', 'Java', 'DSA', 'Git'];
  
  // Custom presets depending on what they have
  const isJava = skills.some(s => s.toLowerCase().includes('java') || s.toLowerCase().includes('dsa'));
  
  return {
    tagline: isJava ? 'Full Stack Developer | Problem Solver | Tech Enthusiast' : 'Full Stack Developer & UI/UX Specialist',
    bio: `I am a dedicated Software Developer with a strong foundation in Computer Science and a passion for building scalable, user-centric applications. With expertise in modern web technologies, I thrive on turning complex problems into elegant code solutions.`,
    stats: [
      { value: '2+', label: 'Years Exp.' },
      { value: '15+', label: 'Projects' },
      { value: '500+', label: isJava ? 'DSA Solved' : 'GitHub Commits' },
      { value: '10+', label: 'Certifications' }
    ],
    skillCategories: [
      { name: 'Frontend Mastery', percentage: 95, skills: skills.slice(0, 3) },
      { name: 'Backend & DB', percentage: 88, skills: skills.slice(3, 6).concat(['MongoDB', 'SQL']).slice(0, 3) },
      { name: 'Logic & Ops', percentage: 92, skills: isJava ? ['Java', 'DSA', 'Git'] : ['TypeScript', 'Git', 'Docker'] }
    ],
    projects: [
      {
        title: 'AI Resume Builder',
        description: 'An intelligent platform that crafts tailored resumes and portfolios using GPT-4, optimized for ATS systems.',
        technologies: ['React', 'Node.js', 'OpenAI'],
        link: 'github.com/developer/ai-resume-builder'
      },
      {
        title: 'EchoStream',
        description: 'Premium music streaming interface featuring high-fidelity audio playback and personalized glassmorphic UI.',
        technologies: ['Next.js', 'Tailwind', 'Firebase'],
        link: 'github.com/developer/echostream'
      },
      {
        title: 'TaskFlow Pro',
        description: 'A comprehensive productivity dashboard for engineering teams. Features real-time collaboration, task prioritization with AI, and detailed velocity analytics.',
        technologies: ['React', 'WebSockets', 'Chart.js'],
        link: 'github.com/developer/taskflow-pro'
      }
    ],
    education: [
      { degree: 'Bachelor of Computer Science', school: 'Tech University', year: '2021 - 2025' },
      { degree: 'Advanced Java Certification', school: 'Oracle University', year: '2023' },
      { degree: 'Full Stack Specialization', school: 'NextHire Academy', year: '2024' }
    ]
  };
}

async function generatePortfolioAIContent(portfolioData) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const grokKey = process.env.GROK_API_KEY;

  const originalData = {
    fullName: portfolioData.fullName || '',
    tagline: portfolioData.tagline || '',
    bio: portfolioData.bio || '',
    skills: portfolioData.skills || [],
    projects: (portfolioData.projects || []).map(p => ({ title: p.title || '', description: p.description || '', technologies: p.technologies || [], link: p.link || '' })),
    education: (portfolioData.education || []).map(e => ({ degree: e.degree || '', school: e.school || '', year: e.year || '' }))
  };

  const prompt = `${SYSTEM_PROMPT}\n\nUser Profile Data Input:\n${JSON.stringify(originalData)}`;

  // 1. Try Gemini API first
  if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'YOUR_GEMINI_KEY') {
    try {
      console.log('Sending request to Gemini API...');
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3
          }
        },
        { timeout: 15000 }
      );

      const text = response.data.candidates[0].content.parts[0].text.trim();
      const parsed = JSON.parse(text);
      console.log('Gemini API call successful and parsed.');
      return parsed;

    } catch (err) {
      console.error('Gemini API failed, attempting fallback to Grok...', err.message);
    }
  }

  // 2. Try Grok API as fallback
  if (grokKey && grokKey.trim() !== '' && grokKey !== 'xai-your-api-key') {
    try {
      console.log('Sending request to Grok API...');
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-beta',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `User Profile Data Input:\n${JSON.stringify(originalData)}` }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${grokKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      let text = response.data.choices[0].message.content.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim();
      }
      const parsed = JSON.parse(text);
      console.log('Grok API call successful and parsed.');
      return parsed;

    } catch (err) {
      console.error('Grok API failed, falling back to local generator...', err.message);
    }
  }

  // 3. Last fallback: local offline mock generator
  console.log('Using offline mock generator to complete portfolio data.');
  return generateOfflineMock(originalData);
}

module.exports = { generatePortfolioAIContent, suggestResumeImprovements };

const RESUME_SYSTEM_PROMPT = `You are an elite career coach and professional resume writer. Your task is to enhance a user's resume content to be highly impactful, ATS-optimized, and tailored to a specific job description.

Guidelines:
- Rewrite the professional summary into a 3–4 sentence narrative that connects the candidate's experience to the job requirements, highlighting their unique value proposition.
- Improve each experience bullet point to follow the formula: [Strong Action Verb] + [Task/Context] + [Quantifiable Result/Impact]. If numbers aren't provided, infer reasonable metrics based on the role (e.g., "improved efficiency by 20%").
- Ensure language is concise, active, and devoid of clichés.
- Subtly incorporate keywords from the job description without fabricating experience.
- Maintain the original facts (company names, titles, dates, education) but enhance phrasing.
- If the user provides no job description, produce a general but powerful version.

Output ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "summary": "Improved summary text",
  "experience": [
    {
      "company": "Original Company",
      "jobTitle": "Original Job Title",
      "bulletPoints": ["Improved bullet 1", "Improved bullet 2"]
    }
  ]
}
If no improvements are possible, return the original text unchanged. Always return valid JSON.`;

/**
 * Improve resume content using Gemini (primary) -> Grok (fallback) -> offline mock.
 */
async function suggestResumeImprovements(resumeData, jobDescription) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const grokKey = process.env.GROK_API_KEY;

  const originalData = {
    summary: resumeData.summary || '',
    experience: (resumeData.experience || []).map(exp => ({
      company: exp.company || '',
      jobTitle: exp.jobTitle || '',
      bulletPoints: exp.bulletPoints || []
    }))
  };

  const prompt = `${RESUME_SYSTEM_PROMPT}\n\nResume Data: ${JSON.stringify(resumeData)}\nJob Description: ${jobDescription || 'None provided'}`;

  // 1. Try Gemini API first
  if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'YOUR_GEMINI_KEY') {
    try {
      console.log('[Resume AI] Sending request to Gemini API...');
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3
          }
        },
        { timeout: 15000 }
      );

      const text = response.data.candidates[0].content.parts[0].text.trim();
      const parsed = JSON.parse(text);
      console.log('[Resume AI] Gemini API call successful and parsed.');
      return parsed;

    } catch (err) {
      console.error('[Resume AI] Gemini API failed, attempting fallback to Grok...', err.message);
    }
  }

  // 2. Try Grok API as fallback
  if (grokKey && grokKey.trim() !== '' && grokKey !== 'xai-your-api-key') {
    try {
      console.log('[Resume AI] Sending request to Grok API...');
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-beta',
          messages: [
            { role: 'system', content: RESUME_SYSTEM_PROMPT },
            { role: 'user', content: `Resume Data: ${JSON.stringify(resumeData)}\nJob Description: ${jobDescription || 'None provided'}` }
          ],
          temperature: 0.3,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${grokKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      let text = response.data.choices[0].message.content.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim();
      }
      const parsed = JSON.parse(text);
      console.log('[Resume AI] Grok API call successful and parsed.');
      return parsed;

    } catch (err) {
      console.error('[Resume AI] Grok API failed, falling back to notification...', err.message);
    }
  }

  // 3. Last fallback: return original data with a notification
  console.log('[Resume AI] All AI providers failed. Returning original with notification.');
  return {
    ...originalData,
    notification: "AI could not improve the text right now; your original content is preserved."
  };
}
