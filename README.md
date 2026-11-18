# PingMe preview build — consolidated update

Selected source baseline: homepage-update branch ZIP supplied by the owner.

## Added in this update
- `/account/` email OTP customer portal starter.
- Supabase migration to link a verified Auth user to a customer row by matching registered email.
- Customer default status in Admin registration set to `Inactive`.
- Admin credit RPC call aligned to the actual database function name `pingme_adjust_customer_credit`.

## Important setup sequence
1. Keep Cloudflare Pages production branch `main` unchanged. Deploy only to the preview branch.
2. Review and apply `supabase/migrations/20261118_customer_portal_link.sql` in Supabase SQL Editor after taking a backup.
3. Existing customer records must have a valid, unique email address before they can link an account.
4. Configure Supabase Auth email templates and Site URL / Redirect URLs to include the preview origin and `/account/`.
5. Do not expose server-side Supabase keys or WhatsApp/Resend secrets in frontend code.
6. The account portal is read-only for sensitive data. It requires the migration and RLS to be applied before it can display a linked customer record.

## Not yet production-ready
- Cloudflare Worker requires security review, restricted CORS, request throttling, private media handling, and atomic delivery-confirmed credit deduction.
- WhatsApp credit deduction currently occurs on Meta API acceptance, not confirmed delivery. Do not use this build for paid production traffic until fixed.
- Admin WhatsApp broadcast UI currently expects a Supabase Edge Function `pingme-send-message`; supplied Supabase screenshot showed no Edge Functions. The existing Cloudflare Worker does not implement that same broadcast endpoint.
- Customer portal does not yet provide profile editing, recharge checkout, orders, referrals or activity history.
- QR print export and other admin placeholders require implementation/testing.
