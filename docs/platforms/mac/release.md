---
summary: "OpenClaw macOS release checklist (Sparkle feed, packaging, signing)"
read_when:
  - Cutting or validating a OpenClaw macOS release
  - Updating the Sparkle appcast or feed assets
---

# OpenClaw macOS release (Sparkle)

This app now ships Sparkle auto-updates. Release builds must be Developer ID–signed, zipped, and published with a signed appcast entry.

## Prereqs
- Developer ID Application cert installed (example: `Developer ID Application: <Developer Name> (<TEAMID>)`).
- Sparkle private key path set in the environment as `SPARKLE_PRIVATE_KEY_FILE` (path to your Sparkle ed25519 private key; public key baked into Info.plist). If it is missing, check `~/.profile`.
- Notary credentials (keychain profile or API key) for `xcrun notarytool` if you want Gatekeeper-safe DMG/zip distribution.
  - We use a Keychain profile named `openclaw-notary`, created from App Store Connect API key env vars in your shell profile:
    - `APP_STORE_CONNECT_API_KEY_P8`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- `pnpm` deps installed (`pnpm install --config.node-linker=hoisted`).
- Sparkle tools are fetched automatically via SwiftPM at `apps/macos/.build/artifacts/sparkle/Sparkle/bin/` (`sign_update`, `generate_appcast`, etc.).

## Build & package
Notes:
- `APP_BUILD` maps to `CFBundleVersion`/`sparkle:version`; keep it numeric + monotonic (no `-beta`), or Sparkle compares it as equal.
- Defaults to the current architecture (`$(uname -m)`). For release/universal builds, set `BUILD_ARCHS="arm64 x86_64"` (or `BUILD_ARCHS=all`).
- Use `scripts/package-mac-dist.sh` for release artifacts (zip + DMG + notarization). Use `scripts/package-mac-app.sh` for local/dev packaging.

