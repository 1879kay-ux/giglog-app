# Environment Management

## Purpose

This document defines the environment management strategy for GigSynq.

It exists to:
- prevent accidental production mistakes,
- separate development from live usage,
- define environment responsibilities,
- and provide safe deployment practices.

This document is critical because GigSynq now operates with:
- multiple Supabase projects,
- multiple build types,
- push notification environments,
- and separate testing/release workflows.

---

# Core Principles

## Environment Separation Is Mandatory

Development and production environments must remain isolated.

Development work must NEVER:
- impact live users,
- modify production data unintentionally,
- trigger live notifications accidentally,
- or introduce untested schema changes.

---

## Production Stability Takes Priority

The production environment is actively used by band members.

Because of this:
- production configuration changes must be controlled,
- releases must be tested,
- and environment switching must be deliberate.

---

# Environment Overview

## Development Environment

Purpose:
- active feature development,
- testing,
- migration validation,
- push notification testing,
- experimental work.

Current setup:
- Separate GigSynq Dev Supabase project
- Development builds
- Restricted notifications
- `rebrand-gigsynq` branch

Development environment is considered non-production.

---

## Production Environment

Purpose:
- live operational use by band members.

Current setup:
- Live Supabase project
- Production notifications
- TestFlight production builds
- Google Play production/internal builds
- Stable released application

Production environment must remain stable.

---

# Supabase Environment Management

## Development Supabase Project

Purpose:
- schema testing,
- migration validation,
- development data,
- notification testing.

Rules:
- safe for experimental work,
- safe for schema testing,
- may contain copied production baseline data,
- should not be treated as authoritative live data.

---

## Production Supabase Project

Purpose:
- live operational data.

Rules:
- no experimental SQL,
- no direct risky edits,
- no untested migrations,
- no casual RLS modifications.

Production database changes must always be controlled.

---

# Environment Variables

## Critical Variables

Examples include:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

These determine:
- authentication target,
- database target,
- API target,
- storage target,
- Edge Function target.

---

# Environment Verification Rules

Before every build verify:

- [ ] correct Supabase URL
- [ ] correct anon key
- [ ] correct build profile
- [ ] correct notification behaviour
- [ ] correct project target

Environment verification is mandatory before release builds.

---

# Build Environment Types

## Development Builds

Purpose:
- native testing,
- push notification testing,
- deep link testing,
- active development.

Rules:
- point to Dev Supabase,
- restricted notifications,
- not for live users.

---

## TestFlight/Internal Testing Builds

Purpose:
- release candidate testing,
- controlled production validation.

Rules:
- production configuration,
- limited tester rollout,
- controlled testing only.

---

## Production Builds

Purpose:
- live operational use.

Rules:
- production Supabase only,
- production notifications enabled,
- release checklist completed,
- rollback path understood.

---

# Push Notification Environment Separation

## Development Notifications

Rules:
- restricted to Ian only,
- safe for repeated testing,
- must not notify live users.

Purpose:
- prevent accidental notification spam.

---

## Production Notifications

Rules:
- real user targeting,
- controlled releases only,
- production testing must be deliberate.

---

# Migration Environment Workflow

## Development First

All migrations must:
1. be created,
2. tested,
3. and validated

against Dev Supabase first.

---

## Production Migration Rules

Before production migration:

Verify:
- migration reviewed,
- rollback understood,
- no unintended schema drift,
- no dangerous RLS changes.

Never run untested migration SQL against production.

---

# RLS Environment Safety

## RLS Changes Are High Risk

RLS changes can:
- expose data,
- block users,
- create recursion failures,
- break app visibility logic.

Because of this:
- all RLS changes must be tested in Dev first,
- production rollout must be controlled,
- multiple user types must be tested.

---

# Environment Switching Rules

## Never Assume Current Environment

Before:
- builds,
- migrations,
- Edge Function deployments,
- SQL execution,

always verify target environment.

---

## Safe Verification Procedure

Before deployment/checks:

Verify:
- Supabase dashboard project name
- environment variables
- branch
- EAS profile
- push notification behaviour

---

# Production Safety Rules

## Never Do Directly In Production

Avoid:
- experimental SQL,
- untested RLS policies,
- untested Edge Functions,
- large refactors,
- dependency upgrades without testing,
- random live debugging edits.

---

# Git & Environment Coordination

## Main Branch

Purpose:
- stable production-ready code.

Should match:
- production release state.

---

## Development Branch

Purpose:
- active development,
- testing,
- experimental work.

Current branch:
- `rebrand-gigsynq`

---

# Release Environment Workflow

## Standard Release Flow

1. Development work
2. Local testing
3. Dev build testing
4. Dev Supabase validation
5. TestFlight/Internal Testing build
6. Controlled tester verification
7. Production release approval
8. Live rollout

---

# Recovery & Rollback

## If Incorrect Environment Used

Examples:
- production notifications sent accidentally,
- production migration run incorrectly,
- wrong Supabase target used.

Immediate actions:
1. Stop further changes
2. Identify affected systems
3. Prevent escalation
4. Assess production impact
5. Begin controlled recovery

---

# Environment Audit Checklist

Before major release verify:

- [ ] Correct Supabase project
- [ ] Correct environment variables
- [ ] Correct build profile
- [ ] Correct notification targeting
- [ ] Correct branch
- [ ] Correct branding
- [ ] Correct release checklist completed

---

# Future Expansion

As GigSynq evolves, environment management will likely expand to include:

- staging environments,
- preview deployments,
- automated CI/CD,
- automated testing,
- multi-tenant infrastructure,
- payment sandbox environments,
- production monitoring systems.

Operational discipline must increase alongside platform complexity.
