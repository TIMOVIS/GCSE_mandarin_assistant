<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Mandarin Master Plan - IGCSE Preparation Platform

A comprehensive Mandarin learning platform for IGCSE students with AI-powered lesson generation, vocabulary practice, and progress tracking.

## Setup

### Environment Variables

The app uses **server-side Netlify functions** to handle all AI API calls. API keys are stored securely on the server and never exposed to the client.

**Required Environment Variables (Netlify):**
- `GEMINI_API_KEY` - Google Gemini API key (required for AI features)
  - **Note:** Do NOT use `VITE_` prefix - this is server-side only

**Optional Environment Variables (Netlify):**
- `OPENAI_API_KEY` - OpenAI API key (optional, used as fallback for single character pronunciation)
  - **Note:** Do NOT use `VITE_` prefix - this is server-side only

### Netlify Configuration

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add the following variables:
   - `GEMINI_API_KEY` = your Gemini API key
   - `OPENAI_API_KEY` = your OpenAI API key (optional)

**Important:** 
- Do NOT use `VITE_` prefix - these are server-side variables
- After adding environment variables, trigger a new deployment
- All AI calls go through `/.netlify/functions/generate` (server-side)

### Local Development

For local development, use Netlify CLI to run the functions locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Netlify CLI (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Run with Netlify CLI (runs both frontend and functions):
   ```bash
   netlify dev
   ```

   Or run frontend only (functions won't work):
   ```bash
   npm run dev
   ```

## Features

- **Tutor Dashboard**: Create lessons, upload vocabulary lists, track student progress
- **Student Dashboard**: Practice vocabulary, complete exercises, view progress
- **AI-Powered**: Automatic lesson generation and vocabulary practice
- **Custom Categories**: Tutors can create custom vocabulary categories
- **Writing Practice**: Interactive stroke order practice with example animations
- **Pronunciation Practice**: Audio playback and recording for pronunciation practice
