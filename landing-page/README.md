# TaskSnap Landing Page

This is the landing page for TaskSnap - AI-powered email to Trello integration.

## Structure

```
landing-page/
├── index.html          # Main landing page
├── styles.css          # Styles
├── script.js           # Main JavaScript
├── demo-script.js      # Demo functionality
├── test-api.html       # API testing page
├── assets/             # Images, icons, etc.
├── docs/               # Documentation
├── src/                # Source files
├── node_modules/       # Dependencies
├── package.json        # NPM configuration
├── wrangler.toml       # Cloudflare Workers config
└── .wrangler/          # Wrangler cache
```

## Development

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start local server:
```bash
# Using Python
python -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000
```

3. Open browser:
```
http://localhost:8000
```

### Cloudflare Pages Deployment

This landing page is configured for Cloudflare Pages deployment using Wrangler.

```bash
# Deploy to Cloudflare
npx wrangler pages deploy
```

## Features

- Modern, responsive design
- GSAP animations
- Demo functionality
- API testing interface

## Customization

You can customize the landing page by:
1. Editing `index.html` for content
2. Modifying `styles.css` for styling
3. Updating `script.js` for functionality

## API Integration

The landing page can integrate with the TaskSnap backend API (see `/backend` folder).

Update the API endpoint in your scripts to point to:
- Local: `http://localhost:3000/api/v1`
- Production: Your deployed backend URL

## Notes

This is a standalone frontend that will connect to the TaskSnap backend API. You can replace this entirely with any frontend framework (React, Vue, Next.js, etc.) since the backend is completely independent.
