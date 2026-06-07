# Risk Analysis Report

This document highlights the highly fragile boundaries of the Capo CLI architecture. Autonomous agents MUST review these zones before attempting modifications.

## 1. `scripts/deep-rename.sh` (The Deep Mutation Zone)
**Description:** This script forcefully rewrites internal Apple XML structures (`.pbxproj`), Xcode Schemes, and Android package hierarchies to rename the base template project.
**Risks:**
- We rely heavily on GNU `perl` (`perl -pi -e`) for cross-platform regex string replacements. Changing these regex patterns can instantly corrupt the `.pbxproj` indexing, rendering the iOS project entirely unreadable by Xcode.
- Do NOT switch back to `sed`, as macOS and Linux handle the `-i` flag entirely differently, which will break the CLI for non-Mac developers.

## 2. React Native `SafeAreaView` Android Override
**Description:** The native `react-native` `SafeAreaView` component fails to properly account for Android edge-to-edge camera notches.
**Risks:**
- The CLI specifically injects `react-native-safe-area-context` during the scaffold (`scripts/init.sh`). Removing this dependency will cause catastrophic UI overlaps on modern Android hardware.

## 3. Metro Bundler Ghost Caching
**Description:** Because the CLI rapidly creates, deletes, and renames thousands of native files in under 30 seconds, the Metro bundler's internal Watchman cache will desynchronize.
**Risks:**
- If the `watchman watch-del-all` command is ever removed from the end of `scripts/init.sh`, the newly built app will consistently throw a `404` Red Screen of Death because Metro will try to serve the old cached directory index.
