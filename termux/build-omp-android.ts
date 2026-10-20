#!/usr/bin/env bun
// Build oh-my-pi as a single Bun binary for Android/Termux (aarch64).
//
// Run from anywhere: paths resolve relative to this script's folder
// (termux/), which must sit at the root of the oh-my-pi checkout.
//
// The binary is compiled with `native: null`, so the Rust pi-natives addon
// is NOT embedded. It is shipped next to the binary as
// pi_natives.android-arm64.node and picked up by the natives loader at
// runtime — see build-natives-android.sh and README.md.
import * as path from "node:path";
import { $ } from "bun";
import { compileCodingAgent } from "../packages/coding-agent/scripts/compile-binary.ts";

const repoRoot = path.resolve(import.meta.dir, "..");
const packageDir = path.join(repoRoot, "packages", "coding-agent");

// Apply the Android loader patch before compiling: it makes loadNative()
// in packages/natives/native/loader-state.js degrade to JS stubs instead
// of throwing "Unsupported platform" when the .node addon cannot be
// loaded on Android. (With the real .node in place the loader returns the
// real bindings before ever reaching that fallback.) The original VM
// build carried this as an uncommitted working-tree change. Guarded:
// re-runs and already-patched trees are no-ops.
const loaderPatch = path.join(import.meta.dir, "omp-android-loader.patch");
const patchCheck = await $`git -C ${repoRoot} apply --check ${loaderPatch}`.nothrow().quiet();
if (patchCheck.exitCode === 0) {
	await $`git -C ${repoRoot} apply ${loaderPatch}`;
	console.log("Applied omp-android-loader.patch");
}

await compileCodingAgent({
	repoRoot,
	entrypoint: path.join(packageDir, "src", "cli.ts"),
	outfile: path.join(import.meta.dir, "omp.bin"),
	transformersVersion: "4.2.0",
	native: null, // Android natives ship as a separate .node file
	target: "bun-android-arm64",
});

console.log("Build complete: termux/omp.bin");
