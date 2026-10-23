# personal

Source for my personal site. Plain HTML/CSS/JS, no build step. `field.js` draws the animated ASCII background; `main.js` adds the ⌘K menu and theme toggle. The page is complete without JS.

- Live: https://nikashchhadia.com
- Local: `python3 -m http.server` and open http://localhost:8000
- Edit content in `index.html`; logo marks live in `assets/marks/`.

## Custom domain
Served at nikashchhadia.com via the `CNAME` file. DNS is on Cloudflare (DNS only, not proxied): four `A` and four `AAAA` records for GitHub Pages on the apex, and `www` as a `CNAME` to `nikashchhadia.github.io`.
