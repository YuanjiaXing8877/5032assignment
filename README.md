# GreenLink Melbourne - Authentication and role-based access

This Vue application contains registration, login, volunteer bookings, coordinator activity management and role-protected pages based on the GreenLink Melbourne proposal.

## Run locally

Public deployment: [GreenLink Melbourne](https://projectgreenlink-b2380.web.app).

To publish activity backend or permission changes, first run `firebase deploy --only functions:email:manageActivity,firestore:rules --project projectgreenlink-b2380`. Then run `firebase deploy --only hosting --project projectgreenlink-b2380`. Hosting builds the app before uploading `dist`, serves it over HTTPS, and rewrites client-side routes to `index.html`. HTML is revalidated on each visit; hashed assets use long-lived caching. Backend secrets and environment files are excluded from Hosting.

Deployment checks confirmed that the public login page renders, protected routes redirect signed-out visitors to login, and client-side routes return HTTP 200. Authenticated coordinator application, approval, publishing and booking workflows were also checked in the local Firebase emulators. Public authenticated workflows require a real member account. SendGrid accepted messages can still be rejected by recipient servers until the sender domain authentication issue described during setup is resolved.

```bash
npm install
npm run dev
```

## Firebase setup

The application is connected to the `projectgreenlink-b2380` Firebase project. Local Firebase values are stored in the Git-ignored `.env.local`; `.env.example` documents the required variables.

In Firebase Console, enable **Authentication → Sign-in method → Email/Password** before registering users. Firestore is configured in the Melbourne region and its role rules are stored in `firestore.rules`.

New users can register as a Volunteer or apply for Coordinator access. Existing volunteers can also apply from **My account → Become a coordinator**. Applications retain the Volunteer role with a `Pending` status until an Administrator approves them. To create the first Administrator, register normally and then change that user's `role` field in the Firestore `users` document to `Administrator`. After that, roles can be managed from the Administrator dashboard. This prevents public users from granting themselves staff privileges.

## Coordinator applications and activities

1. A Volunteer opens **My account** (`/profile`) and clicks **Apply to be a coordinator**. The application shows as pending while Volunteer access remains available.
2. An Administrator opens **Administration → Manage user roles**, refreshes the user list and chooses **Approve** or **Decline**. A declined applicant can apply again.
3. The member's existing account page updates live to display **Coordinator** and **Manage your activities**. Coordinator tools are embedded in the same account page; browsing, booking and activity history remain available.
4. The Coordinator creates an activity with its title, description, start/end in Melbourne time, capacity, suburb and a Google-searched meeting address. Published activities become available immediately in the activity list and map. The map and history use Firestore activities and bookings rather than demonstration records. A new deployment starts with an empty list until a coordinator publishes an activity.
5. Coordinators can edit or cancel their own future activities and view their participants. An Administrator can manage all activities. Participants can book or withdraw before the start, subject to capacity. Cancelled activities stay visible in their history.
6. Once an activity starts, its Coordinator can record attendance. Completed, attended activities contribute volunteer hours and allow ratings. A booking alone does not qualify for a completion rating.

Activity mutations use the `manageActivity` callable function in `australia-southeast2`. Each transaction rechecks the caller's stored role, ownership, activity time and capacity. Concurrent last-place requests cannot overbook; repeated bookings are idempotent. Version checks protect edits from overwriting intervening changes. Firestore rules deny direct client writes to activities and bookings, and limit participant lists to the member, responsible Coordinator and Administrators. Personal booking mirrors are visible only to their owner.

`npm --prefix functions test` runs activity validation/time-zone and email unit tests. `npm run test:activities:integration` starts the isolated `demo-greenlink` emulators and checks approval permissions, ownership, concurrent bookings, roster privacy, attendance, verified ratings, cancellation and role revocation. It requires Java and the Firebase CLI. To avoid attempting to read a real email secret locally, create ignored `functions/.secret.local` with a dummy `SENDGRID_API_KEY=local-test-only-not-a-real-key` before running the emulators. No production records are used. The optional `functions/test-support/seed-ui.mjs` fixture also refuses to run without local emulator hosts.

## BR C.1 Authentication

- Register and log in with validated email/password fields
- Passwords handled by Firebase Authentication and never stored by this application
- Firebase session persistence ends when the browser session closes
- Duplicate-account and invalid-credential errors
- Log out action and protected personal account route

## BR C.2 Role-based authentication

- Three proposal-aligned roles: Volunteer, Coordinator and Administrator
- Route metadata defines required authentication and allowed roles
- A global navigation guard redirects unauthenticated users to login
- `/admin` is restricted to Administrator accounts
- Authenticated users without the required role see an access-denied page
- Navigation only displays the Administration link to administrators
- Administrators can review all Firebase user profiles and approve or change roles
- Administrators cannot change their own role from the dashboard

## BR C.3 Rating

- Completed activities with recorded attendance provide an accessible 1–5 star rating control
- Each user has one Firestore rating document per activity and can update it
- All signed-in users see a live aggregate average and rating count
- Submission, loading and error feedback are shown next to the rating control
- Firestore rules validate ownership, document shape and the 1–5 score range

## BR C.4 Security

- Firebase Authentication handles passwords outside the application
- Firestore rules enforce ownership, valid roles, approval states and rating ranges
- A shared sanitisation utility normalises text, removes control characters and angle brackets, collapses abnormal whitespace and applies length limits
- Registration, login, profile and rating write paths sanitise relevant text before validation or storage
- Passwords are validated exactly as entered and are never silently modified
- Vue interpolation is used for user content; the application does not use `v-html`

## Other included features

- Vue Router navigation between login and profile views
- PrimeVue components with the Aura theme and PrimeIcons
- Bootstrap 5 grid, navbar, spacing, display and responsive table utilities
- Built-in HTML validation using required, email, minlength, maxlength and pattern
- Custom JavaScript validation with field-level feedback
- Vue events using @submit.prevent, @blur, @input and @click
- Two-way form binding using v-model
- Show and hide password interaction
- Editable personal information with field-level validation
- Personal information table and searchable, sortable, paginated activity history
- Summary values computed from the activity data
- Responsive layouts for phone, tablet, desktop and wide screens using Bootstrap breakpoints

## Security note

Vue Router guards control page navigation, while Firestore Security Rules protect role data independently of the interface. Public registration can only create a Volunteer profile, members cannot change their own role, and Administrator accounts can manage user documents. For a larger production system, privileged roles should additionally be issued as Firebase custom claims from a trusted server environment.
# Attachment emails

Signed-in members can open **Send email** to send a message with one to five attachments (5 MB combined). The server uses SendGrid and the member's authenticated email as Reply-To. Each account is limited to one attempt per minute and 20 attempts per UTC day, including failed attempts. Attachment data is forwarded to SendGrid without being stored in Firestore. A successful response means SendGrid accepted the email, rather than confirming inbox delivery.

Setup:

1. Enable Firebase's Blaze plan for Cloud Functions and ensure Firestore is available.
2. In SendGrid, verify a sender address and create an API key with Mail Send permission.
3. Run `npm --prefix functions install`.
4. Copy `functions/.env.example` to `functions/.env` and set `SENDGRID_FROM_EMAIL` to the verified sender address.
5. Run `firebase functions:secrets:set SENDGRID_API_KEY` and enter the key at the prompt. Keep it out of frontend environment variables.
6. Run `firebase deploy --only functions:email:sendEmail --project projectgreenlink-b2380` for the project's Firebase project. The function and client both use `australia-southeast2`.
7. Start the app with `npm run dev`, sign in, open **Send email**, and send a small attachment to an inbox you control. Check the received attachment and Reply-To address.

Run `npm --prefix functions test` to verify attachment validation and mocked provider responses. Real delivery requires the configuration and deployment above.

References: [SendGrid Mail Send API](https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send), [Firebase callable functions](https://firebase.google.com/docs/functions/callable).


## Interactive tables

Activity history (`/profile`) and the user accounts, role permissions and project overview tables (`/admin`, Administrator access) support global search, individual column searches, ascending/descending sorting and fixed pagination of 10 rows. Column searches combine with each other and the global search. Searching and sorting return to page one. Action controls and the embedded community rating widget are not searchable data columns. On small screens the tables scroll horizontally while retaining the same controls.

Run `npm run test:tables` for search, date/number sorting and pagination checks. To demonstrate pagination, use more than 10 records; existing short datasets correctly show a single page. In browser checks, a temporary 23-row fixture verified independent table state, next-page navigation, combined column searches and reverse numeric sorting. No fixture records are stored in the application or Firebase.

## Activity map and journey planning

Signed-in members can open **Find activities** (`/activities/map`). It includes two location features: Australian address search with nearby activity filtering and distance sorting, and real road/path route planning with walking, cycling and driving options. Google provides the route geometry, distance and estimated duration. Nearby radius distances are calculated locally as straight-line estimates.

Meeting points come from published coordinator activities in Firestore. Coordinators search Google for an Australian address and select its coordinates when publishing. The map includes a link to **My account → Browse activities** for bookings.

### Google Maps configuration

- Use the existing Firebase/Google Cloud project `projectgreenlink-b2380`. Maps billing follows this project's linked Cloud Billing account, regardless of which project owner deploys.
- Enable Maps JavaScript API, Geocoding API and Routes API. Store a dedicated browser key as `VITE_GOOGLE_MAPS_API_KEY` in ignored `.env.local`. Browser map keys are necessarily visible to browsers; protect them using API and website restrictions rather than treating them as backend secrets. Never reuse the Firebase authentication key.
- The browser key allows only those three APIs and the two production Hosting domains plus localhost/127.0.0.1 port 5173.
- During setup the project quota limits for Map loads, v3 geocoding and ComputeRoutes were each set to 100/day and 10/minute. Unused 3D/grounding, v4 geocoding and route matrix quotas were set to zero. These are project-wide limits; review them if another app later shares this project. Free allowances and prices remain subject to Google's terms, billing-account-wide usage and the actual SKU triggered. A budget alert is not a spending cap.
- Maps load when the map is opened or a coordinator searches for a meeting address. Geocoding and routing happen only after explicit user actions, with only required route fields requested. Driving requests use traffic-unaware routing.
- Optional browser location access is requested only after clicking **Use my location**. Users can instead enter an address. Starting addresses/coordinates are sent to Google for the selected action, held only in page state, and not written to Firestore.
- `npm run test:geo` tests distance calculations, combined filters, nearest-first ordering, route request modes and time formatting. Browser checks verified address search, real walking/cycling/driving routes, radius filtering, empty results, stale route removal and a 390px layout without horizontal overflow. Location permission denial requires a manual browser permission check.

References: [Google Maps JavaScript loader](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [Routes library](https://developers.google.com/maps/documentation/javascript/routes/start), [Geocoding](https://developers.google.com/maps/documentation/javascript/geocoding).
