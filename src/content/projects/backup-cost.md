---
title: "Backup cost engineering: from ~74 to ~20 CAD a month"
summary: "Designing off-site backup lifecycle for terabytes of family data under a fixed budget, without giving up restorability."
order: 4
tags: [Cloud cost, Backups, Azure, Lifecycle management, FinOps]
stats:
  - { value: "~74 → ~20", label: "CAD / month at 2.4 TB" }
  - { value: "50 CAD", label: "hard monthly budget, with alerts" }
  - { value: "0", label: "age-based deletes on deduplicated data" }
---

## The problem

Photo and file libraries grow into terabytes. Kept in the default storage
tier, the projected off-site backup bill was about **74 CAD a month**, well
over a 50 CAD budget. The constraint was clear: cut the cost, but never lose
data.

## What drives the cost

- **Mostly media.** Nearly all of the volume is photos and files that rarely change after upload.
- **Rebuildable data was costing the most.** Metrics and logs were *two thirds* of the backup data, rewritten every day, and they can be rebuilt.
- **The repository layout limits the options.** Deduplicated backup repositories keep blocks written by the first backup for as long as the data is unchanged. Deleting blobs by age would silently corrupt every backup.

## The design

1. **Stop backing up what can be rebuilt.** Metrics, logs and scratch volumes are excluded. Databases are excluded at file level, because they're covered by point-in-time archiving and logical dumps.
2. **Tier, don't delete.** Data blocks of the big libraries move to the **Cold** tier after 30 days. Cold is about 4.4× cheaper than Hot and still online, so backups and restores work unchanged. Indexes and metadata stay Hot.
3. **Let the tools delete their own data.** Retention lives in the backup tools: 7 daily, 5 weekly and 6 monthly copies, and 14 days of database history. Storage rules only expire simple dated files.
4. **Keep the undo button.** Blob versioning and soft delete stay on. They cost little and undo mistakes made by people, tools or rules.
5. **Watch it.**
   - A monthly budget with e-mails at 15, 30 and 45 CAD, and a forecast warning before 50.
   - A capacity alert.
   - A one-command usage report.
   - A five-minute monthly review.

## The numbers

| Scenario (2.4 TB of media) | Monthly cost |
|---|---|
| Everything in the default (Hot) tier | ~74 CAD |
| Rebuildable data excluded, media in Cold after 30 days | **~20 CAD** |
| Headroom inside a 50 CAD budget | ~6 TB |

**The trade-off we accepted:** a *full* disaster restore would pay a one-off retrieval and egress cost of about 360 CAD. Partial restores, the common case, cost cents.

## Results

- Under budget with room to grow, and no data protection given up.
- Cost is now an alerted signal with a written response plan, not a surprise on the invoice.
