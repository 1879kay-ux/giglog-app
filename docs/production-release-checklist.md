# Production Release Checklist

## Purpose

This document defines the controlled release process for GigSynq.

The live/TestFlight app is actively used by band members and must remain stable during ongoing development.

This checklist exists to:
- reduce production risk,
- prevent accidental environment/configuration mistakes,
- avoid RLS/security regressions,
- ensure controlled testing before release,
- and provide a rollback strategy if issues are discovered.

---

# Release Principles

## Core Rules

- Never rush a production release.
- Stable production app takes priority over new features.
- Make minimum-change releases whenever possible.
- Avoid combining unrelated changes into a single release.
- Test authentication and RLS-sensitive flows on every release.
- Treat push notifications as production-impacting functionality.
- If unsure, hold the release.

---

# Environment Structure

## Production Environment

Used by live band members.

Includes:
- Live Supabase project
- Production push notifications
- TestFlight live build
- Google Play live/internal production build

## Development Environment

Used for testing only.

Includes:
- Separate GigSynq Dev Supabase project
- Development builds
- Restricted push notifications
- Experimental work on `rebrand-gigsynq`

---

# 1. Branch & Git Verification

## Branch Check

- [ ] Correct branch checked out
- [ ] No accidental work on `main`
- [ ] Branch tracking remote correctly
- [ ] Latest changes pushed to GitHub

## Git Status

Before every build:

```bash
git status
```

Confirm:
- [ ] Working tree clean
- [ ] No accidental local edits
- [ ] No untracked temp files
- [ ] No local secrets/config files staged

## Review Commit Scope

Confirm release only includes intended changes.

Avoid:
- unrelated formatting changes,
- accidental refactors,
- renamed files,
- dependency upgrades,
- experimental code.

---

# 2. Environment Verification

## Confirm Supabase Environment

Verify correct environment variables before build.

Check:
- [ ] `EXPO_PUBLIC_SUPABASE_URL`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Confirm:
- [ ] Dev builds use Dev Supabase
- [ ] Production builds use Live Supabase

## Confirm Notification Behaviour

Verify push notification targeting.

Development:
- [ ] Restricted to Ian only

Production:
- [ ] Restriction intentionally removed
- [ ] No test user hardcoding
- [ ] No debug notification logic active

## Confirm No Local/Test URLs

Search for:
- localhost
- 127.0.0.1
- test endpoints
- dev-only URLs

---

# 3. Rebrand / String Audit

## Controlled Search

Run searches before release:

```bash
grep -R "GigLog" .
grep -R "giglog" .
```

Review all matches carefully.

## Expected Remaining References

The following references are currently intentional and must NOT be changed unless performing a controlled migration:

- app scheme: `giglog`
- iOS bundle ID: `com.giglogtracker.app`
- Android package: `com.giglogtracker.app`
- auth callback: `giglog://auth/callback`
- package name: `giglog`
- historical/technical documentation

## User-Facing Branding Verification

Confirm all visible branding says GigSynq.

Check:
- [ ] App display name
- [ ] Splash screen
- [ ] Notification titles
- [ ] Invite emails
- [ ] Password reset text
- [ ] Store screenshots
- [ ] Store descriptions
- [ ] Support/privacy links

---

# 4. Core Functional Testing

These flows must be tested before major releases.

---

## Authentication Testing

### Login

- [ ] Existing user login works
- [ ] Invalid password handling works
- [ ] Session persists after app restart

### Logout

- [ ] Logout works correctly
- [ ] Session clears correctly

### Password Reset

- [ ] Reset email/passcode flow works
- [ ] Deep link/callback works
- [ ] User can successfully log back in

### Invite Flow

- [ ] Admin can invite user
- [ ] Invite email received
- [ ] User onboarding works
- [ ] User account created correctly

---

## Event Testing

### Event Management

- [ ] Create event works
- [ ] Edit event works
- [ ] Delete event works
- [ ] Cancelled event behaviour correct

### Event Visibility

Verify:
- [ ] Admin sees all events
- [ ] Core band visibility correct
- [ ] Deps only see assigned events
- [ ] Crew visibility correct
- [ ] `can_view_all_events` override works

### Event UI

- [ ] Event list loads
- [ ] Event details load
- [ ] Calendar loads correctly
- [ ] No navigation loops/crashes

---

## Availability Testing

### Member Availability

- [ ] Available status saves
- [ ] Provisional status saves
- [ ] Unavailable status saves
- [ ] Awaiting status behaves correctly

### Availability Logic

