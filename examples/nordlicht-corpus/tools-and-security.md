# Tools and security

## Required accounts

Every team member gets:

- Google Workspace (email + Drive)
- GitHub (org seat)
- Linear (product tracking)
- 1Password (shared vaults)

AI tooling (Cursor, ChatGPT Team) is available on request via `#it`.

## Secrets

Never commit API keys, tokens, or `.env` files. Use 1Password for shared secrets and Vercel / GitHub Actions secrets for deploy-time config.

If you accidentally commit a secret, rotate it immediately and message `#security`. Do not wait for review.

## Data handling

Customer data stays in EU regions unless a signed DPA says otherwise. Do not paste customer documents into consumer AI chat products. Use the approved company workspace accounts.

## Devices

Company laptops must have disk encryption and automatic lock after five minutes. Personal devices may access email and Slack only through the approved browser profiles — no cloning private repos onto unmanaged machines without IT approval.