```bash
# From repo root; set release IDs so Sparkle feed is enabled.
# APP_BUILD must be numeric + monotonic for Sparkle compare.
BUNDLE_ID=bot.molt.mac \
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
APP_VERSION=2026.2.1 \
=======
APP_VERSION=2026.2.3 \
>>>>>>> e4b084c76 (chore: bump version to 2026.2.3)
=======
APP_VERSION=2026.2.4 \
>>>>>>> 5031b283a (chore: bump version to 2026.2.4)
=======
APP_VERSION=2026.2.6 \
>>>>>>> 677450cd9 (chore(release): bump version to 2026.2.6)
=======
APP_VERSION=2026.2.10 \
>>>>>>> 1872d0c59 (chore: bump version to 2026.2.10)
=======
APP_VERSION=2026.2.12 \
>>>>>>> 7695b4842 (chore: bump version to 2026.2.12)
=======
APP_VERSION=2026.2.13 \
>>>>>>> 63bb1e02b (chore(release): bump version to 2026.2.13)
=======
APP_VERSION=2026.2.14 \
>>>>>>> 1ff15e60d (chore(release): bump versions to 2026.2.14)
=======
APP_VERSION=2026.2.15 \
>>>>>>> 379b44558 (chore: bump version to 2026.2.15)
=======
APP_VERSION=2026.2.16 \
>>>>>>> 39fa81dc9 (chore: bump version to 2026.2.16)
=======
APP_VERSION=2026.2.17 \
>>>>>>> 9a2c39419 (chore(release): bump version to 2026.2.17)
=======
APP_VERSION=2026.2.18 \
>>>>>>> 4bf333883 (chore: bump version to 2026.2.18 unreleased)
=======
APP_VERSION=2026.2.19 \
>>>>>>> b0e55283d (chore: bump release metadata to 2026.2.19)
=======
APP_VERSION=2026.2.20 \
>>>>>>> f66b23de7 (chore(release): bump versions to 2026.2.20)
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-app.sh

# Zip for distribution (includes resource forks for Sparkle delta support)
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.1.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.1.dmg
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.3.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.3.dmg
>>>>>>> e4b084c76 (chore: bump version to 2026.2.3)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.4.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.4.dmg
>>>>>>> 5031b283a (chore: bump version to 2026.2.4)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.6.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.6.dmg
>>>>>>> 677450cd9 (chore(release): bump version to 2026.2.6)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.10.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.10.dmg
>>>>>>> 1872d0c59 (chore: bump version to 2026.2.10)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.12.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.12.dmg
>>>>>>> 7695b4842 (chore: bump version to 2026.2.12)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.13.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.13.dmg
>>>>>>> 63bb1e02b (chore(release): bump version to 2026.2.13)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.14.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.14.dmg
>>>>>>> 1ff15e60d (chore(release): bump versions to 2026.2.14)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.15.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.15.dmg
>>>>>>> 379b44558 (chore: bump version to 2026.2.15)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.16.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.16.dmg
>>>>>>> 39fa81dc9 (chore: bump version to 2026.2.16)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.17.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.17.dmg
>>>>>>> 9a2c39419 (chore(release): bump version to 2026.2.17)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.18.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.18.dmg
>>>>>>> 4bf333883 (chore: bump version to 2026.2.18 unreleased)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.19.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.19.dmg
>>>>>>> b0e55283d (chore: bump release metadata to 2026.2.19)
=======
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.2.20.zip

# Optional: also build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.2.20.dmg
>>>>>>> f66b23de7 (chore(release): bump versions to 2026.2.20)

# Recommended: build + notarize/staple zip + DMG
# First, create a keychain profile once:
#   xcrun notarytool store-credentials "openclaw-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<app-specific-password>"
NOTARIZE=1 NOTARYTOOL_PROFILE=openclaw-notary \
BUNDLE_ID=bot.molt.mac \
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
APP_VERSION=2026.2.1 \
=======
APP_VERSION=2026.2.3 \
>>>>>>> e4b084c76 (chore: bump version to 2026.2.3)
=======
APP_VERSION=2026.2.4 \
>>>>>>> 5031b283a (chore: bump version to 2026.2.4)
=======
APP_VERSION=2026.2.6 \
>>>>>>> 677450cd9 (chore(release): bump version to 2026.2.6)
=======
APP_VERSION=2026.2.10 \
>>>>>>> 1872d0c59 (chore: bump version to 2026.2.10)
=======
APP_VERSION=2026.2.12 \
>>>>>>> 7695b4842 (chore: bump version to 2026.2.12)
=======
APP_VERSION=2026.2.13 \
>>>>>>> 63bb1e02b (chore(release): bump version to 2026.2.13)
=======
APP_VERSION=2026.2.14 \
>>>>>>> 1ff15e60d (chore(release): bump versions to 2026.2.14)
=======
APP_VERSION=2026.2.15 \
>>>>>>> 379b44558 (chore: bump version to 2026.2.15)
=======
APP_VERSION=2026.2.16 \
>>>>>>> 39fa81dc9 (chore: bump version to 2026.2.16)
=======
APP_VERSION=2026.2.17 \
>>>>>>> 9a2c39419 (chore(release): bump version to 2026.2.17)
=======
APP_VERSION=2026.2.18 \
>>>>>>> 4bf333883 (chore: bump version to 2026.2.18 unreleased)
=======
APP_VERSION=2026.2.19 \
>>>>>>> b0e55283d (chore: bump release metadata to 2026.2.19)
=======
APP_VERSION=2026.2.20 \
>>>>>>> f66b23de7 (chore(release): bump versions to 2026.2.20)
APP_BUILD="$(git rev-list --count HEAD)" \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# Optional: ship dSYM alongside the release
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.1.dSYM.zip
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.3.dSYM.zip
>>>>>>> e4b084c76 (chore: bump version to 2026.2.3)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.4.dSYM.zip
>>>>>>> 5031b283a (chore: bump version to 2026.2.4)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.6.dSYM.zip
>>>>>>> 677450cd9 (chore(release): bump version to 2026.2.6)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.10.dSYM.zip
>>>>>>> 1872d0c59 (chore: bump version to 2026.2.10)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.12.dSYM.zip
>>>>>>> 7695b4842 (chore: bump version to 2026.2.12)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.13.dSYM.zip
>>>>>>> 63bb1e02b (chore(release): bump version to 2026.2.13)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.14.dSYM.zip
>>>>>>> 1ff15e60d (chore(release): bump versions to 2026.2.14)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.15.dSYM.zip
>>>>>>> 379b44558 (chore: bump version to 2026.2.15)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.16.dSYM.zip
>>>>>>> 39fa81dc9 (chore: bump version to 2026.2.16)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.17.dSYM.zip
>>>>>>> 9a2c39419 (chore(release): bump version to 2026.2.17)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.18.dSYM.zip
>>>>>>> 4bf333883 (chore: bump version to 2026.2.18 unreleased)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.19.dSYM.zip
>>>>>>> b0e55283d (chore: bump release metadata to 2026.2.19)
=======
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.2.20.dSYM.zip
>>>>>>> f66b23de7 (chore(release): bump versions to 2026.2.20)
```

## Appcast entry
Use the release note generator so Sparkle renders formatted HTML notes:
```bash
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.1.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.3.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> e4b084c76 (chore: bump version to 2026.2.3)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.4.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 5031b283a (chore: bump version to 2026.2.4)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.6.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 677450cd9 (chore(release): bump version to 2026.2.6)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.10.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 1872d0c59 (chore: bump version to 2026.2.10)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.12.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 7695b4842 (chore: bump version to 2026.2.12)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.13.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 63bb1e02b (chore(release): bump version to 2026.2.13)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.14.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 1ff15e60d (chore(release): bump versions to 2026.2.14)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.15.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 379b44558 (chore: bump version to 2026.2.15)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.16.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 39fa81dc9 (chore: bump version to 2026.2.16)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.17.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 9a2c39419 (chore(release): bump version to 2026.2.17)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.18.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> 4bf333883 (chore: bump version to 2026.2.18 unreleased)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.19.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> b0e55283d (chore: bump release metadata to 2026.2.19)
=======
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.2.20.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
>>>>>>> f66b23de7 (chore(release): bump versions to 2026.2.20)
```
Generates HTML release notes from `CHANGELOG.md` (via [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)) and embeds them in the appcast entry.
Commit the updated `appcast.xml` alongside the release assets (zip + dSYM) when publishing.

