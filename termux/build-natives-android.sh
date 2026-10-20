#!/usr/bin/env bash
# Build the Rust pi-natives addon for Android (aarch64-linux-android).
# Run from the repository root.
#
# Requirements:
#   - Rust toolchain with the aarch64-linux-android target
#   - Android NDK r28c (set ANDROID_NDK_HOME; default path below)
#   - ninja and cmake on PATH (the opusic-sys build script needs them)
#
# Memory note: the default Cargo `release` profile uses fat LTO and its
# final link gets SIGKILLed (OOM) on ~8 GB machines. This script builds
# with a `ci` profile (thin LTO) instead, and adds it to the workspace
# Cargo.toml if missing. On very low-memory machines add `-j1` to the
# cargo invocation.
set -euo pipefail

export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-$HOME/android-ndk-r28c}"
export ANDROID_NDK_ROOT="$ANDROID_NDK_HOME"
NDK_BIN="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"
export PATH="$NDK_BIN:$PATH"
export CC_aarch64_linux_android=aarch64-linux-android35-clang
export CXX_aarch64_linux_android=aarch64-linux-android35-clang++

# Cargo's linker/ar for the Android target must also come from the NDK.
# The original VM build silently got these from a machine-global
# ~/.cargo/config.toml; a CI runner has no such file, and without them
# rustc falls back to a host linker that cannot find the Android system
# libraries (-llog, -lunwind) in the NDK sysroot.
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$NDK_BIN/aarch64-linux-android35-clang"
export CARGO_TARGET_AARCH64_LINUX_ANDROID_AR="$NDK_BIN/llvm-ar"

if ! grep -q '^\[profile\.ci\]' Cargo.toml; then
	cat >> Cargo.toml <<'EOF'

[profile.ci]
inherits = "release"
lto = "thin"
codegen-units = 16
debug = false
strip = "symbols"
EOF
fi

cargo build -p pi-natives --target aarch64-linux-android --profile ci

# A raw cargo build carries no version stamp, and the addon loader rejects
# unstamped addons — copy the library into place and stamp it.
cp target/aarch64-linux-android/ci/libpi_natives.so \
	packages/natives/native/pi_natives.android-arm64.node
bun scripts/stamp-native-version.ts \
	packages/natives/native/pi_natives.android-arm64.node

echo "Done: packages/natives/native/pi_natives.android-arm64.node"
