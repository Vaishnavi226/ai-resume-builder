const axios = require('axios');

// Set of common active professional action verbs (lowercase) for deterministic parsing
const ACTION_VERBS = new Set([
  'managed', 'developed', 'designed', 'implemented', 'created', 'optimized', 'improved', 'built',
  'led', 'coordinated', 'programmed', 'analyzed', 'researched', 'established', 'executed', 'increased',
  'reduced', 'authored', 'spearheaded', 'collaborated', 'automated', 'delivered', 'formulated', 'engineered',
  'launched', 'guided', 'mentored', 'facilitated', 'initiated', 'monitored', 'directed', 'supervised',
  'administered', 'cultivated', 'negotiated', 'conducted', 'resolved', 'evaluated', 'streamlined', 'generated',
  'produced', 'accomplished', 'achieved', 'overhauled', 'boosted', 'accelerated', 'cut', 'slashed',
  'saved', 'maximized', 'minimized', 'secured', 'structured', 'integrated', 'architected', 'maintained',
  'constructed', 'wrote', 'orchestrated'
]);

/**
 * Calculates a deterministic ATS compatibility score based on established guidelines.
 * Returns { ruleScore, ruleBreakdown }
 */
function calculateRuleBasedScore(resumeData) {
  const breakdown = [];
  let totalScore = 0;

  // 1. Contact info completeness (Weight: 15)
  const personalInfo = resumeData.personalInfo || {};
  const contactFields = ['fullName', 'email', 'phone', 'location'];
  const missingContactFields = contactFields.filter(f => !personalInfo[f] || personalInfo[f].trim() === '');
  
  const contactScore = Math.max(0, 15 - missingContactFields.length);
  const contactPassed = missingContactFields.length === 0;
  totalScore += contactScore;
  breakdown.push({
    check: "Contact info completeness",
    passed: contactPassed,
    scoreContribution: contactScore,
    suggestion: contactPassed 
      ? "Contact details are complete (Name, Email, Phone, Location)." 
      : `Missing contact details: ${missingContactFields.join(', ')}. Ensure all are present for recruiters.`
  });

  // 2. Professional summary (Weight: 10)
  const summaryText = resumeData.summary || '';
  const summaryLen = summaryText.trim().length;
  const summaryPassed = summaryLen > 200 && summaryLen < 600;
  const summaryScore = summaryPassed ? 10 : 0;
  totalScore += summaryScore;
  breakdown.push({
    check: "Professional summary length",
    passed: summaryPassed,
    scoreContribution: summaryScore,
    suggestion: summaryPassed 
      ? "Summary is of optimal length (between 200-600 characters)." 
      : `Summary is ${summaryLen} characters. Aim for 200-600 characters to remain concise and readable.`
  });

  // 3. Quantified achievements (Weight: 20)
  let quantifiedCount = 0;
  const experience = resumeData.experience || [];
  experience.forEach(exp => {
    const bullets = exp.bulletPoints || [];
    bullets.forEach(bp => {
      if (/\d/.test(bp)) {
        quantifiedCount++;
      }
    });
  });
  const quantifiedPassed = quantifiedCount >= 3;
  const quantifiedScore = quantifiedPassed ? 20 : 0;
  totalScore += quantifiedScore;
  breakdown.push({
    check: "Quantified achievements",
    passed: quantifiedPassed,
    scoreContribution: quantifiedScore,
    suggestion: quantifiedPassed 
      ? `Quantified ${quantifiedCount} bullet points with numbers/metrics.` 
      : "Include quantifiable metrics (percentages, dollars, counts) in at least 3 bullet points to showcase impact."
  });

  // 4. Action verbs (Weight: 15)
  let totalBullets = 0;
  let actionVerbCount = 0;
  experience.forEach(exp => {
    const bullets = exp.bulletPoints || [];
    bullets.forEach(bp => {
      const cleaned = bp.trim();
      if (cleaned.length > 0) {
        totalBullets++;
        const match = cleaned.match(/^[a-zA-Z]+/);
        if (match) {
          const firstWord = match[0].toLowerCase();
          if (ACTION_VERBS.has(firstWord)) {
            actionVerbCount++;
          }
        }
      }
    });
  });

  const verbRatio = totalBullets > 0 ? (actionVerbCount / totalBullets) : 0;
  const verbsPassed = totalBullets > 0 ? (verbRatio >= 0.70) : false;
  const verbsScore = verbsPassed ? 15 : 0;
  totalScore += verbsScore;
  breakdown.push({
    check: "Action verbs usage",
    passed: verbsPassed,
    scoreContribution: verbsScore,
    suggestion: verbsPassed 
      ? `Strong usage of action verbs. ${Math.round(verbRatio * 100)}% of bullets start with action verbs.` 
      : `Only ${Math.round(verbRatio * 100)}% of bullets start with a recognized action verb. Aim for at least 70%.`
  });

  // 5. No first-person pronouns (Weight: 10)
  let pronounCount = 0;
  const pronounRegex = /\b(i|me|my)\b/i;
  
  if (pronounRegex.test(summaryText)) {
    pronounCount++;
  }
  experience.forEach(exp => {
    const bullets = exp.bulletPoints || [];
    bullets.forEach(bp => {
      if (pronounRegex.test(bp)) {
        pronounCount++;
      }
    });
  });

  const pronounsPassed = pronounCount === 0;
  const pronounsScore = pronounsPassed ? 10 : 0;
  totalScore += pronounsScore;
  breakdown.push({
    check: "No first-person pronouns",
    passed: pronounsPassed,
    scoreContribution: pronounsScore,
    suggestion: pronounsPassed 
      ? "Professional tone: no first-person pronouns ('I', 'me', 'my') detected." 
      : "Remove first-person pronouns ('I', 'me', 'my') from your summary/bullets. Write in active third-person."
  });

  // 6. Length & density (Weight: 15)
  const skills = resumeData.skills || [];
  const skillsPassed = skills.length >= 5;

  let fullContentText = '';
  fullContentText += ` ${personalInfo.fullName || ''} ${personalInfo.email || ''} ${personalInfo.phone || ''} ${personalInfo.location || ''}`;
  fullContentText += ` ${summaryText}`;
  experience.forEach(exp => {
    fullContentText += ` ${exp.jobTitle || ''} ${exp.company || ''} ${exp.location || ''}`;
    (exp.bulletPoints || []).forEach(bp => fullContentText += ` ${bp}`);
  });
  (resumeData.education || []).forEach(edu => {
    fullContentText += ` ${edu.degree || ''} ${edu.school || ''} ${edu.year || ''}`;
  });
  skills.forEach(s => fullContentText += ` ${s}`);
  (resumeData.projects || []).forEach(proj => {
    fullContentText += ` ${proj.title || ''} ${proj.description || ''} ${proj.link || ''}`;
    (proj.technologies || []).forEach(t => fullContentText += ` ${t}`);
  });

  const wordCount = fullContentText.split(/\s+/).filter(w => w.trim() !== '').length;
  const wordCountPassed = wordCount >= 250 && wordCount <= 700;

  const densityPassed = wordCountPassed && skillsPassed;
  const densityScore = densityPassed ? 15 : 0;
  totalScore += densityScore;
  breakdown.push({
    check: "Length and density",
    passed: densityPassed,
    scoreContribution: densityScore,
    suggestion: densityPassed 
      ? `Ideal word count (${wordCount} words) and skills list length (${skills.length} skills).` 
      : `Ensure word count is 250-700 (currently ${wordCount} words) and you list at least 5 skills (currently ${skills.length}).`
  });

  // 7. File-friendly formatting (Weight: 15)
  // Check for characters that can mess up standard text parsing (like tabs, HTML structures, curlies)
  const hasFormatIssues = /[\t\\<>{}|]/.test(fullContentText);
  const formatPassed = !hasFormatIssues;
  const formatScore = formatPassed ? 15 : 0;
  totalScore += formatScore;
  breakdown.push({
    check: "File-friendly formatting",
    passed: formatPassed,
    scoreContribution: formatScore,
    suggestion: formatPassed 
      ? "No complex formatting characters (HTML brackets, backslashes, tabs) detected." 
      : "Remove HTML tags, curlies, backslashes, or tab characters that might interfere with ATS text indexing."
  });

  return {
    ruleScore: Math.min(100, Math.max(0, totalScore)),
    ruleBreakdown: breakdown
  };
}

