import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Persona prompts
const LEGAL_PERSONA_PROMPT = `You are a legal compliance expert reviewing a document. Analyze the document for the following legal issues:

1. Missing liability clauses
2. Unclear termination conditions  
3. Missing governing law
4. Ambiguous payment terms
5. Missing dispute resolution clauses
6. Incomplete confidentiality clauses

For each issue found, respond in this EXACT JSON format:
{
  "issues": [
    {
      "type": "Missing liability clauses",
      "location": "paragraph 3",
      "comment": "This section lacks proper liability limitation clauses that protect both parties.",
      "severity": "high"
    }
  ]
}

Be specific about paragraph numbers where issues are found. If no issues are found, return {"issues": []}.`;

const AUDIT_PERSONA_PROMPT = `You are an audit expert reviewing a document against L1 Review Checklist standards. Check the document for these 5 key formatting and content issues:

1. FONT CHECK: All text should use Calibri font (identify if other fonts like Arial, Times New Roman, Aptos are used)
2. FONT SIZE CHECK: 
   - Report titles should be 20pt
   - Headings should be 16pt  
   - Sub-headings should be 13pt
   - Regular content should be 11pt
3. NAME PREFIXES: No prefixes like "Mr.", "Ms.", "Miss", "Mrs." should be used before names
4. DATE FORMAT: Dates should be in "MMM DD, YYYY" format (e.g., "Jan 15, 2025" not "15/01/2025" or "January 15th, 2025")
5. CAPITALIZATION: Team/policy names should be "Regional Sales team" not "Regional Sales Team" (first word capitalized, second word lowercase)

CRITICAL REQUIREMENTS FOR PRECISE COMMENT PLACEMENT:

1. EXACT TEXT: Provide the EXACT 5-15 word phrase from the document that has the issue
2. UNIQUE TEXT: Ensure the exact_text is unique and appears only once in the document
3. SPECIFIC TARGETING: Different issues must have different exact_text (don't use title for subheading issues)
4. CONTEXT DISTINCTION: Clearly distinguish between:
   - Document title (first/main heading)
   - Section headings (major sections) 
   - Sub-headings (subsections)
   - Regular paragraph text
   - Table content
   - Names with prefixes
   - Dates

For each violation found, respond in this EXACT JSON format:
{
  "issues": [
    {
      "type": "Font Size Issue - Title",
      "location": "Document title (first heading)",
      "exact_text": "Annual Compliance Audit Report 2025",
      "comment": "The document title 'Annual Compliance Audit Report 2025' is using 24pt font size. As per L1 standards, it should be 20pt.",
      "severity": "medium"
    },
    {
      "type": "Font Size Issue - Subheading", 
      "location": "Page 3, section 2.1",
      "exact_text": "Risk Assessment Methodology",
      "comment": "The subheading 'Risk Assessment Methodology' is using 12pt font size. As per L1 standards, it should be 13pt.",
      "severity": "medium"
    },
    {
      "type": "Name Prefix Issue",
      "location": "Page 5, authors section", 
      "exact_text": "Mr. John Smith, Senior Auditor",
      "comment": "Remove the prefix 'Mr.' from 'Mr. John Smith, Senior Auditor' as per L1 standards.",
      "severity": "low"
    }
  ]
}

MANDATORY RULES:
- Each exact_text must be a unique, searchable phrase that appears only once
- Use different exact_text for title, headings, subheadings (never the same text)
- Include enough context words to make each exact_text unique
- For names: include full context like "Mr. John Smith, Senior Auditor" not just "Mr. John Smith"
- For dates: include surrounding text like "Report Date: May 20, 2025" not just "May 20, 2025"
- For capitalization: use the complete phrase like "Regional Sales Team Department" 

Be ultra-specific with exact_text to ensure precise comment placement. If no issues are found, return {"issues": []}.`;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentText, persona = 'legal' } = req.body;
    
    if (!documentText) {
      return res.status(400).json({ error: 'Document text is required' });
    }

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'Configuration error', 
        details: 'API key not configured. Please set ANTHROPIC_API_KEY environment variable in Vercel dashboard.' 
      });
    }

    // Select the appropriate prompt based on persona
    const selectedPrompt = persona === 'audit' ? AUDIT_PERSONA_PROMPT : LEGAL_PERSONA_PROMPT;
    const personaName = persona === 'audit' ? 'Audit' : 'Legal';

    console.log(`Analyzing document with ${personaName} persona using Anthropic...`);
    console.log('API Key available:', !!process.env.ANTHROPIC_API_KEY);
    
    // Create Anthropic client with explicit API key
    const anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    const message = await anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${selectedPrompt}\n\nDocument to analyze:\n${documentText}`
        }
      ]
    });

    const responseText = message.content[0].text;
    console.log('Anthropic response:', responseText);
    
    // Extract JSON from response (handle cases where Claude adds explanatory text)
    let analysisResult;
    try {
      // Find the start of JSON (first '{') and extract from there
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonString = responseText.substring(jsonStart, jsonEnd + 1);
        
        // Clean smart quotes and other problematic characters
        jsonString = jsonString
          .replace(/[\u201C\u201D]/g, '"')  // Replace " and " with "
          .replace(/[\u2018\u2019]/g, "'")  // Replace ' and ' with '
          .replace(/"/g, '"')              // Replace any remaining " with "
          .replace(/"/g, '"')              // Replace any remaining " with "
          .replace(/'/g, "'")              // Replace any remaining ' with '
          .replace(/'/g, "'")              // Replace any remaining ' with '
          .replace(/[^\x00-\x7F]/g, "");   // Remove any non-ASCII characters that might cause issues
        
        console.log('Extracted JSON:', jsonString);
        analysisResult = JSON.parse(jsonString);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw response:', responseText);
      
      // Fallback response if JSON parsing fails
      analysisResult = {
        issues: [{
          type: "Analysis Processing Issue",
          location: "document",
          comment: "AI analysis completed but results formatting needs adjustment. Please try again.",
          severity: "low"
        }]
      };
    }

    return res.status(200).json(analysisResult);
    
  } catch (error) {
    console.error('Error during analysis:', error);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
}
