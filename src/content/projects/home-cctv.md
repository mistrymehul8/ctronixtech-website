---
title: "Home cameras without the cloud"
summary: "Security cameras recorded at home with local person and car detection, phone alerts with a snapshot, and cameras that can't reach the internet at all."
order: 3
tags: [Home security, Frigate, Home Assistant, Self-hosting, Networking, Monitoring]
stats:
  - { value: "0", label: "cameras with internet access" }
  - { value: "0", label: "vendor cloud accounts or subscriptions" }
  - { value: "2 VMs", label: "outside Kubernetes, so recording survives cluster work" }
  - { value: "6", label: "alerts, each with a written runbook" }
---

## The problem

Most home cameras send their video to the manufacturer's cloud. That means a
monthly subscription, footage of your home on someone else's servers, and a
device on your network that talks to the internet on its own. Cheap cameras
are also among the least maintained devices anyone owns.

The goal: the convenience of a commercial system (recording, smart alerts, a
phone app that works from anywhere) with the footage staying at home and the
cameras locked in.

## The design

**Two small virtual machines, next to the cluster rather than in it.**

| Part | Job |
|---|---|
| **Frigate** | The recorder (NVR): records every camera, and detects people, cars and pets on each camera's low-resolution stream, locally |
| **Home Assistant** | The app: dashboards, automations, and a phone notification with a snapshot when someone is at the door |
| **MQTT** | A small message broker: Frigate posts "person at the front door", Home Assistant acts on it |

They run as their own VMs on the same server as the
[Platform Lab](/projects/platform-lab/), but **not in Kubernetes**. A cluster
upgrade, a node drain or a full cluster outage doesn't stop recording. The
cluster only *watches* them: metrics, synthetic checks of both web pages and
their certificates, and alerts by e-mail.

**Three walls around the cameras:**
1. **The router.** Cameras get fixed addresses in their own range, and the router drops everything they send beyond the local network: no internet, no VPN, not even its DNS. They can't phone home, update themselves or be reached from outside.
2. **The recorder's own firewall.** Default deny in *and* out: only named devices on named ports. The recorder's API, which has no login, is open to Home Assistant and monitoring only. The container uses host networking on purpose, because ports published by Docker would bypass the host firewall.
3. **Logins.** Both web pages need an account, over HTTPS with real certificates, renewed automatically through a DNS challenge, so no port is opened for them.

**Remote access the same way as everything else:** phones reach the app over
the family WireGuard VPN, which only allows these two pages, not the cameras.

**Recordings can't fill the wrong disk.** Video goes to its own large disk.
The container engine is configured to *refuse to start* if that disk isn't
mounted, so a missing disk means an alert, never a full system disk.

**Built as code.** The recorder VM, its disks and its firewall come from
Terraform and an Ansible role; camera list, retention and detection settings
are a few lines of configuration in Git, and secrets live in an encrypted
vault. Home Assistant is an appliance, so its setup is a written checklist,
and it backs itself up daily, encrypted.

## What keeps working when something breaks

| If this is down | Recording | Live view | Phone alerts |
|---|---|---|---|
| The Kubernetes cluster | Yes | Yes | Yes |
| Home Assistant | Yes | Yes, in the recorder's own page | No |
| The internet | Yes | At home | No |
| The recorder | No, and an alert fires | No | No |

## Decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| Local detection instead of a cloud service | Footage never leaves home; no subscription | Detection uses the server's CPU (a GPU can be added later) |
| VMs next to Kubernetes, not in it | Recording must outlive cluster maintenance | Two more machines to patch (automatic security updates) |
| Router isolation instead of a camera VLAN | The PoE switch is unmanaged | Cameras can still see other local devices; a managed switch is the follow-up |
| Recordings not backed up | Terabytes of mostly empty footage, deleted after days anyway | A lost disk loses recent footage; settings rebuild from Git |

## Lessons worth sharing

- **A default-deny firewall can cut the session that loads it.** The SSH session running the automation existed before connection tracking started, so its replies looked "new" and were dropped. An explicit rule for SSH replies fixed it for every future host.
- **Monitoring can be wrong in a convincing way.** A directory permission one level too strict stopped the metrics agent from measuring the recordings disk, and the "disk not mounted" alert fired while the disk was fine. Check an alert against reality before trusting it.
- **Appliance defaults change between releases.** A fresh Home Assistant came up on a different port than every guide says. Check what was installed, not what the docs expect.
- **Renewal timing matters.** A monthly renewal job would renew a certificate only a week before expiry, inside the 14-day warning window. Running it twice a month renews it well before any alert.

## Results

- A recording and notification stack that is live, monitored and documented,
  ready for cameras to be added one at a time.
- No camera can reach the internet, and no footage leaves the house.
- A runbook for every task: adding a camera, retention, passwords, upgrades,
  restore, and what to do when each alert fires.
