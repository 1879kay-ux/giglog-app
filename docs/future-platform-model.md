# GigSynq Future Platform Model

## Current Model

bands
→ band_members
→ events
→ event_members
→ event_availability

---

## Planned Evolution

organisation
→ acts
→ act_members
→ clients
→ events
→ event_members
→ event_availability
→ finance
→ payments

---

## Key Concepts

### Organisation
Top-level owner/account structure.

Likely evolution of current bands table.

### Acts
Individual performing acts/projects within an organisation.

Examples:
- Wedding band
- Acoustic duo
- Tribute act
- Session team

### Clients
Entities booking acts/events.

Examples:
- Venue
- Promoter
- Corporate client
- Wedding client

### Events
Linked to:
- organisation
- act
- client

### Members
Can belong to multiple acts.

### Session Musicians / Deps
Can move between acts dynamically.

---

## Long-Term Goals

Multi-act support  
Multi-client support  
Multilingual UI  
Finance tracking  
Ryft payments  
Member payouts  
Client portals  
Touring workflows
