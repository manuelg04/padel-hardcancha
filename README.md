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
