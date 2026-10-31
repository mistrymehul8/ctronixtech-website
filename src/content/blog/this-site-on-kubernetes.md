---
title: "How this site runs on a home Kubernetes cluster, safely"
summary: "A static site, a signed image, GitOps promotion and an outbound-only tunnel: no open ports, no home IP, nothing to log in to."
date: 2026-10-31
tags: [Kubernetes, Security, GitOps, Cloudflare]
---

This website is served from the same Kubernetes platform described in the
[Platform Lab case study](/projects/platform-lab/). Hosting a public site at
home usually means opening ports and publishing your home IP. This one does
neither.

## The pipeline

1. **Content is Markdown in a public Git repository.** Astro turns it into plain HTML and CSS, with no JavaScript, no database and no admin login.
2. **CI builds and checks every change:**
   - a type check, a production build and a link check;
   - a *leak gate* that fails the build if internal details (addresses, account names) ever appear on a page.
3. **The image is built once** into a small, unprivileged nginx container:
   - scanned for vulnerabilities;
   - given a bill of materials;
   - **signed** with a short-lived identity from the CI system, so no signing key exists to steal.
4. **Staging updates itself.** The platform's Git repository picks up the new image digest, and Argo CD deploys it to a private staging copy behind single sign-on.
5. **Production is one pull request** that promotes the *same* digest. The cluster refuses to run a website image that wasn't signed by this repository's pipeline.

## The exposure

- **No incoming connection.** The site isn't reachable from the internet by connecting to the house. A small connector inside the cluster opens an *outbound* tunnel to the CDN, and visitors only ever talk to the CDN.
- **No open port, no home IP:** no port is opened on the router, and the home IP isn't in DNS.
- **The CDN caches the pages,** so a power cut or a cluster upgrade at home doesn't take the site down.

## The pod

- **Hardened container:** it runs as a non-root user, with a read-only filesystem and no Linux capabilities.
- **Tight network policy:** it may receive traffic only from the tunnel connector, and it may not open any connection itself.
- **Strict response headers:** a strict Content-Security-Policy and the usual security headers on every response.

It's a lot of care for a brochure site. That's the point: the same pattern
works for anything you'd rather not expose.
