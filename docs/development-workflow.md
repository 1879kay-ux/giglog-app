# Development Workflow

## Purpose

This document defines the operational development workflow for GigSynq.

It exists to:
- maintain production stability,
- enforce controlled releases,
- reduce regression risk,
- formalise release cadence,
- standardise migrations,
- and improve long-term maintainability.

This workflow applies to:
- application code,
- Supabase migrations,
- Edge Functions,
- push notifications,
- infrastructure changes,
- and production releases.

---

# Core Development Philosophy

GigSynq is a live operational platform.

Because of this:
- production stability takes priority,
- minimum-change development is preferred,
- releases must be controlled,
- and risky changes must be isolated.

---

# Golden Rules

## Minimum Change Principle

Avoid:
- unnecessary refactors,
- variable renaming,
- architecture rewrites,
- dependency churn,
- broad formatting-only commits.

Prefer:
- focused changes,
- isolated fixes,
- incremental improvements.

---

## Development First, Production Second

All significant changes must:
1. be developed,
2. tested,
3. validated,

before production rollout.

---

## Protect Stable Production

The stable production/TestFlight build is considered operationally critical.

Never:
- rush releases,
- deploy untested auth changes,
- deploy untested RLS changes,
- deploy notification changes casually.

---

# Branch Strategy

## Main Branch

Branch:
```text
main
```

Purpose:
- stable production-ready code only.

Rules:
- no experimental work,
- no partial implementations,
- no untested migrations,
- no direct rushed edits.

`main` should always represent:
- the latest stable production state.

---

## Development Branch

Branch:
```text
rebrand-gigsynq
```

Purpose:
- active development,
- feature implementation,
- migration work,
- testing,
- rebrand transition work.

Current primary working branch.

---

# Recommended Future Branch Model

As project complexity grows:

## Feature Branches

Pattern:
```text
feature/short-description
```

Examples:
```text
feature/push-reminders
feature/calendar-sync
feature/finance-rework
```

Purpose:
- isolate risky work,
- reduce merge conflicts,
- simplify rollback.

---

## Hotfix Branches

Pattern:
```text
hotfix/short-description
```

Examples:
```text
hotfix/login-failure
hotfix/push-spam
```

Purpose:
- urgent production recovery.

Hotfixes should:
- be minimal,
- focused,
- and production-safe.

---

# Release Cadence

## Development Cycle

Recommended flow:

1. Development work
2. Local testing
3. Dev build testing
4. Dev Supabase validation
5. Controlled release candidate build
6. TestFlight/Internal Testing
7. Limited tester verification
8. Production approval
9. Live rollout

---

## Recommended Release Rhythm

### Minor Releases

Examples:
- UI fixes,
- small improvements,
- wording updates,
- non-critical enhancements.

Cadence:
- flexible,
- grouped where sensible.

---

### Major Releases

Examples:
- auth changes,
- RLS changes,
- notification architecture,
- finance systems,
- migrations,
- calendar sync,
- payments.

Cadence:
- slower,
- deliberate,
- heavily tested.

---

# Commit Workflow

## Commit Principles

Commits should:
- represent logical units of work,
- be understandable,
- avoid unrelated changes.

Avoid:
- giant mixed-purpose commits,
- formatting-only commits mixed with feature work.

---

## Recommended Commit Style

Examples:
```text
Add event availability conflict indicator
Fix password reset callback handling
Restrict dev push notifications to Ian
Add admin unavailable-period export
```

---

# Pull / Merge Discipline

Before merging:
- test locally,
- review changed files,
- confirm no accidental changes,
- verify environment configuration.

Never merge:
- broken builds,
- untested auth changes,
- incomplete migrations.

---

# Migration Workflow

## Migration Naming Standard

Migration names should:
- clearly describe purpose,
- remain concise,
- avoid vague naming.

---

## Recommended Format

Pattern:
```text
YYYYMMDDHHMMSS_description.sql
```

Examples:
```text
20260513100201_add_push_tokens_table.sql
20260513114500_fix_event_visibility_rls.sql
20260513130000_add_member_unavailability.sql
```

---

## Migration Rules

- One logical change per migration where possible
- No experimental SQL
- No undocumented manual production edits
- Test against Dev Supabase first
- Review RLS changes carefully

---

## High-Risk Migration Types

Treat as critical:
- RLS policy changes
- auth-related schema
- visibility logic
- destructive table changes
- trigger changes
- Edge Function integration changes

---

# Release Candidate Workflow

## Before Release Candidate Build

Complete:
- release checklist,
- testing matrix,
- environment verification.

Verify:
- correct Supabase target,
- correct notification behaviour,
- correct branding.

---

## TestFlight/Internal Testing Phase

Purpose:
- validate release candidate,
- identify regressions before live rollout.

Testing should include:
- authentication,
- notifications,
- availability,
- documents,
- admin functions,
- RLS-sensitive flows.

---

# Production Release Workflow

## Production Approval Criteria

Release only proceeds if:
- no critical bugs,
- no RLS/security issues,
- no auth regressions,
- no notification regressions,
- no environment issues.

If uncertain:
- HOLD RELEASE.

---

# Hotfix Workflow

## Emergency Production Fixes

Use:
```text
hotfix/*
```

Workflow:
1. Isolate issue
2. Make minimum safe fix
3. Test immediately
4. Deploy controlled release
5. Verify production recovery

Avoid:
- opportunistic feature additions,
- unrelated cleanup,
- refactors during incident response.

---

# Rollback Principles

## If Release Fails

Preferred order:
1. Fix forward safely
2. Revert isolated change
3. Restore previous stable build
4. Pause rollout entirely

---

# Staging Discipline

## Current State

Current staging model:
- Dev Supabase
- Dev builds
- TestFlight/Internal Testing

This currently acts as:
- combined development + staging workflow.

---

## Future Recommendation

Long-term recommended structure:

### Development
Experimental work

### Staging
Production-like validation

### Production
Live operational system

This separation will become increasingly important as platform complexity grows.

---

# Environment Discipline

Before:
- builds,
- migrations,
- deployments,
- notification testing,

always verify:
- branch,
- Supabase project,
- EAS profile,
- notification targeting.

Never assume current environment.

---

# Release Tagging (Recommended Future Practice)

Recommended tag examples:
```text
v1.0.0
v1.1.0
v1.1.1
```

Purpose:
- identify stable releases,
- simplify rollback,
- track production history.

---

# Documentation Discipline

When systems change:
- update docs,
- update testing requirements,
- update release procedures,
- update operational runbooks.

Documentation is considered part of the development workflow.

---

# Future Workflow Expansion

As GigSynq evolves, workflow discipline will likely expand to include:

- CI/CD pipelines,
- automated testing,
- preview deployments,
- protected production approvals,
- automated migration validation,
- staged rollout automation,
- crash analytics integration,
- monitoring/alerting systems.

Operational maturity should increase alongside platform complexity.
