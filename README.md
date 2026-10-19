# GreenLink Melbourne

A Vue application for finding volunteer activities, booking places and managing participation.

Public website: [GreenLink Melbourne](https://projectgreenlink-b2380.web.app).

## Run locally

```bash
npm install
npm run dev
```

Build with `npm run build`; view the production build locally with `npm run preview`.

## Configuration

The Firebase project is `projectgreenlink-b2380`. Local frontend configuration is in the Git-ignored `.env.local` file. Its variables are `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` and `VITE_GOOGLE_MAPS_API_KEY`.

The Google Maps browser key needs website and API restrictions for Maps JavaScript, Geocoding and Routes. Maps billing follows the Firebase project's linked Google Cloud billing account.

The email sender address is configured as `SENDGRID_FROM_EMAIL` in `functions/.env`. `SENDGRID_API_KEY` is stored in Firebase Secret Manager. The sender must be verified in SendGrid. An accepted email can still be rejected by the receiving mail server; check SendGrid activity for delivery status.

## Features

- Firebase email/password authentication and protected Volunteer, Coordinator and Administrator roles.
- Coordinator applications, administrator approval and activity publishing/management.
- Real Firestore activities, bookings, attendance and completed volunteer hours.
- Activity calendar, booking capacity limits and server-side protection against overlapping bookings.
- Community ratings for completed activities with recorded attendance.
- Google Maps address search, nearby activity filtering and journey planning.
- Attachment emails through SendGrid, with server-side validation and sending limits.
- Interactive tables with sorting, global/column search and ten records per page.
- CSV and PDF exports of all matching activity/history rows, including Chinese text and multi-page PDF reports.
- Keyboard navigation, visible focus, form error associations, responsive layouts and text alternatives.

Published activities are stored in Firestore and managed by Coordinators or Administrators. The website reads them from the database.

## Deployment

Publish the backend and Firestore access rules when they change:

```bash
firebase deploy --only functions:email,firestore:rules --project projectgreenlink-b2380
```

Publish the website:

```bash
firebase deploy --only hosting --project projectgreenlink-b2380
```

Hosting runs the production build, serves `dist` over HTTPS and supports client-side routes. Cloud Functions use Node.js 22 in `australia-southeast2`.

The PDF font is included in `src/assets/fonts/GreenLinkSans-Regular.ttf`; its required license is retained in `src/assets/fonts/OFL.txt`.
