#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
LIBEXEC="$PREFIX/libexec/omp-termux"
BIN="$PREFIX/bin"
mkdir -p "$LIBEXEC" "$BIN"
cp "$HERE/omp.bin" "$LIBEXEC/omp.bin"
cp "$HERE/pi_natives.android-arm64.node" "$LIBEXEC/pi_natives.android-arm64.node"
cp "$HERE/omp" "$BIN/omp-termux"
chmod 755 "$LIBEXEC/omp.bin" "$LIBEXEC/pi_natives.android-arm64.node" "$BIN/omp-termux"
echo "Installed: omp-termux"
echo "Run: omp-termux --help"
