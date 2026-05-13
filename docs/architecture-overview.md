# GigSynq Architecture Overview

## Core Structure

bands
→ band_members
→ events
→ event_members
→ event_availability

---

## Core Tables

### bands
Top-level organisation record.

### band_members
Stores members/users belonging to a band.

### events
Stores gigs/events and logistics.

### event_members
Stores assigned lineup members for each event.

### event_availability
Stores availability status per member per event.

### venues
Stores venue information.

### push_tokens
Stores Expo push notification tokens.

---

## Notes

Current architecture is event-centric.

Future planned additions:
- acts
- clients
- finance expansion
- Ryft integration
- multilingual support
