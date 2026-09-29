# Enquiry form, email verification and data storage

## Design goal

Permanent D1 storage occurs only after the person controlling the submitted email address actively confirms the enquiry.

## Sequence

1. Browser submits name, email, company/role (optional), interest, message and consent.
2. Worker validates field lengths, required consent and Cloudflare Turnstile.
3. Worker does **not** insert the enquiry into D1.
4. Worker encrypts the form data into an authenticated AES-GCM token with a 24-hour expiry.
5. Resend receives the destination email address and sends a verification link containing only the opaque encrypted token.
6. Opening the link shows a confirmation page; it still does not write to D1.
7. The user presses a POST confirmation button.
8. Worker decrypts and validates the token.
9. Worker upserts the verified contact and inserts a verified enquiry.
10. Worker sends a confirmation email to the user and a notification to the business address.

## Why POST confirmation is used

Corporate email security systems sometimes open links automatically to scan them. Requiring an explicit form POST reduces the chance that a scanner will cause an enquiry to be stored as verified merely by following a URL.

## What is and is not validated

Validated:

- Turnstile response
- field format and length
- required consent
- ownership/access to the submitted email mailbox
- token authenticity and expiry

Not independently validated:

- whether the person's name is legally correct
- employer/company affiliation
- job title
- truth of free-text statements

## Third-party processing

The no-storage-before-verification rule refers to the ZenAI Digital D1 database. To deliver a verification email, the email provider necessarily processes the recipient email address. Review the provider's data-processing terms and disclose relevant service-provider use in the final privacy notice.

## Production checklist

- D1 binding is active
- schema has been applied
- Turnstile site key and secret are configured
- verification-token secret is long and random
- Resend domain is verified
- sender/from address is correct
- business notification email is correct
- privacy notice matches actual practices
- test expired, altered, reused and duplicate verification links
