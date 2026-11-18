import { defineConfig } from 'vite';

// GitHub Pages needs a repository subpath; Wasmer and local hosting use `/`.
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repository ? `/${repository}/` : '/';

export default defineConfig({ base });
