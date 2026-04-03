# YourSeha implementation notes

This package is the production-oriented Supabase version of the uploaded Base44 prototype and follows the requested caregiver / psychologist platform scope.

## What is now implemented

- React + Vite frontend connected to Supabase auth, database, storage, and realtime-ready queries.
- Direct caregiver and psychologist signup.
- Login-required product access for the main app experience.
- Psychologist directory synced from profile data.
- Database-backed psychologist availability slots.
- Caregiver booking flow with **Zoom-first** appointments.
- Appointment records now store the selected slot, quoted session price, and meeting provider.
- Psychologists can save a Zoom link from their dashboard and caregivers can join from their appointment page.
- Cancellation now releases the booked availability slot.
- Daily check-in, journaling, chat, community, and filtered resources remain connected to Supabase.
- Emergency page and disclaimer updated with Qatar support contacts.
- Legal / about / contact pages switched to placeholder launch copy.

## Owner decisions applied

1. Video appointments use **Zoom**.
2. Psychologists can **sign up directly**.
3. **No online payment** for now — users see the price and confirm the booking only.
4. Main product areas now **require login**.
5. Emergency content updated with Qatar contacts.
6. Legal and company information remain as **placeholder text** for now.

## Database changes

Fresh installs:
- Run `supabase/schema.sql`

Existing installs from the earlier patched package:
- Run `supabase/migrations/20260402_booking_updates.sql`

That migration adds:
- `appointments.availability_slot_id`
- `appointments.meeting_provider`
- `appointments.quoted_price`
- updated appointment RLS so psychologists can manage their own booked sessions

## Deployment

1. Run the appropriate SQL file(s) in Supabase.
2. Add `.env` values from `.env.example`.
3. Create the `uploads` storage bucket.
4. Deploy frontend to Vercel.
5. Replace demo psychologists with real onboarded psychologist accounts.
