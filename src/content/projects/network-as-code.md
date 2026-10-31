---
title: "Network as code: a router you can rebuild in minutes"
summary: "The whole router configuration in Git, applied over the API with drift detection, encrypted backups and a travel VPN that makes anywhere feel like home."
order: 3
tags: [Networking, MikroTik, WireGuard, Ansible, Infrastructure as code]
stats:
  - { value: "37", label: "configuration sections in Git" }
  - { value: "0", label: "differences between Git and the router" }
  - { value: "~20 min", label: "documented rebuild, same VPN keys" }
---

## The problem

The router is the one device everything depends on, and it's usually
configured by hand in a GUI, with no history and no backup anyone has tested.
If it dies, so does every remote connection.

## The design

**The configuration lives in Git.**
- An Ansible role applies every section of the router's configuration over its encrypted API: interfaces, DHCP, DNS, firewall and NAT rules (in order), VPNs, services.
- A capture playbook turns changes made by hand into a reviewable diff.
- A dry run shows exactly what would change, so drift is visible.

**Least privilege for automation:**
- The API is reachable only from the management host, over TLS checked against the router's own certificate authority.
- The automation account can't log in interactively.
- Backups use a separate account with SSH key login only.

**Backups that rebuild, not just exist.** A weekly encrypted export is kept
locally and off-site. The secrets a rebuild needs (VPN server keys, the ISP
login) live in an encrypted vault, so a replacement router comes back with the
same VPN identity, and no client needs a new configuration.

**A travel VPN.** A WireGuard full-tunnel exit node: abroad, a travel router
sends all traffic through the home connection.
- **Same as home:** the same IP address and DNS as at home.
- **Fallback port:** a second port for networks that block unusual UDP ports.
- **No IPv6 leaks:** IPv6 is blocked inside the tunnel.

## Lessons worth sharing

- **Treat peer tables as secrets.** Some routers store client private keys for VPN peers they generated, and return them to any account allowed to read the configuration. Automation must never print or log those tables.
- **Order matters.** A firewall rule added in the wrong position silently does nothing. The automation inserts rules at a defined position and *fails the run* if a rule ends up below a catch-all drop.
- **Prove drift detection works.** Feed it a config with one rule removed and two entries swapped. It must flag both.

## Results

- Router changes are pull requests with a plan, like any other infrastructure.
- A documented rebuild path with no client reconfiguration.
- A travel setup verified end to end from outside the home network.
