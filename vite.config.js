import { defineConfig } from 'vite';

// GitHub Actions provides the repository name for GitHub Pages project sites.
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repository ? `/${repository}/` : '/portfolio/';

export default defineConfig({ base });
