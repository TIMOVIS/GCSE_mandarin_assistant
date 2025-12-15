# Netlify Deployment Guide

## Quick Deploy Steps

### Option 1: Deploy via Netlify UI (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com) and sign up/login
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Netlify will auto-detect these settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`

3. **Deploy**
   - Click "Deploy site"
   - Your app will be live in a few minutes!

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

## Configuration Files

- **`netlify.toml`**: Contains build settings and redirects
- **`public/_redirects`**: Ensures SPA routing works (all routes → index.html)

## Environment Variables (Optional)

If you want to set a default API key:
- Go to Netlify Dashboard → Site settings → Environment variables
- Add: `API_KEY` = your Google Gemini API key

**Note**: Users can also enter their API key directly in the app interface, so this is optional.

## Build Verification

Test the build locally before deploying:
```bash
npm run build
npm run preview
```

## Important Notes

1. **Tailwind CSS**: Currently using CDN. For better performance, consider installing Tailwind CSS:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **API Keys**: The app stores API keys in localStorage, so users can enter them directly in the app.

3. **SPA Routing**: The `_redirects` file ensures all routes redirect to `index.html` for client-side routing.

## Troubleshooting

- **Build fails**: Check build logs in Netlify dashboard
- **404 errors on routes**: Ensure `_redirects` file is in `public/` directory
- **Node version**: Netlify uses Node 18 (configured in netlify.toml)

## Your App is Ready!

After deployment, you'll get a URL like: `https://your-app-name.netlify.app`
