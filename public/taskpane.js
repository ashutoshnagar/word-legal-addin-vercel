Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
        document.getElementById("analyzeBtn").onclick = analyzeDocument;
        console.log("Legal Review Add-in loaded successfully");
    }
});

async function analyzeDocument() {
    const analyzeBtn = document.getElementById("analyzeBtn");
    const statusDiv = document.getElementById("status");
    const loadingDiv = document.getElementById("loading");
    const resultsDiv = document.getElementById("results");
    
    // Reset UI
    statusDiv.style.display = "none";
    resultsDiv.innerHTML = "";
    loadingDiv.style.display = "block";
    analyzeBtn.disabled = true;
    
    try {
        // Get document text
        const documentText = await getDocumentText();
        
        if (!documentText || documentText.trim().length === 0) {
            showStatus("error", "Document appears to be empty. Please add some content and try again.");
            return;
        }
        
        // Call Vercel API
        const response = await fetch('/api/legal-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ documentText: documentText })
        });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const analysisResult = await response.json();
        
        // Display results and add comments
        await displayResults(analysisResult);
        
        if (analysisResult.issues && analysisResult.issues.length > 0) {
            await addCommentsToDocument(analysisResult.issues);
            showStatus("success", `Analysis complete! Found ${analysisResult.issues.length} legal issues. Comments have been added to your document.`);
        } else {
            showStatus("success", "Analysis complete! No legal issues found in your document.");
        }
        
    } catch (error) {
        console.error('Analysis error:', error);
        showStatus("error", `Analysis failed: ${error.message}. Please try again in a moment.`);
    } finally {
        loadingDiv.style.display = "none";
        analyzeBtn.disabled = false;
    }
}

async function getDocumentText() {
    return new Promise((resolve, reject) => {
        Word.run(async (context) => {
            try {
                const body = context.document.body;
                context.load(body, 'text');
                await context.sync();
                resolve(body.text);
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function addCommentsToDocument(issues) {
    return new Promise((resolve, reject) => {
        Word.run(async (context) => {
            try {
                const body = context.document.body;
                const paragraphs = body.paragraphs;
                context.load(paragraphs, 'items');
                await context.sync();
                
                for (const issue of issues) {
                    // Extract paragraph number from location (e.g., "paragraph 3" -> 3)
                    const paragraphMatch = issue.location.match(/paragraph\s+(\d+)/i);
                    if (paragraphMatch) {
                        const paragraphIndex = parseInt(paragraphMatch[1]) - 1; // Convert to 0-based index
                        
                        if (paragraphIndex >= 0 && paragraphIndex < paragraphs.items.length) {
                            const paragraph = paragraphs.items[paragraphIndex];
                            const range = paragraph.getRange();
                            
                            // Add comment to the paragraph
                            const comment = range.insertComment(`${issue.type}: ${issue.comment}`);
                            context.load(comment);
                        }
                    } else {
                        // If we can't parse the location, add comment to the first paragraph
                        if (paragraphs.items.length > 0) {
                            const firstParagraph = paragraphs.items[0];
                            const range = firstParagraph.getRange();
                            const comment = range.insertComment(`${issue.type}: ${issue.comment}`);
                            context.load(comment);
                        }
                    }
                }
                
                await context.sync();
                resolve();
            } catch (error) {
                console.error('Error adding comments:', error);
                reject(error);
            }
        });
    });
}

function displayResults(analysisResult) {
    const resultsDiv = document.getElementById("results");
    
    if (!analysisResult.issues || analysisResult.issues.length === 0) {
        resultsDiv.innerHTML = '<div class="issue-card low"><div class="issue-type">✅ No Issues Found</div><div class="issue-comment">Your document appears to be compliant with the basic legal requirements we checked.</div></div>';
        return;
    }
    
    let resultsHTML = '<h3>Legal Issues Found:</h3>';
    
    analysisResult.issues.forEach((issue, index) => {
        const severityClass = issue.severity || 'medium';
        resultsHTML += `
            <div class="issue-card ${severityClass}">
                <div class="issue-type">${issue.type}</div>
                <div class="issue-location">📍 ${issue.location}</div>
                <div class="issue-comment">${issue.comment}</div>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = resultsHTML;
}

function showStatus(type, message) {
    const statusDiv = document.getElementById("status");
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = "block";
}
