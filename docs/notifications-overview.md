# GigSynq Notifications Overview

## Current Push Notifications

### Event Created
Sent when a new event is added.

Recipients:
- Relevant members

### Event Updated
Sent when key event details change.

Recipients:
- Relevant members

### Availability Required
Sent when members need to respond to availability requests.

Recipients:
- Relevant members

---

## Current Notification Infrastructure

Expo Push Notifications

Supabase Edge Function:
send-push-notification

Table:
push_tokens

---

## Development Environment Rules

Dev Supabase project only sends notifications to Ian.

Live project sends notifications normally.

---

## Future Notification Types

Event cancelled  
Document added  
Accommodation updated  
Finance/payment updates  
Ryft payout status  
Client notifications  
Reminder notifications