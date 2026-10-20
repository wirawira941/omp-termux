// DRAFT (not applied) — JS fallbacks for the Android pi-natives stub.
// Intended insertion point: inside the android branch of loadNative() in
//   ~/workspace/omp-termux-build/omp-src/packages/natives/native/loader-state.js
// i.e. right after the existing `wrapTextWithAnsi` fallback block, before the
// generic throwing `stub`. The shared helpers go just inside the
// `if (ctx.platformTag === "android-arm64" || ...)` block, before `return new Proxy(...)`.
//
// Why: the TUI render path (tui/src/utils.ts) thin-wraps these native text
// functions and calls them on EVERY frame. Crash history on-device so far:
//   1. macOSSpellCheckerAvailable -> false        (feature check)
//   2. setHangulCompatJamoWidthOverride -> no-op  (setter)
//   3. wrapTextWithAnsi -> JS fallback            (render)
// The next frames will hit truncateToWidth (same welcome render), then
// sliceWithWidth / extractSegments (differential renderer in
// tui/src/render/composite.ts). Patching all three now avoids 2-3 more
// download->test->crash round trips with the user.
//
// Contracts verified against:
//   - packages/natives/native/index.d.ts  (signatures: truncateToWidth,
//     sliceWithWidth -> SliceResult {text,width}, extractSegments ->
//     ExtractSegmentsResult {before,beforeWidth,after,afterWidth},
//     Ellipsis {Unicode=0, Ascii=1, Omit=2})
//   - packages/tui/src/utils.ts           (wrappers, DEFAULT_TAB_WIDTH=3,
//     truncateToWidth fast-path, wrapLiteralLine strict->lenient retry)
//   - packages/tui/src/render/composite.ts (extractSegments/sliceWithWidth usage)

// ---- shared grapheme-aware width engine (mirrors tui visibleWidth) ----
const __swOpts = { countAnsiEscapeCodes: false, ambiguousIsNarrow: true };
const __seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
// CSI | OSC (BEL/ST-terminated) | APC | single-char ESC sequences
const __escRe = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][\s\S]*?(?:\x07|\x1b\\)|\x1b_[\s\S]*?(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;
const __pushGraphemes = (s, out) => {
	for (const { segment } of __seg.segment(s)) {
		out.push({ s: segment, w: Bun.stringWidth(segment, __swOpts) });
	}
};
// Tokenize into {s, w}; escape sequences are zero-width and carried verbatim.
const __tokenize = (text, tabWidth) => {
	const tw = tabWidth > 0 ? tabWidth : 3; // DEFAULT_TAB_WIDTH in @oh-my-pi/pi-utils
	const src = String(text).replace(/\t/g, " ".repeat(tw));
	const out = [];
	let last = 0, m;
	__escRe.lastIndex = 0;
	while ((m = __escRe.exec(src)) !== null) {
		if (m.index > last) __pushGraphemes(src.slice(last, m.index), out);
		out.push({ s: m[0], w: 0 });
		last = m.index + m[0].length;
	}
	if (last < src.length) __pushGraphemes(src.slice(last), out);
	return out;
};
const __ellipsisText = (kind) => (kind === 1 ? "..." : kind === 2 ? "" : "…"); // default Unicode
const __sliceWithWidth = (line, startCol, length, strict, tabWidth) => {
	const toks = __tokenize(line, tabWidth);
	const endCol = startCol + length;
	let col = 0, out = "", width = 0;
	for (const t of toks) {
		if (t.w === 0) {
			if (col >= startCol && col < endCol) out += t.s;
			continue;
		}
		const tStart = col, tEnd = col + t.w;
		col = tEnd;
		if (tEnd <= startCol || tStart >= endCol) continue;
		// strict: drop graphemes straddling a boundary; lenient: keep them
		// (wrapLiteralLine relies on strict->lenient retry for oversized graphemes)
		if ((tStart >= startCol && tEnd <= endCol) || !strict) {
			out += t.s;
			width += t.w;
		}
	}
	return { text: out, width };
};

// ---- insert into the get() trap, after the wrapTextWithAnsi block ----
// Ellipsis enum is re-exported by tui/src/utils.ts; the bare proxy resolves
// Ellipsis.Unicode to undefined. Provide the real values.
if (name === "Ellipsis") {
	return { Unicode: 0, Ascii: 1, Omit: 2 };
}
if (name === "truncateToWidth") {
	return function (text, maxWidth, ellipsisKind, pad, tabWidth) {
		maxWidth = Math.max(0, maxWidth | 0);
		const toks = __tokenize(text, tabWidth);
		const total = toks.reduce((a, t) => a + t.w, 0);
		if (total <= maxWidth) {
			return pad ? String(text) + " ".repeat(maxWidth - total) : String(text);
		}
		const ell = __ellipsisText(ellipsisKind);
		const ellW = Bun.stringWidth(ell, __swOpts);
		let w = 0;
		const kept = [];
		for (const t of toks) {
			if (w + t.w > maxWidth - ellW) break; // never split a grapheme
			kept.push(t);
			w += t.w;
		}
		let result = kept.map((t) => t.s).join("") + ell;
		if (pad) result += " ".repeat(Math.max(0, maxWidth - w - ellW));
		return result;
	};
}
if (name === "sliceWithWidth") {
	return function (line, startCol, length, strict, tabWidth) {
		return __sliceWithWidth(line, startCol, length, strict, tabWidth);
	};
}
if (name === "extractSegments") {
	return function (line, beforeEnd, afterStart, afterLen, strictAfter, tabWidth) {
		const before = __sliceWithWidth(line, 0, beforeEnd, false, tabWidth);
		const after = __sliceWithWidth(line, afterStart, afterLen, strictAfter, tabWidth);
		return {
			before: before.text,
			beforeWidth: before.width,
			after: after.text,
			afterWidth: after.width,
		};
	};
}
