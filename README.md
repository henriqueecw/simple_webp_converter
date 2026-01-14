# WebP Converter

A fast, client-side image converter that transforms your images to WebP format with optimal compression.

## Features

- **100% Client-Side**: All processing happens in your browser. Your images are never uploaded.
- **Sequence Detection**: Automatically detects image sequences (e.g., `frame_001.png`, `frame_002.png`) and groups them.
- **Gap Detection**: Identifies missing frames in sequences.
- **Batch Processing**: Convert multiple images at once.
- **ZIP Downloads**: Download sequences as ZIP files.
- **Customizable Settings**:
  - Quality (10-100%)
  - Resize (10-100%)
  - Lossless mode

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- JSZip for batch downloads

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GitHub Pages

1. Update `vite.config.ts` with your repository name:
   ```ts
   base: '/your-repo-name/',
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy the `dist` folder to GitHub Pages.

### Using GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

## Internationalization

All UI strings are in `src/i18n/en.json`. To add a new language:

1. Copy `en.json` to `pt-BR.json` (or your language)
2. Translate all strings
3. Import and use in components

## License

MIT
