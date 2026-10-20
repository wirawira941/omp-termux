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
import { compileCodingAgent } from "../packages/coding-agent/scripts/compile-binary.ts";

const repoRoot = path.resolve(import.meta.dir, "..");
const packageDir = path.join(repoRoot, "packages", "coding-agent");

await compileCodingAgent({
	repoRoot,
	entrypoint: path.join(packageDir, "src", "cli.ts"),
	outfile: path.join(import.meta.dir, "omp.bin"),
	transformersVersion: "4.2.0",
	native: null, // Android natives ship as a separate .node file
	target: "bun-android-arm64",
});

console.log("Build complete: termux/omp.bin");