Verify:
- [ ] Readiness indicators correct
- [ ] Dep substitution logic correct
- [ ] Availability summaries correct
- [ ] Conflicts display correctly

---

## Member Unavailability Testing

- [ ] Add unavailable period works
- [ ] Edit unavailable period works
- [ ] Delete unavailable period works
- [ ] Calendar shows unavailable periods correctly
- [ ] Admin yearly export/share works

---

## Documents Testing

### Upload/Download

- [ ] Upload works
- [ ] Download works
- [ ] Delete works

### Permissions

Verify:
- [ ] Correct visibility enforced
- [ ] Non-admin restrictions work
- [ ] Event documents accessible correctly
- [ ] Band documents accessible correctly

---

## Push Notifications Testing

Verify:
- [ ] Notifications send correctly
- [ ] Notifications received correctly
- [ ] Correct users targeted
- [ ] No duplicate notifications
- [ ] Notification tap opens correct screen

Test:
- [ ] New event notification
- [ ] Event updated notification
- [ ] Availability request notification

---

## Admin Function Testing

Verify:
- [ ] Add member works
- [ ] Edit member works
- [ ] Deactivate member works
- [ ] Admin-only screens protected
- [ ] Permissions enforced correctly

---

# 5. RLS / Security Verification

Critical area.

RLS regressions can silently expose data or break production functionality.

---

## Non-Admin Restrictions

Verify non-admin users cannot:

- [ ] Edit other users
- [ ] Access admin screens
- [ ] Access finance data
- [ ] Modify restricted data
- [ ] Bypass event visibility

---

## Admin Permissions

Verify admins can:

- [ ] Manage members
- [ ] Manage events
- [ ] Manage documents
- [ ] Manage availability
- [ ] Access all required screens

---

## Supabase Log Review

Review:
- [ ] RLS errors
- [ ] recursion errors
- [ ] auth failures
- [ ] edge function failures
- [ ] notification failures

Do not release with unresolved RLS errors.

---

# 6. Build Verification

## iOS TestFlight

Verify:
- [ ] Build installs correctly
- [ ] App launches successfully
- [ ] No startup crash
- [ ] Login works
- [ ] Push permissions prompt correctly
- [ ] Notifications received
- [ ] Deep links function correctly

---

## Android Internal Testing

Verify:
- [ ] Build installs correctly
- [ ] App launches successfully
- [ ] Login works
- [ ] Push permissions prompt correctly
- [ ] Notifications received
- [ ] No major UI regressions

---

# 7. Store & Compliance Review

## Apple App Store

Verify:
- [ ] App name correct
- [ ] Description updated
- [ ] Screenshots updated
- [ ] Privacy policy valid
- [ ] Support URL valid

---

## Google Play

Verify:
- [ ] Store listing updated
- [ ] Privacy policy valid
- [ ] Support URL valid
- [ ] Notification declarations accurate

---

# 8. Pre-Release Hold Point

Before approving release:

- [ ] All required testing complete
- [ ] No unresolved critical bugs
- [ ] No authentication regressions
- [ ] No RLS/security regressions
- [ ] No notification regressions
- [ ] Correct environment verified
- [ ] Branding verified
- [ ] Rollback plan understood

If uncertain:
- HOLD RELEASE.

---

# 9. Rollback Strategy

## If Issues Are Found During Testing

Immediately:

- [ ] Stop wider rollout
- [ ] Do not promote to production
- [ ] Identify exact regression
- [ ] Determine severity

Classify issue:

### Critical

Examples:
- login broken,
- password reset broken,
- RLS/security failure,
- incorrect event visibility,
- notification spam,
- production environment mistake,
- data corruption risk.

Action:
- Release blocked immediately.

### Non-Critical

Examples:
- UI alignment issue,
- cosmetic issue,
- wording issue,
- minor layout bug.

Action:
- Assess whether acceptable for release.

---

## Preferred Recovery Order

1. Fix issue on branch and rebuild
2. Revert isolated commit
3. Rebuild previous stable version
4. Pause release entirely

---

# 10. Final Release Sign-Off

Release only proceeds when all verified:

- [ ] iOS tested
- [ ] Android tested
- [ ] Authentication tested
- [ ] Push notifications tested
- [ ] Availability tested
- [ ] Documents tested
- [ ] Admin flows tested
- [ ] RLS/security tested
- [ ] Branding verified
- [ ] Environment verified
- [ ] Rollback understood

---

# Notes

This checklist should evolve alongside the app.

Whenever major systems are added:
- payments,
- calendar sync,
- messaging,
- advanced notifications,
- finance workflows,
- external integrations,

their release verification steps must be added here before production rollout.