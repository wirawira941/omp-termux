# oh-my-pi for Termux (Android aarch64)

A port of [oh-my-pi](https://github.com/can1357/oh-my-pi) v18.12.2 — a fork of
the [Pi coding agent](https://github.com/earendil-works/pi) with LSP, a DAP
debugger, subagents and 32 tools — so it runs **natively on Android via
Termux**. No proot, no Linux VM: a single Bun-compiled binary plus the real
Rust `pi-natives` addon compiled for `aarch64-linux-android`.

This branch (`termux-android`) adds only the `termux/` folder; upstream code
is untouched.

## Contents

| File | Purpose |
| --- | --- |
| `build-omp-android.ts` | Compile the `omp.bin` binary with Bun (`bun-android-arm64`) |
| `build-natives-android.sh` | Cross-compile the Rust `pi-natives` addon for Android and stamp it |
| `install.sh` | Install `omp.bin` + the `.node` addon + launcher into Termux |
| `omp` | Launcher script (installed as `$PREFIX/bin/omp-termux`) |
| `omp-android-text-fallbacks.js` | JS fallbacks for text-width natives — last-resort reference if the addon cannot load |

## Install (prebuilt)

Download the release assets and put these four files in **one folder** on the
device:

- `omp.bin`
- `pi_natives.android-arm64.node`
- `install.sh`
- `omp`

Then in Termux:

```bash
cd <folder>
bash install.sh
omp-termux --help
```

`install.sh` copies the binary and addon to `$PREFIX/libexec/omp-termux/`
and the launcher to `$PREFIX/bin/omp-termux`.

## Build from source

Requirements: [Bun](https://bun.sh), a Rust toolchain with the
`aarch64-linux-android` target, Android NDK r28c, and `ninja` + `cmake` on
`PATH` (the `opusic-sys` build script needs them). Building the natives
takes a while and linking is memory-hungry — see the RAM note below.

```bash
# 1. Clone this fork and check out the Termux branch
git clone -b termux-android https://github.com/wirawira941/oh-my-pi
cd oh-my-pi

# 2. Install JS dependencies and generate build artifacts
bun install
bun run gen:stats
bun run gen:tool-views

# 3. Cross-compile the Rust natives for Android (produces
#    packages/natives/native/pi_natives.android-arm64.node, version-stamped)
export ANDROID_NDK_HOME="$HOME/android-ndk-r28c"   # adjust to your NDK path
./termux/build-natives-android.sh

# 4. Compile the binary (writes termux/omp.bin)
bun termux/build-omp-android.ts

# 5. Package: the .node lands next to the installer files
cp packages/natives/native/pi_natives.android-arm64.node termux/
# termux/ now holds omp.bin, pi_natives.android-arm64.node, install.sh, omp
```

### How the pieces fit

- The binary is compiled with `native: null`, so the Rust addon is **not**
  embedded. At runtime the natives loader looks for
  `pi_natives.android-arm64.node` next to the binary first, so shipping the
  real addon beside `omp.bin` is enough — no stub is involved.
- A raw `cargo` build carries **no version stamp**; the loader rejects an
  unstamped addon. `build-natives-android.sh` runs
  `bun scripts/stamp-native-version.ts` after copying the `.so`, which stamps
  it with the version from `packages/natives/package.json` (18.12.2).
- The launcher exports `OMP_PACKAGE_DIR` pointing at the install dir — on
  Android, Bun's `process.execPath` resolves to the system linker, so the
  binary needs this hint to find its own files (same class of fix as
  `OPENCODE_BIN` in the opencode Termux port).

### RAM note (important)

The default Cargo `release` profile uses fat LTO, and its final link gets
SIGKILLed (OOM) on a ~8 GB machine. The natives script therefore builds with
a `ci` profile — thin LTO, `codegen-units = 16`, stripped symbols — and adds
it to the workspace `Cargo.toml` if missing. On very low-memory machines,
add `-j1` to the `cargo build` invocation.

## Credits

All credit for the agent itself goes to the upstream projects:
[can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) and
[earendil-works/pi](https://github.com/earendil-works/pi). This repo only
adds the Android/Termux build and packaging.
