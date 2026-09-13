# GreenLink Melbourne - Authentication and role-based access

This Vue application contains registration, login, user accounts and role-protected pages based on the GreenLink Melbourne proposal.

## Run locally

```bash
npm install
npm run dev
```

## Firebase setup

The application is connected to the `projectgreenlink-b2380` Firebase project. Local Firebase values are stored in the Git-ignored `.env.local`; `.env.example` documents the required variables.

In Firebase Console, enable **Authentication → Sign-in method → Email/Password** before registering users. Firestore is configured in the Melbourne region and its role rules are stored in `firestore.rules`.

New users can register as a Volunteer or apply for Coordinator access. Coordinator applications retain the Volunteer role with a `Pending` status until an Administrator approves them. To create the first Administrator, register normally and then change that user's `role` field in the Firestore `users` document to `Administrator`. After that, roles can be managed from the Administrator dashboard. This prevents public users from granting themselves staff privileges.

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

- Completed activities provide an accessible 1–5 star rating control
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
- Personal information table and sortable PrimeVue DataTable activity history
- Summary values computed from the activity data
- Responsive layouts for phone, tablet, desktop and wide screens using Bootstrap breakpoints

## Security note

Vue Router guards control page navigation, while Firestore Security Rules protect role data independently of the interface. Public registration can only create a Volunteer profile, members cannot change their own role, and Administrator accounts can manage user documents. For a larger production system, privileged roles should additionally be issued as Firebase custom claims from a trusted server environment.
