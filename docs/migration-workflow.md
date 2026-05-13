# GigSynq Migration Workflow

## Core Rules

- Development database is the source of truth for schema changes. Change Dev first.
- Every database change must be captured as a new timestamped SQL migration file.
- Every migration must be reviewed before commit.
- Live must receive only approved migrations.
- Never manually change Live first.
- Never edit old migration files after they are committed.
- Take a backup/export before risky Live changes.

## Standard Flow

1. Make and validate schema/data change in Dev.
2. Generate a new timestamped migration SQL file.
3. Review SQL for correctness, safety, and reversibility.
4. Run migration against a non-Live environment and verify app behavior.
5. Open PR and get migration approval.
6. Apply only approved migrations to Live.
7. Validate post-deploy checks and monitor errors.

## Safe Changes vs Dangerous Changes

### Generally Safe (low risk)

- Creating new tables.
- Adding nullable columns.
- Adding indexes concurrently where supported.
- Adding non-breaking views/functions.
- Backfilling data in idempotent batches.

### Dangerous (high risk)

- Dropping tables/columns.
- Renaming columns/tables used by application code.
- Changing column types with possible cast/data loss.
- Tightening constraints on existing data (NOT NULL, UNIQUE, CHECK) without cleanup.
- Large table rewrites or blocking DDL during peak usage.
- RLS/policy changes that can block reads/writes.

For dangerous changes: require explicit approval, backup/export, tested rollback steps, and planned maintenance window if needed.

## Pre-Live Checklist

- Migration file is new, timestamped, and reviewed.
- No old migration files were modified.
- SQL tested in Dev and a non-Live environment.
- Data-impact and lock-impact assessed.
- RLS/policy behavior verified for key roles.
- Backup/export completed for affected tables/data.
- Rollback steps documented and tested where possible.
- Deployment owner and verification owner identified.

## Rollback Notes

- Prefer forward-fix migrations for most failures (safer audit trail).
- For destructive or high-risk changes, prepare a rollback SQL script before Live deploy.
- Keep rollback scope explicit: schema objects, data restore method, and order of operations.
- If data was transformed, define restore source (backup/export) and recovery steps.
- After rollback or forward-fix, re-run smoke checks and confirm RLS/access paths.

## Non-Negotiables

- Live is never the first place a schema change is applied.
- Old committed migrations are immutable.
- Unapproved migrations do not go to Live.
