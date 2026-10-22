# Home Board

A wall-mounted Android tablet dashboard for the household: a widget board you can rearrange and resize, the kid's routine with stars, the weekly menu with a shopping list, alarms that ring full-screen, and household reminders. Light, dark and automatic day/night themes.

Built as a React + Vite web app inside a native Android shell (Capacitor).

## Get the APK

Every push to `main` builds the APK on GitHub Actions:

1. Open the repo's **Releases** page on the tablet (or the **Actions** tab › latest run › *HomeBoard-apk*).
2. Download `HomeBoard-1.0.N.apk` and tap it. Android asks once to allow installs from your browser.
3. Newer builds install over the old one and keep all your data.

## First-time setup on the tablet

1. Open **Home Board** and allow notifications (so alarms ring even if the app is closed).
2. **Settings › Weather location**: search for your town.
3. **Settings › Family**: family members, kid's name, star reward.
4. Make it the wall display: **Android Settings › Apps › Default apps › Home app › Home Board**. It then starts on boot and the Home button always returns to the board. (Or use Android *screen pinning*.)
5. On Android 12+, if Settings shows **Allow exact alarms**, tap it so alarms ring on the minute.

## Using it

- **Rearrange the board**: long-press anywhere on the board, or tap **Edit** in the side rail. Drag a widget onto another to move it, drag the amber corner to resize, or tap a widget for move/size/remove buttons. **Add widget** opens the gallery: clock, weather, next alarm, today's menu, kid's day, photo frame (add as many as you like), chores, family note, calendar, countdown, shopping list.
- **Change what a widget shows**: tap its pencil.
- **Theme**: the rail button cycles Auto → Light → Dark. Auto switches at the times set in Settings.
- **Backup**: Settings › Backup saves everything except photos to a file.

All data stays on the tablet; nothing is sent anywhere except the weather lookup (Open-Meteo, no account needed).

## Develop

```bash
npm install
npm run dev            # open http://localhost:5173 in a 1280×800 window
npm run build && npx cap sync android
npx cap open android   # build/run from Android Studio
```

## Signing (so updates install over each other)

Android only installs an update if it's signed with the same key as the installed app. The workflow reads that key from two repository secrets (**Settings › Secrets and variables › Actions**):

| Secret | Value |
| --- | --- |
| `HOMEBOARD_KEYSTORE_BASE64` | the keystore file, base64-encoded |
| `HOMEBOARD_KEY_PASSWORD` | its password (the key alias must be `homeboard`) |

To make a key yourself:

```bash
keytool -genkeypair -keystore homeboard.keystore -alias homeboard -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 homeboard.keystore   # paste the output into HOMEBOARD_KEYSTORE_BASE64
```

Keep the keystore somewhere safe and never commit it. Without the secrets the APK still builds and installs, but each build uses a throwaway key, so updating means uninstalling first (which clears the app's data).
