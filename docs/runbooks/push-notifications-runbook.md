# Push Notifications Runbook

## Purpose

This runbook defines the operational procedures for GigSynq push notifications.

It exists to:
- safely manage notification behaviour,
- prevent accidental notification spam,
- document deployment/testing procedures,
- and provide recovery steps if notification systems fail.

This document covers:
- Expo push notifications,
- Supabase Edge Functions,
- token handling,
- testing workflow,
- rollback procedures.

---

# Notification Architecture

## Current Architecture

GigSynq currently uses:

- Expo Push Notifications
- Supabase Edge Functions
- Supabase database token storage

Notifications are triggered from:
- event creation,
- event updates,
- availability requests,
- future admin actions.

---

# Environments

## Development Environment

Purpose:
- notification testing,
- development validation,
- safe experimentation.

Rules:
- notifications restricted to Ian only,
- must NEVER notify live band users,
- uses Dev Supabase project.

---

## Production Environment

Purpose:
- live member notifications.

Rules:
- notifications sent to real users,
- changes must be controlled,
- notification testing must be deliberate.

---

# Current Safety Rule

## Development Notification Restriction

Development builds currently restrict notifications to Ian only.

This exists to prevent:
- accidental band-wide notification spam,
- confusion during testing,
- repeated fake event notifications.

This restriction must remain active in development environments.

---

# Notification Trigger Types

## Current Notification Types

### Event Created

Triggered when:
- new event added.

Purpose:
- alert members to new event,
- request availability responses.

---

### Event Updated

Triggered when:
- important event details change.

Examples:
- date,
- venue,
- time,
- significant logistics.

Should NOT trigger for:
- minor formatting edits,
- admin-only notes,
- internal-only changes.

---

### Availability Request

Triggered when:
- members need to respond,
- new event requires confirmation.

---

# Token Management

## Expo Push Tokens

Each device registers:
- an Expo push token.

Tokens are stored in Supabase.

---

## Token Rules

- one user may have multiple tokens,
- tokens may become stale,
- tokens must be replaceable,
- invalid tokens should be cleaned up.

---

# Notification Deployment Workflow

## Before Notification Changes

Verify:
- correct environment,
- correct Supabase project,
- correct Edge Function target,
- notification restriction status.

Never test directly against production users unless intentional.

---

## Edge Function Deployment

Deploy using Supabase CLI.

Before deployment:

- [ ] Verify branch
- [ ] Verify environment
- [ ] Verify notification targeting
- [ ] Verify no debug code active

After deployment:

- [ ] Confirm deployment successful
- [ ] Confirm function logs healthy
- [ ] Run controlled notification test

---

# Development Notification Testing

## Safe Testing Procedure

Testing should use:
- Ian test account only,
- development builds only,
- Dev Supabase only.

---

## Test Cases

Verify:

### Notification Delivery
- notification received,
- correct title/body,
- no duplicates.

### App Behaviour
- opens correct screen,
- handles background open,
- handles closed-state open.

### Reliability
- repeated sends stable,
- no crashes,
- no malformed payloads.

---

# Production Notification Testing

## Pre-Release Verification

Before enabling production notifications:

Verify:
- correct target users,
- no development restrictions accidentally active,
- no debug/test payloads,
- production environment confirmed.

---

## Limited Rollout Approach

Initial production notification tests should:
- use limited trusted testers,
- avoid full-band broadcasts initially,
- confirm behaviour before wider use.

---

# Notification Failure Scenarios

## Duplicate Notifications

Possible causes:
- repeated trigger execution,
- duplicate Edge Function invocation,
- duplicate token registration.

Actions:
1. Identify duplicate source
2. Disable trigger if required
3. Verify token table integrity
4. Review Edge Function logs

---

## Notification Spam Risk

Critical issue.

Examples:
- repeated event notifications,
- recursive trigger loops,
- incorrect broadcast targeting.

Immediate actions:
1. Disable notification trigger
2. Stop production testing
3. Verify affected users
4. Review logs immediately

---

## Notifications Not Sending

Possible causes:
- expired tokens,
- failed Edge Function deployment,
- Expo API failure,
- Supabase auth/configuration issues.

Actions:
1. Check Edge Function logs
2. Verify token records
3. Verify Expo payload structure
4. Run controlled test notification

---

# Logging & Monitoring

## Supabase Logs

Monitor:
- Edge Function failures,
- auth failures,
- database errors,
- trigger failures.

---

## Expo Notification Monitoring

Watch for:
- invalid token errors,
- rejected payloads,
- delivery failures.

---

# Release Checklist Requirements

Before production release verify:

- [ ] Notifications send correctly
- [ ] Notifications received correctly
- [ ] No duplicate sends
- [ ] Correct targeting
- [ ] Notification tap navigation works
- [ ] Development restrictions intentionally configured
- [ ] Production environment verified

---

# Emergency Notification Shutdown

## If Notification System Misbehaves

Immediate priorities:

1. Prevent further spam
2. Protect live users
3. Identify root cause

---

## Emergency Shutdown Procedure

Actions may include:

- disabling Edge Function,
- disabling trigger execution,
- temporarily removing notification calls,
- restricting notification recipients,
- reverting latest deployment.

---

# Recovery Procedure

After issue isolated:

1. Fix root cause
2. Test in development environment
3. Validate with restricted testers
4. Restore production notifications gradually

Never immediately restore full-band notifications after a notification incident.

---

# Future Expansion

Future notification systems may include:

- availability reminders,
- calendar reminders,
- finance/payment notifications,
- document upload alerts,
- messaging/chat notifications,
- platform-wide announcements.

As notification complexity grows:
- governance,
- throttling,
- targeting controls,
- and monitoring

must become stricter.