/**
 * Prepares clean raw plain text representation of the resume.
 */
function prepareResumeText(resumeData) {
  let text = '';
  if (resumeData.personalInfo) {
    const p = resumeData.personalInfo;
    text += `Name: ${p.fullName || ''}\nEmail: ${p.email || ''}\nPhone: ${p.phone || ''}\nLocation: ${p.location || ''}\n\n`;
  }
  if (resumeData.summary) {
    text += `Summary:\n${resumeData.summary}\n\n`;
  }
  if (resumeData.experience && resumeData.experience.length > 0) {
    text += `Work Experience:\n`;
    resumeData.experience.forEach(exp => {
      text += `- ${exp.jobTitle || ''} at ${exp.company || ''} (${exp.startDate || ''} - ${exp.endDate || ''})\n`;
      (exp.bulletPoints || []).forEach(bp => {
        text += `  * ${bp}\n`;
      });
    });
    text += `\n`;
  }
  if (resumeData.education && resumeData.education.length > 0) {
    text += `Education:\n`;
    resumeData.education.forEach(edu => {
      text += `- ${edu.degree || ''}, ${edu.school || ''} (${edu.year || ''})\n`;
    });
    text += `\n`;
  }
  if (resumeData.skills && resumeData.skills.length > 0) {
    text += `Skills: ${resumeData.skills.join(', ')}\n\n`;
  }
  if (resumeData.projects && resumeData.projects.length > 0) {
    text += `Projects:\n`;
    resumeData.projects.forEach(proj => {
      text += `- ${proj.title || ''}: ${proj.description || ''}\n`;
    });
  }
  return text;
}

