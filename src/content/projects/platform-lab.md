---
title: "Platform Lab: production-grade Kubernetes on one server"
summary: "A highly available Kubernetes platform with GitOps, single sign-on, policy, backups and observability, run like production on a single home server."
order: 1
tags: [Kubernetes, GitOps, Argo CD, Cilium, Terraform, Ansible, Security]
stats:
  - { value: "6 nodes", label: "3 control planes, 3 workers" }
  - { value: "20+", label: "platform components, all from Git" }
  - { value: "100%", label: "admin UIs behind SSO + MFA" }
  - { value: "Restore-tested", label: "every backup type" }
---

## The problem

Most home labs grow by hand: a command here, a tweak there, until nobody
(including the owner) can rebuild them. The goal was the opposite: a platform
that behaves like a small production environment, where every change is
reviewed, repeatable and recoverable, on a budget of one server.

## The design

**Infrastructure as code from the metal up.**
- Virtual machines are defined in Terraform.
- Nodes are configured by Ansible roles: operating system, container runtime, Kubernetes packages, load balancer.
- Upgrades are an Ansible role too. A Kubernetes minor-version upgrade and the replacement of a failed control-plane node were both done through code, with dry runs first.

**A highly available control plane.** Three control-plane nodes with stacked
etcd sit behind a TCP load balancer, so losing one node doesn't stop the
cluster. Daily, verified etcd snapshots are copied off-site.

**Networking:**
- **Cilium** for pod networking, network policies and flow visibility.
- **Gateway API** with Traefik for routing, and **cert-manager** for automatic TLS (DNS-01 wildcard certificates).
- **external-dns** publishes public names automatically, and follows a dynamic home IP.

**GitOps.** Argo CD deploys everything from a Git repository. Changes arrive
as pull requests with automated checks, and syncs are deliberate, so nothing
reaches the cluster without review. Renovate keeps versions current.

**Identity.** Every administrative interface sits behind **Authentik**:
- single sign-on with mandatory multi-factor authentication;
- OIDC for apps that support it, forward authentication for those that don't;
- a documented break-glass path for each.

**Security as policy, not hope:**
- **Kyverno** policies (non-root, read-only filesystems, resource limits, no privilege escalation), rolled out in audit mode first, with explicit, reviewed exceptions;
- **Trivy** for vulnerability and configuration scanning;
- Pod Security "restricted" for application namespaces;
- **gitleaks** in CI;
- secrets live in a cloud key vault and are synced by External Secrets, never stored in Git.

**Data protection:**
- **Longhorn** replicated storage;
- **CloudNativePG** with continuous WAL archiving (point-in-time recovery);
- **Velero/Kopia** encrypted, deduplicated off-site backups;
- every backup type has been **restored and compared byte-for-byte**, not just "completed".

**Observability:**
- **Prometheus** and **Grafana** for metrics;
- **Loki** for logs;
- **Alertmanager** sends e-mail, and every alert has a written runbook;
- synthetic probes check every public and internal URL;
- one `make health` command checks the whole stack.

**CI on every pull request.** yamllint, ansible-lint, Kubernetes schema
validation, Terraform validation, policy checks, secret scanning, workflow
linting, and dry runs of the node playbooks against the live machines.

## Decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| Manual Argo CD sync | A human checks every change against the live state | Slower than auto-sync; fine at this scale |
| Policies in audit before enforce | Fix real workloads first, then turn the screws | A window where violations are only reported |
| Off-site backups in object storage, not a second site | Cheapest real off-site copy | Full restores pay egress; partial restores are cheap |
| Single physical host | Budget | Hardware is a single point of failure; documented, with restore paths |

## Results

- Rebuildable from Git plus backups, with the steps written down.
- Upgrades and node replacements are routine, reviewed changes instead of risky evenings.
- A documentation set a new engineer can pick up: architecture, operations, alert runbooks, a maintenance calendar.
