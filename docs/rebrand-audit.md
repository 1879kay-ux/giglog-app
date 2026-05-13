# GigSynq Rebrand Audit Checklist

Purpose: track completion of GigLog -> GigSynq rebrand tasks across product, backend, distribution, and operations.

Status legend: Not started | In progress | Done | N/A

## App UI Text

- [ ] Audit and update all visible app copy

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| App UI text | Multiple GigSynq strings already present in app screens | All user-facing text uses GigSynq consistently | In progress | Run full string sweep for GigLog, Giglog, old product naming variants |
| In-app notification labels | New GigSynq event appears in app event creation flow | Keep or refine final approved wording | In progress | Confirm tone and capitalization standards |

## app.json / Expo Config

- [ ] Normalize Expo identity and platform identifiers

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Expo app name | GigSynq | GigSynq | Done | Already set |
| Expo slug | GigSynq | Final canonical slug (confirm case/format) | In progress | Confirm expected lowercase vs mixed case for release workflows |
| URL scheme | giglog | Keep existing unless future major migration is explicitly approved | Deferred | Changing scheme risks auth callback and deep link breakage |
| iOS bundle identifier | com.giglogtracker.app | Keep existing unless future major migration is explicitly approved | Deferred | Changing bundle ID risks App Store/TestFlight continuity and existing installs |
| Android package | com.giglogtracker.app | Keep existing unless future major migration is explicitly approved | Deferred | Changing package ID risks Play Store continuity and existing installs |

## Splash Screens And Icons

- [ ] Confirm brand assets and metadata are fully rebranded

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| App icon refs | app.json points to ./assets/icon.png (iOS/Android/plugins) | GigSynq final icon assets and naming | In progress | Verify actual image content, not only file path |
| Splash image ref | app.json points to ./assets/images/splash-icon.png | GigSynq final splash asset | In progress | Verify rendered asset on both platforms |
| Favicon ref | app.json web.favicon set | GigSynq final web/favicon branding | In progress | Validate if web output is actively used |

## Deep Links And URL Schemes

- [ ] Align deep link scheme and callback URLs

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| App deep link scheme | giglog (app.json) | gigsynq (or approved canonical scheme) | Not started | Must stay in sync with auth redirect config |
| Invite redirect URL | giglog://auth/callback in invite edge function | gigsynq://auth/callback (or approved callback URL) | Not started | Update function, auth provider redirects, and app routing together |

## Supabase Auth Emails/Templates

- [ ] Rebrand all auth email content and sender presentation

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Auth email templates | Unknown in repo (managed in Supabase dashboard) | All templates use GigSynq naming and voice | Not started | Check invite, magic link, password reset, confirmation templates |
| Auth links in templates | Unknown in repo | Updated GigSynq scheme/domain redirects | Not started | Ensure template links match approved deep link/domain strategy |

## Push Notification Wording

- [ ] Standardize push copy and fallback values

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Push title fallback | GigSynq in send-push-notification function | Approved brand-consistent title | In progress | Keep fallback aligned with product naming style guide |
| Push body fallback | Notification | Approved default body copy | Not started | Define baseline wording and localization readiness |

## Storage Bucket Names

- [ ] Decide rename strategy for bucket identifiers

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Logo bucket | band-logos | Keep or rename per final convention | In progress | Renaming buckets can require object path migrations and policy updates |
| Band docs bucket | band-docs | Keep or rename per final convention | In progress | If renamed, update policies, table defaults, and clients |
| Event docs bucket | event-docs | Keep or rename per final convention | In progress | If renamed, include signed URL and upload path regression checks |

## Database Values Referencing GigLog

- [ ] Find and remediate persisted legacy brand strings

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Persisted DB values | live-data export contains user-agent strings like Giglog/3 and Giglog/4 | New app versions report GigSynq naming | In progress | Historical rows usually retained; focus on future writes and analytics filters |
| Brand strings in content fields | Not confirmed globally from repository alone | No new rows written with GigLog naming | Not started | Run targeted SQL search over relevant text columns in live data |

## Edge Functions

- [ ] Rebrand edge-function behavior and references

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| invite-band-member | Uses giglog://auth/callback redirect | Updated GigSynq callback and messaging | Not started | Validate invite flow end-to-end after update |
| send-push-notification | Defaults include GigSynq title | Confirm final push defaults and copy | In progress | Ensure no fallback copy references GigLog |
| get-doc-signed-url | Function exists | No GigLog references in paths/messages | Not started | Audit response payload text and any hardcoded labels |

## Legal/Policy URLs

- [ ] Confirm all legal endpoints and links are rebranded

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Privacy policy URL | Not found in repository config | Final GigSynq privacy URL | Not started | Also verify in store listings and website footer |
| Terms URL | Not found in repository config | Final GigSynq terms URL | Not started | Align with domain/redirect decisions |

## App Store Metadata (Apple)

- [ ] Rebrand App Store Connect listing content

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| App name/subtitle/description | Not tracked in repo | GigSynq branding across listing text | Not started | Update keywords, promotional text, and screenshots |
| Support/marketing URLs | Not tracked in repo | GigSynq URLs and contact points | Not started | Confirm all locale variants |

## Google Play Metadata

- [ ] Rebrand Play Console listing content

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| App title/short/full description | Not tracked in repo | GigSynq branding across listing text | Not started | Include feature graphic and screenshot refresh |
| Support/contact details | Not tracked in repo | GigSynq support identity and links | Not started | Validate policy and contact email fields |

## Domains And Redirects

- [ ] Validate web/domain routing and backward compatibility

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Canonical product domain | Not defined in repo | Final GigSynq canonical domain | Not started | Define ownership, SSL, and monitoring |
| Legacy redirects | Not defined in repo | Redirect old GigLog endpoints to GigSynq equivalents | Not started | Include deep link redirect mapping |

## Email Sender Names

- [ ] Rebrand outbound sender identity

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Auth/invite sender name | Not defined in repo (provider/dashboard-managed) | GigSynq sender display name | Not started | Verify SPF/DKIM/DMARC and reply handling |
| No-reply/support sender aliases | Not defined in repo | GigSynq-approved aliases | Not started | Align with support/contact strategy |

## Support/Contact References

- [ ] Align all support channels and references

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| In-app support references | No explicit support URL/contact found in repo scan | Approved GigSynq support channel references | Not started | Add support entry points if required |
| Public support endpoints | Not defined in repo | Final support email/form/help center links | Not started | Must match store metadata and legal pages |

## Internal Docs

- [ ] Ensure internal documentation is fully rebranded

| Area | Current value (if known) | Target value | Status | Notes |
|---|---|---|---|---|
| Docs naming | Recent docs already use GigSynq titles | All docs use GigSynq and no GigLog leftovers | In progress | Run periodic grep across docs and migration notes |
| Operational runbooks | Coverage unknown | Rebrand runbooks, onboarding docs, release playbooks | Not started | Include screenshots and copy examples where needed |

## Suggested Execution Order

- [ ] Freeze canonical identifiers first (scheme, bundle/package IDs, domain).
- [ ] Update app config and deep links.
- [ ] Update Supabase auth templates and sender identity.
- [ ] Update edge functions and push copy.
- [ ] Update store metadata and legal/support endpoints.
- [ ] Run final grep audit for GigLog and sign off.
