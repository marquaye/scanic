# Roadmap

Rough plan for where Scanic is going. Nothing here is a promise on a date, and
the order shifts as things come up. If you want something on this list, or want
to build one of these, open a
[Discussion](https://github.com/marquaye/scanic/discussions) or an
[issue](https://github.com/marquaye/scanic/issues).

## Done

- [x] TypeScript definitions
- [x] Single-pass perspective warp (inverse mapping, bilinear sampling)
- [x] Rust/WASM edge-detection core with a JS fallback
- [x] Multi-pass detection cascade for harder images
- [x] Built-in, themeable corner editor
- [x] Docs site with guides and an interactive playground

## Working on / up next

- [ ] More image filters: adaptive thresholding, black & white
- [ ] Real-time video scanning tuned for mobile
- [ ] Moving more detection stages into the Rust core

## Maybe later

Things I'm interested in but haven't committed to.

- [ ] WebGPU for the warp or detection where it's supported
- [ ] Output cleanup presets (auto-contrast, shadow removal)
- [ ] Finding more than one document in a single frame

## Just ideas

Open questions, nothing decided.

- [ ] Hooks for plugging in OCR
- [ ] Detection profiles tuned for receipts, ID cards, A4 pages

When a roadmap item turns into real work, it gets an
[issue](https://github.com/marquaye/scanic/issues) to track it.