/**
 * Calls Grok to perform ATS compatibility checks.
 */
async function evaluateResumeWithAI(resumeText, jobDescription) {
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey || apiKey === 'xai-your-api-key' || apiKey.trim() === '') {
    console.warn('Grok API Key missing. Skipping AI scoring.');
    return null;
  }

  const systemPrompt = `You are an ATS (Applicant Tracking System) expert. Evaluate the following resume against the provided job description (if any). Analyse: keyword matching, action verb usage, quantifiable achievements, clarity, and overall ATS-friendliness. 

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "score": number (0-100),
  "keywordMatch": number (0-100),
  "missingKeywords": ["keyword1", "keyword2"],
  "strengths": ["strength1", "strength2"],
  "improvements": ["suggestion1", "suggestion2"]
}
If no job description is provided, base the score on general ATS best practices and use generic keywords for the industry inferred from the resume.`;

  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Resume Plain Text:\n${resumeText}\n\nJob Description:\n${jobDescription || 'None provided'}` 
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    let content = response.data.choices[0].message.content.trim();

    // Strip Markdown code block if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(content);
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 70,
        keywordMatch: typeof parsed.keywordMatch === 'number' ? parsed.keywordMatch : 70,
        missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : []
      };
    } catch (parseErr) {
      console.error('Failed to parse AI ATS score JSON:', content);
      return null;
    }
  } catch (error) {
    console.error('Grok AI ATS evaluation error:', error.message);
    return null;
  }
}

/**
 * Combines rule-based and AI scores into a single hybrid score.
 */
async function getATScores(resumeData, jobDescription) {
  // 1. Run rule-based scoring (40% weight)
  const { ruleScore, ruleBreakdown } = calculateRuleBasedScore(resumeData);

  // 2. Prepare text & call Grok AI scoring (60% weight)
  const resumeText = prepareResumeText(resumeData);
  const aiResult = await evaluateResumeWithAI(resumeText, jobDescription);

  if (aiResult) {
    const finalScore = Math.round(ruleScore * 0.4 + aiResult.score * 0.6);
    return {
      finalScore: Math.min(100, Math.max(0, finalScore)),
      ruleScore,
      aiScore: aiResult.score,
      ruleBreakdown,
      aiBreakdown: {
        keywordMatch: aiResult.keywordMatch,
        missingKeywords: aiResult.missingKeywords,
        strengths: aiResult.strengths,
        improvements: aiResult.improvements
      }
    };
  } else {
    // If AI fails/is missing, fall back to rule score as final score
    return {
      finalScore: ruleScore,
      ruleScore,
      aiScore: null,
      ruleBreakdown,
      aiBreakdown: null,
      note: "AI evaluation is offline or API key is not configured. Displaying deterministic rule compatibility score."
    };
  }
}

module.exports = {
  calculateRuleBasedScore,
  evaluateResumeWithAI,
  getATScores,
  prepareResumeText
};
