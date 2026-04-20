# FEAT-018 — Admin: Communications Center (SMS)

## Intent

Give the owner a centralized SMS communication tool: send reminders, notify customers when their car is ready, and manage bulk SMS campaigns (ITV expiry reminders). Automated reminders (24h + 2h before appointment) fire via a PocketBase hook. The human-in-the-loop interface is the comms center.

## Acceptance Criteria

### SMS Center (`/admin/comms`)
1. [ ] "Enviar SMS" form: select customer(s), choose template or write custom message, preview, send
2. [ ] Template library: Recordatorio cita, Vehículo listo, Presupuesto enviado, ITV próxima a vencer
3. [ ] Bulk SMS: filter customers by ITV expiry (< 30 days) and send reminder to all
4. [ ] SMS log: all sent messages (to, message, status, timestamp)

### Automated Reminders
5. [ ] PocketBase hook (`pb_hooks/sms-reminders.pb.js`) fires daily at 08:00 and sends:
   - 24h reminder to all tomorrow's appointments with a phone number
   - 2h reminder at appointment time - 2h (real-time hook on `availability_slots` doesn't work — use daily cron + time window check)
6. [ ] Reminder includes reschedule link: `/reschedule/{token}` (short-lived JWT, 48h expiry)

### Reschedule Flow
7. [ ] `GET /reschedule/[token]` — public page showing available slots for the appointment's date ±3 days
8. [ ] Customer selects new slot → appointment rescheduled → owner gets notification SMS
9. [ ] Token validated server-side (not expired, correct appointment_id)

### Message Templates

```
recordatorio_cita:    "Hola {nombre}, recuerda tu cita en {taller} mañana {fecha} a las {hora}. Reprogramar: {link}"
vehiculo_listo:       "Hola {nombre}, tu vehículo {plate} ya está listo para recoger en {taller}. Horario: {hours}"
presupuesto_enviado:  "Hola {nombre}, hemos preparado tu presupuesto ({total}€). Revísalo: {link}"
itv_proximo:         "Hola {nombre}, la ITV de tu {plate} vence el {fecha}. ¿Reservamos revisión previa? {bookingLink}"
```

## Constraints

- **Twilio**: uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (ADR-006)
- **SMS log**: every sent SMS logged to `sms_log` collection
- **Opt-out**: SMS includes "Responde STOP para cancelar" (telemarketing law requirement)
- **Bulk cap**: max 50 SMS per bulk send (prevent abuse / unintended costs)
- **PB hook cron**: daily cron via PocketBase's built-in cron support
- **LOPDGDD**: only send marketing SMS to customers with `marketing_consent: true`

## Files to Touch

- `src/app/(admin)/admin/comms/page.tsx`
- `src/app/reschedule/[token]/page.tsx` — public reschedule page
- `src/core/components/admin/SmsComposer.tsx`
- `src/core/components/admin/SmsLog.tsx`
- `src/actions/admin/sms.ts` — new: `sendSms()`, `sendBulkSms()`, `sendReminderSms()`
- `src/actions/reschedule.ts` — new: `validateRescheduleToken()`, `rescheduleAppointment()`
- `pb_hooks/sms-reminders.pb.js` — new: daily cron hook
- `package.json` — add `twilio` dependency
