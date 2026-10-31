---
title: "CtronixCloud: a private cloud for a family"
summary: "Photos, files, office documents, passwords, paperwork and budgeting, self-hosted on Kubernetes with SSO, VPN-only access and restore-tested backups."
order: 2
tags: [Self-hosting, Privacy, Immich, Nextcloud, Vaultwarden, Backups]
stats:
  - { value: "6 apps", label: "photos, files, office, passwords, documents, budget" }
  - { value: "VPN-only", label: "no app is on the public internet" }
  - { value: "7 / 5 / 6", label: "daily / weekly / monthly backups" }
  - { value: "Tested", label: "restore of every app before real data" }
---

## The problem

A family's most important data (photos, documents, passwords) usually lives
with several providers, each with its own subscription, terms and privacy
policy. The goal: bring it home without becoming the family's single point of
failure, and without lowering security below what the big providers offer.

## The design

CtronixCloud runs on the same Kubernetes platform as the
[Platform Lab](/projects/platform-lab/), and inherits its GitOps, policies, monitoring and backups.

| Need | App |
|---|---|
| Photos and videos, with face and smart search | Immich |
| Files, calendar, contacts | Nextcloud |
| Office documents in the browser | Collabora Online |
| Passwords | Vaultwarden (Bitwarden-compatible) |
| Paperwork, with OCR and full-text search | Paperless-ngx |
| Household budget | Actual Budget |

**Access:**
- **Family devices only:** the apps are reachable through a WireGuard VPN that only allows the app gateway, with DNS split so the same names work at home and away.
- **Not on the public internet:** no app is exposed. The one public piece is a share-only proxy for photo albums, rate-limited and limited to share links.
- **One identity:** single sign-on through Authentik, including in the mobile apps where supported.

**Every app runs locked down:**
- as a non-root user, with a read-only root filesystem;
- with explicit resource limits;
- behind a default-deny network policy that lists exactly what it may talk to (its database, its storage, named outside services).

**Data:**
- **Databases:** PostgreSQL clusters with continuous archiving (point in time), plus weekly logical dumps.
- **Files:** backed up encrypted and deduplicated off-site, as 7 daily, 5 weekly and 6 monthly copies.
- **Restore tests:** each app was restored into a scratch namespace and compared file-by-file and table-by-table **before** real data went in.

## Decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| VPN instead of public exposure | Removes the largest attack surface | Family devices need the VPN app (one-time setup, QR code) |
| Restore tests before real data | A backup is only real once it has been restored | Takes time before go-live |
| Cold storage tier for photo and file backups | About 4x cheaper for data that rarely changes | Full restores pay a retrieval fee |
| One platform for everything | Shared policies, monitoring and backups | Shared fate: platform maintenance affects all apps |

## Results

- One place for the family's data, with the privacy and the bill under the family's control.
- Security controls at least as strict as a commercial service: SSO with MFA, VPN-only access, network isolation per app, encrypted off-site backups.
- A written runbook per app: what is backed up, how to restore it, and when it was last tested.
