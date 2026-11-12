# Sign-up and password reset emails

Supabase sends these emails. Two dashboard settings decide whether their links work.

## 1. URL configuration

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://bid-market-zeta.vercel.app` (the custom domain after launch)
- **Redirect URLs:** add `https://bid-market-zeta.vercel.app/**`

## Password reset works without template changes

Reset emails are sent with a link that carries the sign-in after a `#`, landing on `/reset-link`. It works in any browser, including the Gmail app, with Supabase's default template. If Supabase does not allow `/reset-link` as a return address, it sends the link to the home page, which passes it on to `/reset-link`.

## 2. Email templates (optional, recommended for sign-up)

Supabase → Authentication → Emails. In each template, replace the link's `href` and keep the rest of the text.

| Template | Link |
|---|---|
| Confirm signup | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding` |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` |

These links work on any device, so a reset requested on a computer can be opened on a phone.

## Limits

Supabase's built-in email sender allows only a few emails an hour and asks for a short wait between requests. If a link does not arrive, wait a minute and use only the newest email, because a new request cancels the older link. For launch, set up custom SMTP (for example Resend) under Authentication → Emails → SMTP.
