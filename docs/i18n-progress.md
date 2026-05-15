# GigSynq i18n Progress

## Status Key
- ✅ Completed
- 🟡 In Progress
- ⬜ Not Started
- ⚠️ Higher Risk / Later Phase

---

| Area | File | Status | Notes |
|---|---|---|---|
| i18n Foundation | lib/i18n.ts | ✅ | react-i18next + expo-localization configured |
| Language Files | locales/en.json | ✅ | English source language |
| Language Files | locales/es.json | ✅ | Initial Spanish translations added |
| Settings | app/settings/index.tsx | ✅ | English/Spanish tested |
| Travel Settings | app/settings/travel.tsx | ✅ | English/Spanish tested |
| Profile | app/profile/index.tsx | ✅ | English/Spanish tested |
| Unavailability | app/profile/unavailability.tsx | ✅ | English/Spanish tested |
| Language Selector | app/settings/index.tsx | 🟡 | Temporary buttons implemented; replace with modal/list selector later |
| Profile Language Persistence | Supabase profile language field | ⬜ | Future phase |
| Notifications | Supabase Edge Functions | ⬜ | Future phase |
| Email Templates | Auth + notification emails | ⬜ | Future phase |
| Date/Time Formatting | Global locale formatting | ⬜ | Future phase |
| Events List | app/events/index.tsx | ⬜ | Medium risk |
| Event Detail | app/events/[id].tsx | ⚠️ | Higher risk |
| Event Edit Screens | app/events/[id]/edit/* | ⚠️ | Higher risk |
| Availability Grid | app/events/AvailabilityGridModal.tsx | ⚠️ | Higher risk |
| Finance | app/events/[id]/edit/finance.tsx | ⚠️ | Higher risk |
| Documents | app/band-documents/* | ⬜ | Medium risk |
| Band Screens | app/band/* | ⬜ | Medium risk |

---

## Current Approach

- Incremental localisation only
- No large-scale refactors
- No business logic changes
- One screen/feature batch at a time
- English remains source-of-truth language
- Spanish translations generated with AI + human review workflow
- User-entered database content remains untranslated

---

## Notes

- Expo Go does not reliably support newly added native localisation modules.
- i18n testing is performed using dev builds.
- Translation keys use grouped namespaces:
  - settings.*
  - profile.*
  - events.*
  - availability.*
  - notifications.*