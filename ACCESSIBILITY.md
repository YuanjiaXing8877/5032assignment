# Accessibility implementation and verification

Updated 19 October 2026. The interface uses navy, white cards, a pale-green page background and a warm-grey header. This document records the implemented features and verification scope; it is not a full WCAG conformance certification.

## Implemented features

- Each route has one main content area, a descriptive page title, a heading hierarchy and a keyboard-visible **Skip to main content** link. Page navigation moves focus to the new heading; section links move focus to their destination. Current navigation sections are exposed with `aria-current`.
- Buttons, links, fields, native selects and expandable details support keyboard access. A visible focus outline applies throughout. The mobile menu exposes its expanded state, closes with Escape and returns focus to its toggle.
- Login, registration and personal-information forms have visible labels. Registration errors are connected to their fields with `aria-describedby` and `aria-invalid`; invalid submissions focus the first error. Inputs collecting common personal details expose autocomplete purposes.
- Opening and closing editors and participant lists moves or restores focus. Booking actions retain focus when the action button changes. Administration review returns focus to the member's role control. Dynamic feedback uses status or alert semantics.
- Data tables have captions, column headers, announced sort direction, individually labelled searches and named pagination. Their scroll regions can be reached using the keyboard. Two-dimensional table content scrolls inside its own region rather than widening the page.
- The rating editor implements a radio group with one tab stop, arrow-key wrapping, Home/End support and accessible score names. Space/Enter use native button activation. Saving returns focus to the selected score. Filled stars and the selected underline provide visual state cues; accessible names and checked states expose the same information.
- Decorative icons are hidden from assistive technology. Logos retain their visible accessible name. Ratings also have a numerical/text summary.
- The map has a parallel list of destinations, meeting-address text, travel-mode controls and route distance/time text. Results can be selected without using map gestures. Search selection and route completion move focus to useful controls or the route summary. An explicit link opens the chosen journey in Google Maps. Periodic activity-status refreshes retain an unchanged route so its summary does not disappear while being read.
- Layouts support 320 CSS-pixel reflow, enlarged text and increased text spacing. Reduced-motion preferences suppress optional scrolling and transitions. Forced-colour mode preserves visible focus and selected rating borders.

## Contrast

Normal text colours are tested against white, the light blue surface, the page background and the warm-grey header. Primary button text is white on navy. Controls have darker boundaries; decorative separators are not treated as control boundaries.

| Pair | Approximate ratio |
| --- | ---: |
| Navy `#234e70` / white | 8.77:1 |
| Secondary text `#566273` / white | 6.19:1 |
| Error text `#a1262f` / white | 7.41:1 |
| Control border `#737f8d` / white | 4.08:1 |
| Rating star `#8a5700` / white | 6.10:1 |

`npm run test:accessibility` checks the palette against the normal-text 4.5:1 threshold and control/focus 3:1 threshold, rating keyboard behaviour and directions URLs. The rendered interface was also checked with axe-core 4.14.0, including error messages from the component library.

## Verification performed

The JSON evidence in `reports/accessibility/` contains 19 saved page/state checks. All have zero automatically detected violations under the selected WCAG 2.0 A/AA, WCAG 2.1 A/AA and best-practice rule tags. These checks covered login, registration errors, volunteer and coordinator accounts, personal-information editing, the activity editor and participant roster, administration, email, access denial, and the live map/route flow.

Keyboard checks covered skip navigation, login and registration errors, page-heading focus, profile editor focus/return, rating arrow keys/End/Tab/submission, participant-list focus, administration review, mobile menu Escape handling and choosing a starting address/destination/route without a mouse. A computed route remained available after a 70-second reading interval spanning the activity refresh timer.

At 320 CSS pixels, the checked login, registration, account, email and map pages did not create horizontal page overflow. Login, registration, account, email and map were also checked with simulated 200% text size and WCAG text-spacing overrides simultaneously. This simulation does not replace native browser zoom testing.

Tests used isolated local Firebase emulators and disposable accounts, including a completed attendance fixture for rating checks. No production user bookings, attendance, ratings or roles were changed by these tests. The audit controls and axe-core are available only in development (`?audit=1`) and are excluded from production output.

## Remaining manual verification

An automated zero-violation result is not a declaration of full AA conformance. Some reports include `incomplete` items requiring human review. They primarily concern cells clipped by intentional horizontal table scrolling, icon-only glyph contrast and third-party Google Maps controls. The application palette, text alternatives, focus states and scroll access were reviewed; operating-system and third-party rendering still require assistive-technology checks.

Before making a full conformance claim, complete a VoiceOver/Safari and NVDA/Chrome pass through the principal workflows, native browser zoom tests at 200%/400%, OS high-contrast/reduced-motion checks and a review of the Google Maps widget and external directions experience. No screen-reader certification is claimed here.

## Repeating the checks

1. Run `npm run test:accessibility` and `npm run build`.
2. Start the isolated Firebase emulators using `firebase.emulators.json` and the local dummy email secret described in README.
3. Seed local UI data with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node functions/test-support/seed-ui.mjs --activities --accessibility`.
4. Run Vite with the emulator environment, open a page with `?audit=1` and use **Run accessibility checks**. The optional double-text and text-spacing controls affect only the test tab. Do not use production user accounts to populate fixtures.
5. Record both automatic results and unresolved manual items. Restore viewport and text overrides after checking.

References: [WCAG 2.1 conformance](https://www.w3.org/TR/WCAG21/#conformance-reqs), [contrast requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [radio-group keyboard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), [Google Maps directions URLs](https://developers.google.com/maps/documentation/urls/get-started#directions).
