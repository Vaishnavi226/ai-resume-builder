const axios = require('axios');

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
      "bulletPoints": ["Improved bullet 1", "Improved bullet 2", ...]
    }
  ]
}
If no improvements are possible, return the original text unchanged. Always return valid JSON.`;

const PORTFOLIO_SYSTEM_PROMPT = `You are a personal branding expert. Enhance the user's portfolio tagline and project descriptions to be concise, compelling, and professional.
Return a JSON object:
{
  "tagline": "improved tagline",
  "projects": [
    { "title": "original title", "description": "improved description" },
    ...
  ]
}
If no improvements are possible, return the original text unchanged. Always return valid JSON.`;

/**
 * Calls xAI Grok API to improve a resume based on a job description.
 * Falls back to returning original data with a notification if parsing/API fails.
 */
async function suggestImprovements(resumeData, jobDescription) {
  const apiKey = process.env.GROK_API_KEY;

  const originalData = {
    summary: resumeData.summary || '',
    experience: (resumeData.experience || []).map(exp => ({
      company: exp.company || '',
      jobTitle: exp.jobTitle || '',
      bulletPoints: exp.bulletPoints || []
    }))
  };

  if (!apiKey || apiKey === 'xai-your-api-key' || apiKey.trim() === '') {
    console.warn('Grok API Key missing. Returning original data with notification.');
    return {
      ...originalData,
      notification: "AI could not improve the text right now; your original content is preserved."
    };
  }

  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-beta',
        messages: [
          { role: 'system', content: RESUME_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Resume Data: ${JSON.stringify(resumeData)}\nJob Description: ${jobDescription || 'None provided'}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout
      }
    );

    let content = response.data.choices[0].message.content.trim();
    
    // Clean up code blocks if the model wrapped it in markdown
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (parseErr) {
      console.error('Failed to parse Grok JSON response:', content);
      throw new Error('Grok response was not valid JSON');
    }

  } catch (error) {
    console.error('Grok API error:', error.message);
    return {
      ...originalData,
      notification: "AI could not improve the text right now; your original content is preserved."
    };
  }
}

/**
 * Calls xAI Grok API to improve a portfolio's tagline and project descriptions.
 */
async function suggestPortfolioImprovements(portfolioData) {
  const apiKey = process.env.GROK_API_KEY;

  const originalData = {
    tagline: portfolioData.tagline || '',
    projects: (portfolioData.projects || []).map(p => ({
      title: p.title || '',
      description: p.description || ''
    }))
  };

  if (!apiKey || apiKey === 'xai-your-api-key' || apiKey.trim() === '') {
    console.warn('Grok API Key missing. Returning original data with notification.');
    return {
      ...originalData,
      notification: "AI could not improve the text right now; your original content is preserved."
    };
  }

  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-beta',
        messages: [
          { role: 'system', content: PORTFOLIO_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Portfolio Data: ${JSON.stringify(originalData)}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout
      }
    );

    let content = response.data.choices[0].message.content.trim();
    
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (parseErr) {
      console.error('Failed to parse Grok Portfolio JSON response:', content);
      throw new Error('Grok response was not valid JSON');
    }

  } catch (error) {
    console.error('Grok Portfolio API error:', error.message);
    return {
      ...originalData,
      notification: "AI could not improve the text right now; your original content is preserved."
    };
  }
}

module.exports = { suggestImprovements, suggestPortfolioImprovements };
