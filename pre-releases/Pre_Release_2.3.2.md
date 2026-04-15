Pre-Release 2.3.2

Range: v2.3.1..working tree

Added

- Added standalone `Sprint`, `Survival`, and `Flawless` practice flows with shared content generation, quick mode settings, richer result panels, and mode-specific follow-up recommendations.
- Added built-in and addon-aware content packs, custom pack import/export support, pack quality and preflight checks, and a shared content pipeline for practice scenarios.
- Added long-term motivation systems: goals, streaks, layout mastery, weekly and seasonal tasks, personal records, and result comparisons across practice and game flows.

Changed

- Reworked `Home` into a fuller progress hub with recommendations, mode focus, records, mastery, weekly tasks, seasonal goals, and quick return actions.
- Rebalanced content generation and diagnostics for `practice`, `sprint`, `survival`, and `flawless`, including better target text lengths, improved sentence and custom-pack handling, and healthier pseudo-word and syllable generation.
- Replaced the old feature-growth roadmap with a new roadmap focused on optimization, refactoring, and UI cleanup, with the first render-stability package already started.

Fixed

- Reduced render overhead on `Home` by moving heavy summaries out of the render path and memoizing derived data.
- Started splitting hot UI runtime state out of the main `AppContext`, so fast keyboard-related updates cause fewer broad re-renders.
- Removed `Ghost Duel` mode preparation and references as a non-viable direction.
