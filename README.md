# ctronixtech.com

Source of [ctronixtech.com](https://ctronixtech.com), the Ctronix Tech website.

It's a static site built with [Astro](https://astro.build): Markdown content,
no client-side JavaScript, no database and no login. It's served by an
unprivileged nginx container on a Kubernetes cluster, behind a Cloudflare
Tunnel.

| What | Where |
|---|---|
| Pages | `src/pages/` |
| Case studies | `src/content/projects/*.md` |
| Blog posts | `src/content/blog/*.md` |
| Brand (colours, type) | `src/styles/global.css`, `src/components/Logo.astro`, `public/favicon.svg` |
| Site facts (contact address, tagline) | `src/site.ts` |
| Container | `Dockerfile`, `deploy/nginx/` (security headers in `security-headers.conf`) |
| CI | `.github/workflows/ci.yml` |

## Work on it

```bash
nvm use            # Node from .nvmrc
npm ci
npm run dev        # http://localhost:4321
npm test           # type check + build + leak gate
```

**Add a blog post:** create `src/content/blog/<slug>.md` with `title`,
`summary`, `date` and `tags` front matter. Set `draft: true` to keep it out of the build.

## Pipeline

| Event | What runs |
|---|---|
| Pull request | `astro check`, build, **leak gate**, internal link check, Lighthouse (≥ 0.95 in every category), `npm audit`, gitleaks |
| Merge to `main` | All of the above, then:<br>- the image is built once and smoke-tested (health, security headers, 404, non-root)<br>- Trivy scan (fails on fixable HIGH/CRITICAL)<br>- pushed to `ghcr.io/mistrymehul8/ctronixtech-website:1.0.<run>`<br>- **signed with cosign** (keyless, bound to this workflow), with an SPDX SBOM attested |
| Deploy | The platform repository's Renovate updates the **staging** digest, and Argo CD deploys it. **Production** is a pull request that promotes the same digest. The cluster only runs images signed by this repository's `main` workflow |

### Leak gate

`scripts/leak-gate.mjs` fails the build if a page or source file contains
internal details: IP addresses, sub-domains other than `www`, outside e-mail
addresses, GUIDs, key-like strings, Azure host names.

Because this repository is public, specific values (names, addresses) are
**not** listed here. They come from the `LEAK_DENYLIST` repository secret, one
regular expression per line.

## Brand

| Token | Value | Use |
|---|---|---|
| Ink | `#0B1B33` | Logo tile, headings, code blocks |
| Teal (deep) | `#0F766E` | Links and buttons on light backgrounds (5.5:1 contrast) |
| Teal (bright) | `#2DD4BF` | Accents on dark backgrounds and in dark mode |
| Muted text | `#475569` | Secondary text (7.5:1) |
| Background | `#F8FAFC` / dark `#0B1220` | Page |
| Type | Inter (variable), JetBrains Mono | Self-hosted (OFL), no font CDN |

The mark is an open "C" drawn as a circuit trace: two terminals and a core
node on an ink tile. Dark mode follows the visitor's system setting, with no
toggle, so no JavaScript is needed.

## License

The code is [MIT](LICENSE). The written content and the Ctronix Tech name and
logo © Ctronix Tech, all rights reserved.
