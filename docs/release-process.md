# Release Process

## Purpose

This document defines the operational release workflow for GigSynq.

It exists to ensure:
- stable production releases,
- controlled testing,
- safe deployment practices,
- consistent rollback procedures,
- and separation between development and live production environments.

This process must be followed for all significant releases.

---

# Core Release Philosophy

GigSynq is a live production application actively used by band members.

Because of this:

- production stability takes priority over speed,
- all releases must be controlled,
- all authentication/RLS changes are considered high risk,
- and releases should favour minimum safe changes.

If uncertain:
- delay the release,
- test further,
- or revert to the last stable state.

---

# Environment Structure

## Development Environment

Purpose:
- feature development,
- testing,
- experimental work,
- migration validation.

Includes:
- GigSynq Dev Supabase project
- development builds
- restricted push notifications
- experimental branch work

Development environment must NEVER impact live users.

---

## Production Environment

Purpose:
- live usage by band members.

Includes:
- Live Supabase project
- production push notifications
- TestFlight production builds
- Google Play production/internal builds

Production changes must always be controlled and intentional.

---

# Branching Strategy

## Main Branch

`main`

Purpose:
- stable production-ready code only.

Rules:
- no experimental work,
- no partial features,
- no untested migrations,
- no direct rushed edits.

---

## Development/Rebrand Branch

`rebrand-gigsynq`

Purpose:
- active development work,
- feature testing,
- migration preparation,
- rebrand work.

All active development currently occurs here.

---

# Standard Development Workflow

## Step 1 — Create/Update Feature Work

Perform development on:
- `rebrand-gigsynq`

Rules:
- minimum-change approach,
- no unnecessary refactors,
- no dependency changes unless required,
- preserve stable architecture,
- preserve production compatibility.

---

## Step 2 — Local Testing

Before any build:

Verify:
- app launches,
- navigation works,
- no syntax/build errors,
- no console crash loops,
- no obvious UI regressions.

Run:
```bash
git status
```

Confirm:
- intended files only modified,
- no accidental formatting-only changes,
- no temp/debug files.

---

## Step 3 — Development Build Testing

Development builds are used for:
- push notification testing,
- native functionality,
- deep link testing,
- device testing,
- Supabase integration testing.

Development builds must:
- point to Dev Supabase,
- use restricted notifications,
- avoid impacting live users.

Verify:
- login/logout,
- password reset,
- event flows,
- availability,
- notifications,
- RLS-sensitive functionality.

---

# Migration Workflow

## Before Creating Migration

Always:
- confirm correct Supabase project,
- confirm correct branch,
- ensure no unrelated schema drift.

---

## Create Migration

Use Supabase CLI migration generation process.

Migration rules:
- one logical change per migration where possible,
- descriptive migration names,
- no experimental SQL in production migrations.

---

## Test Migration

Before production use:

Verify:
- migration runs cleanly,
- rollback/recovery understood,
- RLS unaffected unless intentional,
- no policy recursion introduced.

---

## Commit Migration

Commit:
- migration SQL,
- associated documentation updates,
- related code changes.

Never commit:
- temp exports,
- local database dumps,
- secrets/config files.

---

# Pre-Release Workflow

Before any TestFlight/Internal Testing build:

Complete:
- `docs/production-release-checklist.md`

Do NOT skip:
- auth testing,
- RLS testing,
- push notification testing.

These are highest-risk systems.

---

# Build Workflow

## iOS Build Process

Build using EAS.

Verify:
- correct environment,
- correct branch,
- correct app config,
- correct notification behaviour.

After build:
- install on physical device,
- complete full smoke test.

---

## Android Build Process

Build using EAS.

Verify:
- correct environment,
- notifications functioning,
- no startup crashes,
- permissions behaving correctly.

After build:
- install on physical device,
- complete smoke test.

---

# TestFlight/Internal Testing Workflow

## Limited Initial Rollout

Initial builds should be tested by:
- Ian,
- limited trusted testers only.

Purpose:
- identify regressions before wider exposure.

---

## Required Verification

Before wider rollout verify:

### Authentication
- login,
- logout,
- password reset,
- invite flow.

### Events
- creation,
- editing,
- visibility.

### Availability
- status updates,
- readiness logic,
- dep substitution logic.

### Notifications
- sends correctly,
- received correctly,
- no duplicate notifications.

### Documents
- upload,
- download,
- permissions.

### Admin Functions
- member management,
- admin-only access,
- permissions enforcement.

### RLS/Security
- no visibility leaks,
- no policy failures,
- no recursion errors.

---

# Production Release Approval

Production release only proceeds if:

- all required testing passed,
- no critical regressions found,
- environments verified,
- branding verified,
- push notifications verified,
- rollback path understood.

If uncertain:
- HOLD RELEASE.

---

# Emergency Rollback Procedure

## Immediate Actions

If production issue discovered:

1. Stop rollout immediately
2. Identify affected system
3. Assess severity
4. Determine if rollback required

---

## Critical Issue Examples

Immediate rollback/block required for:

- login failure,
- password reset failure,
- RLS/security regression,
- event visibility leak,
- notification spam,
- data corruption risk,
- broken production environment configuration.

---

## Preferred Recovery Order

1. Fix issue on branch and rebuild
2. Revert isolated commit
3. Restore previous stable build
4. Pause release entirely

---

# Logging & Monitoring

After release monitor:

- Supabase logs,
- auth failures,
- RLS errors,
- edge function errors,
- notification failures,
- crash reports,
- tester feedback.

Do not assume release is stable immediately after deployment.

---

# Documentation Requirements

When major systems change, update relevant docs.

Examples:
- architecture docs,
- permissions matrix,
- notifications overview,
- migration workflow,
- release checklist,
- release process.

Documentation is considered part of the release process.

---

# Current Protected Technical Identifiers

The following are intentionally retained and must NOT be changed casually:

- app scheme: `giglog`
- iOS bundle ID: `com.giglogtracker.app`
- Android package: `com.giglogtracker.app`
- auth callback: `giglog://auth/callback`

Changing these requires:
- planned migration,
- coordinated rollout,
- and dedicated testing.

---

# Future Expansion

As GigSynq evolves, this release process must expand to include:

- payment workflows,
- calendar sync,
- messaging,
- advanced notifications,
- finance systems,
- external integrations,
- multi-band/platform support.

Release governance should become stricter as platform complexity increases.
