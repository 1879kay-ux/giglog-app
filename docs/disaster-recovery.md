# Disaster Recovery

## Purpose

This document defines the disaster recovery procedures for GigSynq.

It exists to:
- reduce production downtime,
- protect live operational data,
- provide recovery procedures for critical failures,
- minimise risk during deployments and migrations,
- and document emergency operational responses.

This document should be reviewed before:
- major releases,
- schema changes,
- infrastructure changes,
- notification system changes,
- authentication changes.

---

# Recovery Principles

## Core Rules

- Protect production data first.
- Stop escalation before attempting fixes.
- Avoid rushed live edits.
- Isolate the issue before deploying additional changes.
- Preserve ability to rollback whenever possible.
- Never perform destructive recovery actions without verification.

---

# Critical Systems

The following systems are considered production-critical:

- Supabase database
- Authentication system
- RLS policies
- Event visibility logic
- Push notification system
- Document storage
- Expo/EAS deployment pipeline
- GitHub repository

---

# Incident Severity Levels

## Severity 1 — Critical Production Failure

Examples:
- login system failure,
- RLS/security exposure,
- event visibility leak,
- production database corruption,
- notification spam,
- production environment misconfiguration,
- app startup crash for all users.

Action:
- Immediate response required.
- Production rollout halted.
- Rollback/recovery prioritised.

---

## Severity 2 — Major Functional Failure

Examples:
- document upload failure,
- availability issues,
- partial notification failure,
- admin-only functionality broken.

Action:
- Investigate urgently.
- Production release may be paused.

---

## Severity 3 — Minor Issue

Examples:
- cosmetic UI issue,
- wording issue,
- layout issue,
- non-critical visual regression.

Action:
- Log issue.
- Fix in controlled future release.

---

# Immediate Incident Response

## First Response Procedure

When issue discovered:

1. Stop further deployment activity
2. Identify affected system
3. Assess severity
4. Determine production impact
5. Prevent escalation
6. Preserve rollback options

---

## Never Do During Incident

- Blind live edits
- Multiple simultaneous fixes
- Untested production SQL
- Random dependency upgrades
- Refactors during recovery
- Direct risky edits on `main`

---

# Supabase Recovery

## Production Database Failure

If production database issue occurs:

Immediately:
- stop schema changes,
- stop migrations,
- identify affected tables/functions/policies,
- review Supabase logs.

---

## RLS Failure Recovery

Examples:
- users seeing incorrect events,
- admin restrictions broken,
- recursion errors,
- blocked access.

Actions:
1. Identify failing policy
2. Review latest migration/change
3. Revert isolated policy change if possible
4. Validate using multiple user types
5. Re-test visibility rules

Do NOT deploy unrelated fixes during RLS recovery.

---

## Failed Migration Recovery

If migration causes issue:

Actions:
1. Stop further migrations
2. Identify exact migration
3. Determine:
   - reversible,
   - partially reversible,
   - data-destructive,
   - policy-related.
4. Create controlled corrective migration
5. Test in Dev environment first if possible

Never manually patch production repeatedly without documenting changes.

---

# Authentication Recovery

## Login Failure

Examples:
- users cannot sign in,
- invalid sessions,
- auth callback failures.

Actions:
1. Verify Supabase auth status
2. Verify environment variables
3. Verify auth callback configuration
4. Test with known working account
5. Review recent auth-related changes

---

## Password Reset Failure

Actions:
1. Verify reset flow
2. Verify callback URLs
3. Verify deep link handling
4. Verify Supabase auth email behaviour

Password reset is considered production-critical.

---

# Push Notification Recovery

## Notification Spam Incident

Critical issue.

Immediate actions:
1. Disable notification trigger logic
2. Stop further deployments
3. Review Edge Function logs
4. Identify trigger source
5. Restrict notification recipients if required

Priority:
- stop further spam immediately.

---

## Notifications Not Sending

Actions:
1. Verify Edge Function deployment
2. Verify Expo token records
3. Verify environment variables
4. Review Supabase logs
5. Run controlled test notification

---

# Document Storage Recovery

## Upload/Download Failure

Actions:
1. Verify Supabase storage status
2. Verify storage policies
3. Verify authenticated access
4. Verify bucket permissions
5. Test with admin and non-admin users

---

# Build & Deployment Recovery

## Broken TestFlight/Internal Build

Actions:
1. Stop wider rollout
2. Preserve previous stable build
3. Identify regression
4. Rebuild corrected version
5. Re-test fully

Never promote unstable TestFlight builds to wider release.

---

## Production App Crash

Actions:
1. Determine crash scope
2. Identify startup vs feature-specific crash
3. Review latest release changes
4. Revert or rebuild immediately if required

Critical startup crashes require immediate release halt.

---

# Git Recovery

## Bad Commit Recovery

Preferred order:

1. Fix forward safely
2. Revert isolated commit
3. Restore previous stable branch state

Avoid:
- destructive history rewrites,
- panic force-pushes,
- deleting branches impulsively.

---

## Branch Protection Principles

`main` should remain:
- stable,
- production-ready,
- recoverable.

Experimental work belongs on development branches only.

---

# Backup & Export Strategy

## Recommended Protection

Maintain:
- GitHub repository backups
- Supabase migration history
- Schema exports
- Environment variable records
- App store configuration records

---

## Before Major Changes

Before:
- major migration,
- RLS overhaul,
- auth changes,
- notification architecture changes,

ensure:
- latest code pushed,
- migrations committed,
- rollback path understood.

---

# Release Halt Conditions

Immediately halt release if:

- login broken,
- password reset broken,
- RLS/security issue discovered,
- incorrect event visibility,
- notification spam occurring,
- production environment incorrect,
- data corruption risk identified,
- startup crash introduced.

---

# Recovery Validation Checklist

After recovery verify:

- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] Event visibility correct
- [ ] RLS functioning correctly
- [ ] Notifications stable
- [ ] Documents accessible
- [ ] Admin functions working
- [ ] No recurring errors in logs

---

# Post-Incident Review

After incident resolved:

Document:
- root cause,
- affected systems,
- corrective actions,
- prevention measures,
- required documentation updates.

The goal is:
- prevent recurrence,
- improve operational maturity,
- strengthen release discipline.

---

# Future Expansion

As GigSynq evolves, disaster recovery procedures must expand to include:

- payments,
- finance systems,
- calendar sync,
- messaging,
- external integrations,
- multi-band architecture,
- advanced notification systems.

Operational discipline must increase as platform complexity grows.