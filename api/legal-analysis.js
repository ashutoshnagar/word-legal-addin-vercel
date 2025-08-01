import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Legal persona prompt
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
    const { documentText } = req.body;
    
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

    console.log('Analyzing document with Anthropic...');
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
          content: `${LEGAL_PERSONA_PROMPT}\n\nDocument to analyze:\n${documentText}`
        }
      ]
    });

    const responseText = message.content[0].text;
    console.log('Anthropic response:', responseText);
    
    // Parse JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Fallback response if JSON parsing fails
      analysisResult = {
        issues: [{
          type: "Analysis Error",
          location: "document",
          comment: "Unable to parse analysis results. Please try again.",
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
