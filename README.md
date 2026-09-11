# GreenLink Melbourne - Authentication and role-based access

This Vue application contains registration, login, user accounts and role-protected pages based on the GreenLink Melbourne proposal.

## Run locally

```bash
npm install
npm run dev
```

## Demo accounts

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Volunteer | `volunteer@greenlink.test` | `Volunteer1!` | Personal account |
| Coordinator | `coordinator@greenlink.test` | `Coordinator1!` | Personal account; ready for coordinator pages |
| Administrator | `admin@greenlink.test` | `Administrator1!` | Personal account and administrator dashboard |

Newly registered accounts always receive the Volunteer role. This prevents a public user from granting themselves staff privileges.

## BR C.1 Authentication

- Register and log in with validated email/password fields
- Passwords stored as SHA-256 hashes rather than plain text
- Session held in `sessionStorage`, so closing the browser tab signs the user out
- Duplicate-account and invalid-credential errors
- Log out action and protected personal account route

## BR C.2 Role-based authentication

- Three proposal-aligned roles: Volunteer, Coordinator and Administrator
- Route metadata defines required authentication and allowed roles
- A global navigation guard redirects unauthenticated users to login
- `/admin` is restricted to Administrator accounts
- Authenticated users without the required role see an access-denied page
- Navigation only displays the Administration link to administrators

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

## Prototype security note

This iteration deliberately uses browser storage and is suitable for marking and local demonstration only. A production deployment should replace `src/services/auth.js` with Firebase Authentication and store trusted role claims on the server, as proposed in the design report. Client-side route guards improve the interface but cannot secure server data by themselves.
