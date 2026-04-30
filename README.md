# CanchaBGA Padel

Prototype web app for padel club discovery, online booking, club admin agenda, and super admin club management.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Convex development:

```bash
npx convex dev
npx convex run seed:seedDemoData
```

Mercado Pago development also needs server-only variables in `.env.local`:

```bash
MERCADOPAGO_APP_ID=
MERCADOPAGO_CLIENT_ID=
MERCADOPAGO_CLIENT_SECRET=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_ENV=sandbox
APP_BASE_URL=http://localhost:3000
MP_TOKEN_ENCRYPTION_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
```

`MP_TOKEN_ENCRYPTION_KEY` must be a private random value. Mercado Pago seller
tokens are encrypted before being stored in Convex.
`MERCADOPAGO_WEBHOOK_SECRET` is the secret signature generated in Mercado Pago
Webhooks settings and is used to verify incoming payment notifications.

## Auth Bootstrap

Authentication uses Convex Auth with email/password.

Create these accounts through `/registro` first:

- `admin@canchabga.co` for the platform super admin.
- `recepcion@matchpointpadel.co` for the Match Point club master.
- `manuel@gmail.com` for a demo player.

After those users exist, assign demo roles:

```bash
npx convex run seed:seedDemoAccess
```

The super admin can then assign existing users as club masters from the club create/edit form.

## Validation

Before reporting changes:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
