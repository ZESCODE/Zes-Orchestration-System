# ZES Droid — Cordova APK Builder

## Overview
AI-powered Android app development tool using Cordova project structure with
native Termux build tools (no Gradle/AAPT2 daemon needed for ARM64).

## Commands
- `zes droid status` — Check build environment (Java, Node, SDK, AI providers)
- `zes droid new <name>` — Create Cordova project from template
- `zes droid gen "<desc>"` — AI-generate HTML/JS/CSS app from description
- `zes droid build <name>` — Build APK using native Termux tools (ARM64 native)
- `zes droid run <name>` — Install APK via ADB and launch
- `zes droid push <name> [source]` — Copy files into www/

## Commands
- `zes droid status` — Check build environment (Java, Node, SDK, AI providers)
- `zes droid new <name>` — Create Cordova project from template
- `zes droid gen "<desc>"` — AI-generate HTML/JS/CSS app from description
- `zes droid build <name>` — Build APK using native Termux tools (ARM64 native)
- `zes droid run <name>` — Install APK via ADB and launch
- `zes droid push <name> [source]` — Copy files into www/
- `zes droid test <name>` — Install, launch, and verify APK on real device
- `zes droid verify <name>` — Check APK is running, permissions granted, no crash

## Device Testing (via Android Device Access)

After building an APK, test it directly on the device using Android native tools.

### Install & Launch
```bash
# Install APK
shizuku pm install -r /path/to/app.apk

# Launch by package name
shizuku am start -n com.example.app/.MainActivity

# Or via intent bridge
intent '{"start":"activity","action":"android.intent.action.VIEW","package":"com.example.app"}'
```

### Verify App is Running
```bash
# Check foreground app
shizuku dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'

# Or via uiautomator
shizuku uiautomator dump /sdcard/ui.xml
grep -c "com.example.app" /sdcard/ui.xml
```

### Take Screenshot
```bash
shizuku screencap -p /sdcard/app-screenshot.png
shizuku cat /sdcard/app-screenshot.png > ~/app-screenshot.png
```

### Check Permissions
```bash
shizuku dumpsys package com.example.app | grep -A 20 "requested permissions"
```

### Quick Smoke Test (full pipeline)
```bash
# Build, install, launch, verify, screenshot
zes droid build myapp && \
shizuku pm install -r ~/myapp/app.apk && \
shizuku am start -n com.example.app/.MainActivity && \
sleep 2 && \
shizuku uiautomator dump /sdcard/ui.xml && \
shizuku screencap -p /sdcard/screenshot.png && \
echo "✅ App deployed and verified"
```

### Uninstall
```bash
shizuku pm uninstall com.example.app
```

## Build Architecture
**No Gradle involved.** Cordova project structure is used for compatibility,
but building is done with Termux native packages:
- `aapt2` — resource compilation
- `d8` — DEX bytecode conversion
- `javac` + `android.jar` — Java compilation
- `apksigner` — APK signing (v2/v3)
- `zipalign` — APK alignment

This works on ARM64 where Google's Gradle plugin (x86_64 AAPT2 binary) fails.

## Dependencies
- `pkg install -y openjdk-17 aapt2 d8 apksigner aapt android-tools`
- Android SDK platform (android-36) downloaded via curl
- `npm install -g cordova` (for project creation only)
- OpenRouter API key (for AI generation)

## Commercial Use
Apache 2.0. All tools used (Cordova, zipalign, aapt2, d8, apksigner)
are Apache 2.0 licensed. No restrictions on selling apps built with this tool.

This means you can:
- Build and sell apps commercially with zero royalties
- Use ZES in your company's internal toolchain
- Modify and redistribute the pipeline (with Apache 2.0 attribution)
- No need to open-source your apps built with ZES

Attribution required only if you redistribute the ZES pipeline itself (not your apps).
