# Deploying on Wasmer Edge

This Vite site builds to `dist`, and Wasmer's static web server serves that directory.

## Deploy from this checkout

1. Install the Wasmer CLI and sign in with `wasmer login`.
2. Build the site with `npm ci && npm run build`.
3. Run `wasmer deploy` from the project root. On the first deploy, Wasmer will ask for the account or namespace and app name.

The `Staticfile`, `wasmer.toml`, and `settings/config.toml` files point Wasmer at the built output. Rebuild before each deploy.

## Deploy from GitHub

Connect this repository and the production branch to a Wasmer Edge app. Configure the build as `npm ci && npm run build` with `dist` as the static output directory. The Vite base path is `/` on Wasmer and local hosting; GitHub Pages retains its repository subpath.
