# Clawdbot (iOS)

Internal-only SwiftUI app scaffold.

## Lint/format (required)
```bash
brew install swiftformat swiftlint
```

<<<<<<< HEAD
## Generate the Xcode project
=======
`pnpm ios:open` now runs `scripts/ios-configure-signing.sh` before `xcodegen`:

- If `IOS_DEVELOPMENT_TEAM` is set, it uses that team.
- Otherwise it prefers the canonical OpenClaw team (`Y5PE65HELJ`) when that team exists locally.
- If not present, it picks the first non-personal team from your Xcode account (falls back to personal team if needed).
- It writes the selected team to `apps/ios/.local-signing.xcconfig` (local-only, gitignored).

Then in Xcode:

1. Select the `OpenClaw` scheme
2. Select a simulator or a connected device
3. Run

If you're using a personal Apple Development team, you may still need to change the bundle identifier in Xcode to a unique value so signing succeeds.

## Build From CLI

```bash
pnpm ios:build
```

## Tests

>>>>>>> 98962ed81 (feat(ios): auto-select local signing team (#18421))
```bash
cd apps/ios
xcodegen generate
open Clawdbot.xcodeproj
```

## Shared packages
- `../shared/MoltbotKit` — shared types/constants used by iOS (and later macOS bridge + gateway routing).

## fastlane
```bash
brew install fastlane

cd apps/ios
fastlane lanes
```

See `apps/ios/fastlane/SETUP.md` for App Store Connect auth + upload lanes.
