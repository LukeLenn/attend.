# attend.

Guided attention training for iPhone. A spoken guide moves you around a generated, spatial soundscape: one sound at a time, rapid switching, then everything at once. Before and after ratings and a long-term practice log.

## Run it on your phone

The audio engine is a native module, so Expo Go can't run this app. Use a development build:

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init            # links the project to your Expo account
npx eas-cli@latest build --profile development --platform ios
```

Install the build on your iPhone from the link EAS gives you, then:

```bash
npm start
```

Scan the QR code with the camera and the dev build opens it.

## Ship to the App Store

1. Check `ios.bundleIdentifier` in `app.json` (`com.attendapp.ios` for now) and create the app in App Store Connect with the same ID.
2. Put the privacy policy (`legal/privacy-policy.md`) online and set the URL in `src/screens/SettingsSheet.tsx` and App Store Connect.
3. Build and submit:

```bash
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios
```

Listing copy, keywords and privacy answers are drafted in `legal/app-store-listing.md`.
