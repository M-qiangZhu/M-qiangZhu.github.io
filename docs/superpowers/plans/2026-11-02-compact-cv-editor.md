# Compact Portfolio and CV Implementation Plan

> Native execution by the current agent; user has authorized implementation and publication.

**Goal:** Compact bilingual homepage plus shared-data CV export, date sorting, contribution handling, and local form editor.
**Architecture:** Dependency-free HTML/CSS/JS, shared portfolio-core.js for data validation, dates, sorting, and safe import/export; data in content.js; homepage, CV, and editor as separate views.
**Spec:** ../specs/2026-11-02-compact-cv-editor-design.md

## Constraints and review focus

Keep all existing facts and original author order. No fabricated dates. Ongoing/unknown dates, second-listed co-first author, failed import leaving current data intact, draft isolation, safe URL handling, and multi-page A4 layout require verification.

## Tasks

- [x] Write failing Node tests for sorting, publication ordering, author roles, and safe import/export; implement portfolio-core.js and migrate content data.
- [x] Replace homepage with compact layout and shared renderer, preserving bilingual language switching and accessible theme/navigation controls.
- [x] Add cv.html and cv.js: language and section/project choices, shared sorting and author rendering, dedicated print layout.
- [x] Add edit.html and editor.js: comprehensive forms, validation, drafts, JSON import/export, script download, local writeback, preview, GitHub upload link.
- [x] Run Node tests and real browser checks for all workflows; inspect PDF/print layout; request independent code review and fix material issues.
- [x] Update README, commit, fast-forward main, push, watch Pages deployment, and verify public resources.

## Verification record

15 Node tests pass. Browser checks covered language/theme changes, mobile overflow, draft persistence and isolation, adding a future-dated project, undo, file export/import, invalid import rejection, author-role form bindings, CV section/project selection, and print previews. Both Chinese and English featured CVs were printed to two-page A4 PDFs and visually inspected. Independent review identified mixed-precision dates, hidden editable text fields, and per-patent inventors; all fixed with regression coverage. Final remote publication is verified through the GitHub Pages run and matching HTTP resources.