## Publish & verify
<<<<<<< HEAD
- Upload `OpenClaw-2026.1.27-beta.1.zip` (and `OpenClaw-2026.1.27-beta.1.dSYM.zip`) to the GitHub release for tag `v2026.1.27-beta.1`.
=======

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
- Upload `OpenClaw-2026.2.1.zip` (and `OpenClaw-2026.2.1.dSYM.zip`) to the GitHub release for tag `v2026.2.1`.
>>>>>>> 85cd55e22 (chore: bump to 2026.2.1)
=======
- Upload `OpenClaw-2026.2.3.zip` (and `OpenClaw-2026.2.3.dSYM.zip`) to the GitHub release for tag `v2026.2.3`.
>>>>>>> e4b084c76 (chore: bump version to 2026.2.3)
=======
- Upload `OpenClaw-2026.2.4.zip` (and `OpenClaw-2026.2.4.dSYM.zip`) to the GitHub release for tag `v2026.2.4`.
>>>>>>> 5031b283a (chore: bump version to 2026.2.4)
=======
- Upload `OpenClaw-2026.2.6.zip` (and `OpenClaw-2026.2.6.dSYM.zip`) to the GitHub release for tag `v2026.2.6`.
>>>>>>> 677450cd9 (chore(release): bump version to 2026.2.6)
=======
- Upload `OpenClaw-2026.2.10.zip` (and `OpenClaw-2026.2.10.dSYM.zip`) to the GitHub release for tag `v2026.2.10`.
>>>>>>> 1872d0c59 (chore: bump version to 2026.2.10)
=======
- Upload `OpenClaw-2026.2.12.zip` (and `OpenClaw-2026.2.12.dSYM.zip`) to the GitHub release for tag `v2026.2.12`.
>>>>>>> 7695b4842 (chore: bump version to 2026.2.12)
=======
- Upload `OpenClaw-2026.2.13.zip` (and `OpenClaw-2026.2.13.dSYM.zip`) to the GitHub release for tag `v2026.2.13`.
>>>>>>> 63bb1e02b (chore(release): bump version to 2026.2.13)
=======
- Upload `OpenClaw-2026.2.14.zip` (and `OpenClaw-2026.2.14.dSYM.zip`) to the GitHub release for tag `v2026.2.14`.
>>>>>>> 1ff15e60d (chore(release): bump versions to 2026.2.14)
=======
- Upload `OpenClaw-2026.2.15.zip` (and `OpenClaw-2026.2.15.dSYM.zip`) to the GitHub release for tag `v2026.2.15`.
>>>>>>> 379b44558 (chore: bump version to 2026.2.15)
=======
- Upload `OpenClaw-2026.2.16.zip` (and `OpenClaw-2026.2.16.dSYM.zip`) to the GitHub release for tag `v2026.2.16`.
>>>>>>> 39fa81dc9 (chore: bump version to 2026.2.16)
=======
- Upload `OpenClaw-2026.2.17.zip` (and `OpenClaw-2026.2.17.dSYM.zip`) to the GitHub release for tag `v2026.2.17`.
>>>>>>> 9a2c39419 (chore(release): bump version to 2026.2.17)
=======
- Upload `OpenClaw-2026.2.18.zip` (and `OpenClaw-2026.2.18.dSYM.zip`) to the GitHub release for tag `v2026.2.18`.
>>>>>>> 4bf333883 (chore: bump version to 2026.2.18 unreleased)
=======
- Upload `OpenClaw-2026.2.19.zip` (and `OpenClaw-2026.2.19.dSYM.zip`) to the GitHub release for tag `v2026.2.19`.
>>>>>>> b0e55283d (chore: bump release metadata to 2026.2.19)
=======
- Upload `OpenClaw-2026.2.20.zip` (and `OpenClaw-2026.2.20.dSYM.zip`) to the GitHub release for tag `v2026.2.20`.
>>>>>>> f66b23de7 (chore(release): bump versions to 2026.2.20)
- Ensure the raw appcast URL matches the baked feed: `https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`.
- Sanity checks:
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` returns 200.
  - `curl -I <enclosure url>` returns 200 after assets upload.
  - On a previous public build, run “Check for Updates…” from the About tab and verify Sparkle installs the new build cleanly.

Definition of done: signed app + appcast are published, update flow works from an older installed version, and release assets are attached to the GitHub release.
