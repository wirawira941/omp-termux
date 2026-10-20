# omp-termux

**oh-my-pi for Termux** — the [oh-my-pi](https://github.com/can1357/oh-my-pi)
coding agent (v18.12.2, a fork of [Pi](https://github.com/earendil-works/pi)
with LSP, a DAP debugger, subagents and 32 tools) running **natively on
Android** via Termux.

A single Bun-compiled binary (`bun-android-arm64`) plus the real Rust
`pi-natives` addon cross-compiled for `aarch64-linux-android`. No proot, no
chroot, no Linux VM.

## Download & install

Grab `omp-termux-android-aarch64.zip` from
[Releases](https://github.com/wirawira941/omp-termux/releases), then in
Termux:

```bash
mkdir -p ~/omp && cd ~/omp
unzip ~/omp-termux-android-aarch64.zip   # adjust to where you saved it
bash install.sh
omp-termux --help
```

The installer places `omp.bin` and `pi_natives.android-arm64.node` in
`$PREFIX/libexec/omp-termux/` and the `omp-termux` launcher in `$PREFIX/bin/`.

## Build from source

Full instructions — cross-compiling the Rust natives (NDK r28c, Cargo `ci`
profile, version stamping), compiling the binary, and packaging — live in
[termux/README.md](termux/README.md). The scripts are in the same folder:

- `termux/build-natives-android.sh` — Rust natives → `pi_natives.android-arm64.node`
- `termux/build-omp-android.ts` — Bun compile → `omp.bin`
- `termux/install.sh`, `termux/omp` — device installer and launcher

## Notes

- Android aarch64 only.
- The natives addon must be version-stamped or the loader rejects it — the
  build script handles this.
- Linking the natives with Cargo's default fat-LTO release profile OOMs on
  ~8 GB machines; the build uses a thin-LTO `ci` profile instead.

## Credits

All credit for the agent itself goes to
[can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) and
[earendil-works/pi](https://github.com/earendil-works/pi). This repo only
adds the Android/Termux build, packaging and installer.
