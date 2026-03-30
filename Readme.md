# Haven Space

A web application that connects boarders with verified boarding houses near their location.

## CI/CD

This project uses GitHub Actions for automated deployments:

- **Pull Requests**: Verifies build succeeds
- **Main Branch**: Auto-deploys to GitHub Pages

## 🌐 Production URLs

After deployment, public pages will be accessible at clean URLs:

- **Homepage**: `https://havenspace.com/` (or `https://<username>.github.io/haven-space/`)
- **Map View**: `https://havenspace.com/maps.html`
- **Login**: `https://havenspace.com/auth/login.html`
- **Signup**: `https://havenspace.com/auth/signup.html`

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Serve locally for testing (auto-opens browser)
npm start

# Or just serve without opening browser
npm run serve
```

## 📁 Project Structure

```
Final/
├── dist/                    # Production build output (auto-generated)
│   ├── index.html           # → havenspace.com/
│   ├── maps.html            # → havenspace.com/maps.html
│   ├── auth/
│   │   ├── login.html       # → havenspace.com/auth/login.html
│   │   └── signup.html      # → havenspace.com/auth/signup.html
│   ├── css/
│   ├── js/
│   └── assets/
├── frontend/                # Source files
│   ├── views/public/        # Public-facing pages
│   ├── css/
│   ├── js/
│   └── assets/
├── backend/                 # API backend
├── scripts/
│   └── build.js             # Production build script
└── .github/workflows/
    └── github-pages.yml     # Auto-deploy on push
```

## 🛠️ Development

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Build production files
npm run build
```

## 📦 Deployment

The application deploys automatically to **GitHub Pages** when you push to the `main` branch:

1. Code is pushed to `main`
2. GitHub Actions runs `npm run build`
3. The `dist/` folder is deployed to GitHub Pages
4. Clean URLs are available immediately

### Manual Deployment

```bash
# Build locally
npm run build

# Preview
npx http-server dist -p 3000

# Deploy (if using GitHub Pages CLI)
# Or simply push to main branch
git push origin main
```

## 🎨 Technology Stack

| Category       | Technology                             |
| -------------- | -------------------------------------- |
| **Frontend**   | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Fonts**      | Plus Jakarta Sans (Google Fonts)       |
| **Styling**    | Custom CSS with CSS custom properties  |
| **Build**      | Custom Node.js build script            |
| **Deployment** | GitHub Pages with GitHub Actions       |

## 📝 Key Features

- **Clean URLs**: Production build flattens folder structure for simple URLs
- **Responsive Design**: Mobile-first approach
- **Authentication**: Login, signup, and password recovery
- **Dual Roles**: Support for both landlords and boarders
- **Dashboard Views**: Separate dashboards for each user type

## 🔗 Links

- [Contributing Guidelines](.github/CONTRIBUTING.md)
- [Pull Request Template](.github/pull_request_template.md)

## 📄 License

MIT
