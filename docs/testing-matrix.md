# Testing Matrix

## Purpose

This document defines the standard testing matrix for GigSynq.

It exists to:
- ensure consistent release testing,
- reduce production regressions,
- validate high-risk systems,
- and provide repeatable QA coverage before release.

This document complements:
- `production-release-checklist.md`
- `release-process.md`

---

# Testing Principles

## Core Rules

- Authentication changes are always high risk.
- RLS-sensitive flows must always be tested.
- Push notifications are production-impacting.
- Test real user flows, not isolated screens only.
- Test both admin and non-admin behaviour.
- Test on physical devices whenever possible.

---

# Test Environments

## Development Environment

Purpose:
- active development,
- debugging,
- migration testing,
- push notification testing.

Environment:
- Dev Supabase project
- Development builds
- Restricted notifications

---

## Production/Test Environment

Purpose:
- release candidate testing,
- TestFlight verification,
- Internal Testing verification.

Environment:
- Production configuration
- Real push notifications
- Real authentication behaviour

---

# User Types To Test

## Admin User

Must verify:
- full access,
- event management,
- member management,
- document management,
- admin-only screens.

---

## Core Band Member

Must verify:
- all-event visibility,
- availability updates,
- documents access,
- notifications.

---

## Dep User

Must verify:
- assigned-event visibility only,
- restricted permissions,
- notifications.

---

## Crew User

Must verify:
- correct visibility rules,
- restricted permissions,
- event access behaviour.

---

# 1. Authentication Testing Matrix

## Login

| Test | Admin | Band | Dep | Crew |
|---|---|---|---|---|
| Valid login | [ ] | [ ] | [ ] | [ ] |
| Invalid password handling | [ ] | [ ] | [ ] | [ ] |
| Session persistence | [ ] | [ ] | [ ] | [ ] |
| Logout/login cycle | [ ] | [ ] | [ ] | [ ] |

---

## Password Reset

| Test | Required |
|---|---|
| Reset request works | [ ] |
| Email/passcode received | [ ] |
| Callback/deep link works | [ ] |
| New password accepted | [ ] |
| User can log back in | [ ] |

---

## Invite Flow

| Test | Required |
|---|---|
| Admin can invite user | [ ] |
| Invite email received | [ ] |
| User onboarding works | [ ] |
| New account created correctly | [ ] |
| New user permissions correct | [ ] |

---

# 2. Event Testing Matrix

## Event Management

| Test | Admin |
|---|---|
| Create event | [ ] |
| Edit event | [ ] |
| Delete event | [ ] |
| Cancel event | [ ] |

---

## Event Visibility

| Test | Admin | Band | Dep | Crew |
|---|---|---|---|---|
| Correct events visible | [ ] | [ ] | [ ] | [ ] |
| Restricted events hidden | [ ] | [ ] | [ ] | [ ] |
| Assigned-event logic correct | [ ] | [ ] | [ ] | [ ] |

---

## Event UI

| Test | Required |
|---|---|
| Event list loads | [ ] |
| Event details load | [ ] |
| Calendar loads | [ ] |
| Navigation stable | [ ] |
| No crashes | [ ] |

---

# 3. Availability Testing Matrix

## Availability Status Updates

| Test | Band | Dep |
|---|---|---|
| Available saves | [ ] | [ ] |
| Provisional saves | [ ] | [ ] |
| Unavailable saves | [ ] | [ ] |
| Awaiting behaves correctly | [ ] | [ ] |

---

## Availability Logic

| Test | Required |
|---|---|
| Readiness indicators correct | [ ] |
| Dep substitution logic correct | [ ] |
| Availability summaries correct | [ ] |
| Conflict indicators correct | [ ] |

---

# 4. Member Unavailability Testing Matrix

| Test | Admin | Band |
|---|---|---|
| Add unavailable period | [ ] | [ ] |
| Edit unavailable period | [ ] | [ ] |
| Delete unavailable period | [ ] | [ ] |
| Calendar display correct | [ ] | [ ] |

---

## Admin Reporting

| Test | Admin |
|---|---|
| Year summary/export works | [ ] |
| Share functionality works | [ ] |

---

# 5. Documents Testing Matrix

## Band Documents

| Test | Admin | Band |
|---|---|---|
| Upload works | [ ] | [ ] |
| Download works | [ ] | [ ] |
| Delete works | [ ] | [ ] |

---

## Event Documents

| Test | Admin | Band | Dep | Crew |
|---|---|---|---|---|
| Upload works | [ ] | [ ] | [ ] | [ ] |
| Download works | [ ] | [ ] | [ ] | [ ] |
| Visibility correct | [ ] | [ ] | [ ] | [ ] |

---

# 6. Push Notification Testing Matrix

## Notification Delivery

| Test | Required |
|---|---|
| Notifications sent | [ ] |
| Notifications received | [ ] |
| No duplicates | [ ] |
| Correct users targeted | [ ] |

---

## Notification Types

| Notification | Required |
|---|---|
| New event | [ ] |
| Event updated | [ ] |
| Availability request | [ ] |
| Event cancelled | [ ] |

---

## Notification Navigation

| Test | Required |
|---|---|
| Tap opens correct event | [ ] |
| App handles background open | [ ] |
| App handles closed-state open | [ ] |

---

# 7. Admin Function Testing Matrix

| Test | Admin |
|---|---|
| Add member | [ ] |
| Edit member | [ ] |
| Deactivate member | [ ] |
| Admin-only screens protected | [ ] |
| Permissions enforced | [ ] |

---

# 8. RLS / Security Testing Matrix

## Non-Admin Restrictions

| Restriction | Required |
|---|---|
| Cannot edit other users | [ ] |
| Cannot access admin screens | [ ] |
| Cannot access restricted finance data | [ ] |
| Cannot bypass event visibility | [ ] |

---

## Admin Permissions

| Permission | Required |
|---|---|
| Full event access | [ ] |
| Full member management | [ ] |
| Full document management | [ ] |
| Availability management | [ ] |

---

## Supabase Verification

| Check | Required |
|---|---|
| No RLS recursion errors | [ ] |
| No auth failures | [ ] |
| No edge function failures | [ ] |
| No visibility leaks | [ ] |

---

# 9. Build Verification Matrix

## iOS

| Test | Required |
|---|---|
| Build installs | [ ] |
| App launches | [ ] |
| Login works | [ ] |
| Notifications permissions work | [ ] |
| Push notifications received | [ ] |
| Deep links work | [ ] |

---

## Android

| Test | Required |
|---|---|
| Build installs | [ ] |
| App launches | [ ] |
| Login works | [ ] |
| Notifications permissions work | [ ] |
| Push notifications received | [ ] |
| No major UI regressions | [ ] |

---

# 10. Release Blocking Conditions

Release must NOT proceed if any of the following occur:

- login failure,
- password reset failure,
- RLS/security regression,
- event visibility leak,
- notification spam,
- production environment misconfiguration,
- data corruption risk,
- major crash loop,
- broken onboarding flow.

---

# 11. Recommended Testing Order

Recommended sequence:

1. Authentication
2. Event visibility
3. Availability
4. Notifications
5. Documents
6. Admin functions
7. RLS/security verification
8. Final device testing

This order prioritises highest-risk systems first.

---

# 12. Future Expansion

This matrix must expand as new systems are added.

Future additions likely include:
- payments,
- calendar sync,
- messaging,
- finance workflows,
- advanced notifications,
- multi-band support,
- external integrations.

Every new major feature should add:
- happy path tests,
- permissions tests,
- failure-state tests,
- regression checks.
