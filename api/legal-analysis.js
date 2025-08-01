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

For each violation found, respond in this EXACT JSON format:
{
  "issues": [
    {
      "type": "Font Size Issue",
      "location": "Page 1, report title",
      "comment": "Report title is using 24pt font size. As per L1 standards, it should be 20pt.",
      "severity": "medium"
    }
  ]
}

Be specific about locations where issues are found. If no issues are found, return {"issues": []}.`;

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
      // Look for JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
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
