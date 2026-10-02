# Security report: <title>

- **Date:** YYYY-MM-DD
- **Author / reviewer:** <name>
- **Scope:** <what was reviewed: files, features, database, infrastructure>
- **Commit reviewed:** <git SHA at start of review>
- **Fix commit(s):** <SHA(s), or "uncommitted">
- **Status:** <Open | Fixes in code, pending deploy | Complete>

## Summary

<Two to four sentences: overall posture, the most serious issue, and what still needs doing.>

## Scope and method

<How the review was done: manual code review, migration/RLS review, tests run, tools used. Note anything that could not be checked, such as live database settings.>

## Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| YYYY-MM-DD-01 | High | <short title> | Fixed |

### YYYY-MM-DD-01: <title>

- **Severity:** <Critical / High / Medium / Low>
- **Location:** <file paths / migration / dashboard setting>
- **Issue:** <what is wrong>
- **Impact:** <who could exploit it and what they would get>
- **Fix:** <what changed, or why it was deferred or accepted>
- **Status:** <status value>

## Verification

<What was tested and the result: unit tests, local database checks, build, manual steps.>

## Open items

- [ ] <action, with owner if known>

## Related

- CHANGELOG entry: <link or "n/a">
- Previous reports: <links>
