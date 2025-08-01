# Legal Review Add-in - Vercel Deployment

A complete Word add-in and web application for AI-powered legal document analysis using Anthropic Claude, deployed on Vercel.

## 🚀 Features

- **Web Application**: Standalone legal document analysis tool
- **Word Add-in**: Integrated Office 365 add-in with automatic comment insertion
- **AI-Powered**: Uses Anthropic Claude for intelligent legal compliance checking
- **Serverless**: Fully serverless architecture on Vercel
- **HTTPS Ready**: Production URLs that work with Office 365

## 📁 Project Structure

```
word-legal-addin-vercel/
├── api/
│   └── legal-analysis.js      # Vercel serverless function
├── public/
│   ├── index.html             # Main web application
│   ├── taskpane.html          # Word add-in UI
│   ├── taskpane.js            # Office.js logic
│   ├── commands.html          # Required for add-in
│   └── manifest.xml           # Word add-in manifest
├── package.json               # Dependencies
├── vercel.json               # Vercel configuration
└── README.md                 # This file
```

## 🛠️ Deployment Steps

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Install Dependencies

```bash
cd word-legal-addin-vercel
npm install
```

### Step 3: Login to Vercel

```bash
vercel login
```

### Step 4: Deploy to Vercel

```bash
vercel --prod
```

This will:
- Deploy your application
- Generate a production URL (e.g., `https://your-app-name.vercel.app`)
- Set up automatic deployments from Git

### Step 5: Set Environment Variables

After deployment, set your Anthropic API key:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add: `ANTHROPIC_API_KEY` = `your_anthropic_api_key_here`
5. Redeploy: `vercel --prod`

### Step 6: Update Manifest URLs

After getting your Vercel URL, update `public/manifest.xml`:

Replace all instances of `YOUR-VERCEL-URL` with your actual Vercel URL:

```xml
<!-- Before -->
<SourceLocation DefaultValue="https://YOUR-VERCEL-URL.vercel.app/taskpane.html"/>

<!-- After -->
<SourceLocation DefaultValue="https://your-actual-app.vercel.app/taskpane.html"/>
```

### Step 7: Redeploy with Updated Manifest

```bash
vercel --prod
```

## 🌐 Testing the Web Application

1. Visit your Vercel URL: `https://your-app-name.vercel.app`
2. Paste a legal document in the text area
3. Click "Analyze Document with Legal AI"
4. Review the AI-generated legal compliance issues

## 📝 Testing the Word Add-in

### Method 1: Direct Sideloading

1. Open Microsoft Word
2. Go to **Insert** → **Add-ins** → **My Add-ins**
3. Click **Upload My Add-in**
4. Select the updated `manifest.xml` file from your deployed app
5. The "Legal Review" button should appear in the Home ribbon

### Method 2: Download from Deployed App

1. Visit your web app URL
2. Click "Download manifest.xml" in the Word Add-in info box
3. Sideload the downloaded manifest in Word

### Testing the Add-in Functionality:

1. Create a test document with legal content
2. Click the "Legal Review" button in Word's Home ribbon
3. Click "Analyze Document for Legal Issues"
4. Watch as AI analyzes the document and adds comments automatically

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes |

### Legal Analysis Checklist

The AI currently checks for:
- Missing liability clauses
- Unclear termination conditions  
- Missing governing law
- Ambiguous payment terms
- Missing dispute resolution clauses
- Incomplete confidentiality clauses

## 🎯 API Endpoints

- `GET /` - Main web application
- `POST /api/legal-analysis` - Legal document analysis API
- `GET /taskpane.html` - Word add-in task pane
- `GET /manifest.xml` - Word add-in manifest

## 🔄 Development Workflow

### Local Development

```bash
# Install Vercel CLI
npm install -g vercel

# Run locally
vercel dev
```

### Making Changes

1. Update your code
2. Test locally with `vercel dev`
3. Deploy with `vercel --prod`
4. Environment variables persist automatically

### Git Integration

Link your project to GitHub for automatic deployments:

```bash
vercel --prod
# Follow prompts to link to Git repository
```

## 🚨 Troubleshooting

### Common Issues:

**1. "Manifest is not valid" in Word**
- Ensure all URLs in manifest.xml point to your actual Vercel domain
- Check that HTTPS is working on all endpoints
- Verify the manifest.xml is accessible at your-domain/manifest.xml

**2. "Analysis failed" errors**
- Check that ANTHROPIC_API_KEY is set in Vercel environment variables
- Verify API key is valid and has sufficient credits
- Check Vercel function logs for detailed error messages

**3. CORS errors in web app**
- The serverless function includes CORS headers
- If issues persist, check browser developer console

### Vercel Function Logs

To debug API issues:
1. Go to Vercel Dashboard
2. Select your project
3. Go to Functions tab
4. Click on `/api/legal-analysis` to view logs

## 🔐 Security Notes

- API key is stored securely in Vercel environment variables
- All communication uses HTTPS
- No document content is permanently stored
- Office.js ensures secure communication with Word

## 🚀 Next Steps

### Potential Enhancements:

1. **Multiple Personas**: Add financial, risk assessment, compliance personas
2. **Custom Checklists**: Allow users to configure their own legal requirements
3. **Document Templates**: Pre-built templates for different document types
4. **Batch Processing**: Analyze multiple documents at once
5. **Export Reports**: Generate PDF summaries of findings
6. **Formatting Analysis**: Check font sizes, margins, spacing standards

### Advanced Features:

1. **Real-time Collaboration**: Multiple users reviewing same document
2. **Integration with Legal Databases**: Cross-reference against legal precedents
3. **Workflow Management**: Route documents through approval processes
4. **Version Control**: Track changes and review history

## 📞 Support

For deployment issues:
- Check Vercel deployment logs
- Verify environment variables are set
- Test API endpoints directly

For Word add-in issues:
- Ensure manifest URLs are correct
- Check Office.js console for errors
- Verify Word version compatibility

---

**🎉 Congratulations!** Your Legal Review Add-in is now deployed on Vercel with full HTTPS support, ready for Office 365 integration!
