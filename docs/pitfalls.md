# Pitfalls & Learnings

## UI Refactoring (2026-04-10)
- **Duplicate Template Tags**: When using `multi_replace_file_content` or `replace_file_content` to overhaul a Vue template, ensure that you don't accidentally nest or duplicate the `<template>` or `<script>` tags if they were part of the target string.
- **Tag Balance**: Adding wrapper divs (like animation layers) requires careful verification of closing tags at the end of the file. A missing `</div>` OR an extra `</div>` will crash the Vite build. Always audit opening vs closing tag counts when overhauling large templates.
- **Font Availability**: `Geist Sans` is not currently native to Google Fonts. Must use jsDelivr/Fontsource or Vercel CDN.
- **Backwards Compatibility**: Removing global utility classes (like `clip-chamfer`) will break un-refactored components that rely on them. Keep legacy utilities until the migration is complete.
