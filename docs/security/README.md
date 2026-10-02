# Security reports

Archive of security audits and remediation reports for Chapter Connect (PAPHI).
Each report records what was reviewed, what was found, what was fixed, and what is still open.

## Reports

Newest first. Update the **Status** column when a report's open items are resolved.

| Date | Report | Scope | Status |
|---|---|---|---|
| 2026-10-01 | [Security audit: SQLi, passwords, stored procedures, full app](2026-10-01-security-audit.md) | Full codebase + Supabase migrations | DB migration applied to prod; app deploy and follow-ups pending |

## Adding a report

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to `YYYY-MM-DD-short-title.md` in this folder.
2. Fill in every section. Write "None" rather than deleting a section, so reports stay comparable.
3. Add a row to the table above, newest first.
4. If the work changed product or platform behavior, also add a short entry to [`CHANGELOG.md`](../../CHANGELOG.md) that links back to the report.
5. When a later report resolves an earlier report's open item, update the earlier report's **Open items** section with a link to the later one. Don't rewrite its findings.

## Conventions

- **Severity:** Critical / High / Medium / Low, using impact and how easily it can be exploited in *this* app (for example, whether the attacker needs an account or an admin role).
- **Finding IDs:** `YYYY-MM-DD-NN` (for example `2026-10-01-03`), so later reports can refer back.
- **Status values:** `Fixed`, `Fixed (pending deploy)`, `Mitigated`, `Accepted risk`, `Deferred`, `Open`.
- **Don't include secrets.** No keys, tokens, real user data or working exploit payloads beyond what's needed to understand the issue.
