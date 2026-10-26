# Angular Bundle Guard

An Antigravity plugin and agent skill that audits Angular initial bundle size (`main.js`, vendor chunks, initial total) and lazy chunks, diagnoses **8 eager-loading leak vectors**, and identifies **4 categories of Tailwind CSS v4 & component `.css` optimizations**.

---

## Features

- **Zero External Dependencies**: Written entirely with built-in Node.js modules (`node:fs`, `node:path`, `node:crypto`, `node:os`, `node:child_process`).
- **Auto-Discovery & Smart Rebuild**: Resolves single-app and multi-project (`angular.json`) workspaces, detects missing or stale `browser-stats.json` / `stats.json`, and runs `npx ng build [project] --stats-json` automatically when needed.
- **8 Initial Bundle Leak Vectors**:
  1. Mixed Barrel Files (`index.ts`) re-exporting `injectAsync()` targets or `injectAsync()` importing a barrel
  2. Value imports from `.interface.ts` / `.type.ts` files instead of `import type`
  3. Non-baseline heavy SDKs bundled into `main-*.js`
  4. `viewChild(SomeComponent)` / `viewChildren(SomeComponent)` class value queries that break `@defer` code-splitting
  5. Redundant nested `injectAsync()` hops & sequential `await import()` waterfalls
  6. Non-default eager routes (`component:` instead of `loadComponent:` in `app.routes.ts`)
  7. Static `@/features/...`, `@/core/...`, or relative `./features/...`, `./core/...` imports in `app.config.ts`
  8. Static `.json` assets bundled into `main-*.js`
- **4 CSS & Tailwind v4 Optimization Categories**:
  1. Dead / unused CSS selectors, orphan component `.css` files, and unused `--*` custom properties
  2. Short static `@apply` rules (`<= 3` utilities) safe to inline into HTML templates
  3. Partial static splits (base utilities vs. `hover:`/`focus:`/responsive variants)
  4. Duplicate `@apply` blocks within the same file or across component `.css` files, plus `@tailwindcss/postcss` `@property` overhead detection
- **Cached Self-Contained HTML Report**: Generates a zero-network-dependency interactive HTML report at `<os.tmpdir()>/bundle-audit-report-<hash>.html` with an **Open HTML Report** instruction in the terminal.

---

## Scope & CSS Support

- **Tailwind CSS v4 & Standard `.css` Files Only**: Source-level CSS static analysis (Categories 1–4, `@theme`, `@utility`, `@reference`, and `@apply` auditing) supports **Tailwind CSS v4** and standard `.css` files (`styleUrl` / `styleUrls` and global `.css` entries configured in `angular.json`).
- **No SCSS / Less / Sass Preprocessor Parsing**: `.scss`, `.sass`, and `.less` source files are not parsed by the source-level CSS auditor.
- **Chunk-Level Embedded Styles**: JavaScript chunk inspection (`Embedded Styles` byte and percentage breakdown per JS chunk) works for all Angular components regardless of whether styles originated from `styleUrl` or inline `styles: [...]`.

---

## Installation

### Option 1: Install as an Antigravity CLI (`agy`) Plugin

You can install `angular-bundle-guard` directly as an Antigravity plugin so that `/angular-bundle-guard` is available across all workspaces:

```bash
# To install an Antigravity plugin directly from a GitHub repository
agy plugin install https://github.com/railsstudent/angular-bundle-guard

# Install from a local clone via Antigravity CLI
git clone https://github.com/railsstudent/angular-bundle-guard.git
agy plugin install ./angular-bundle-guard

# Or copy directly into your global Antigravity plugins directory
mkdir -p ~/.gemini/config/plugins
cp -R /path/to/angular-bundle-guard ~/.gemini/config/plugins/angular-bundle-guard
```

Verify the plugin manifest with:

```bash
agy plugin validate ~/.gemini/config/plugins/angular-bundle-guard
```

Once installed, activate the skill in Antigravity by typing `/angular-bundle-guard` or asking:

- *"Check the bundle size"*
- *"How can I reduce the main.js bundle size?"*
- *"Audit lazy chunks and component CSS"*

---

### Option 2: Install via `npx skills add`

You can install the skill into an individual Angular project (or globally) using the [`skills` CLI](https://github.com/vercel-labs/skills):

```bash
# Add to the current Angular project (.agents/skills/angular-bundle-guard)
npx skills add https://github.com/railsstudent/angular-bundle-guard
# (or using GitHub owner/repo shorthand: npx skills add railsstudent/angular-bundle-guard)

# Add globally for your user account
npx skills add https://github.com/railsstudent/angular-bundle-guard -g
# (or using GitHub owner/repo shorthand: npx skills add railsstudent/angular-bundle-guard -g)

# Or install from a local checkout
npx skills add /path/to/angular-bundle-guard
```

---

## CLI Usage

The skill's bundled analyzer script can also be executed directly from the root of any Angular workspace:

```bash
# Auto-detect single application project in angular.json
node <skill-dir>/scripts/analyze-bundle.mjs

# Specify target application project in a multi-project workspace
node <skill-dir>/scripts/analyze-bundle.mjs <project-name>

# Force a fresh production stats build before analyzing
node <skill-dir>/scripts/analyze-bundle.mjs <project-name> --rebuild
```

---

## Repository Structure

```text
angular-bundle-guard/
├── plugin.json                                     # Antigravity plugin manifest
├── README.md                                       # Installation & usage guide
├── GLOSSARY.md                                     # Core domain terminology
├── LICENSE.txt                                     # MIT License
└── skills/
    └── angular-bundle-guard/
        ├── SKILL.md                                # Skill instructions & workflow
        ├── references/
        │   └── audit-reference.md                  # Deep-dive remediation playbooks
        └── scripts/
            ├── analyze-bundle.mjs                  # Main CLI entry point
            ├── bundle-utils.mjs                    # Stats discovery, freshness, & leak helpers
            ├── vector-audit.mjs                    # 8 Initial Bundle Vectors scanner
            ├── css-audit.mjs                       # Component & global CSS orchestrator
            ├── css-apply-rules.mjs                 # @apply classification (Categories 2 & 3)
            ├── css-duplicates.mjs                  # Intra-file & cross-file duplicate detector
            ├── css-theme-audit.mjs                 # @theme, CSS variables, & PostCSS check
            ├── html-report.mjs                     # SHA-256 caching & HTML report builder
            ├── html-sections.mjs                   # HTML table & collapsible section renderers
            └── report.css                          # Offline dark-theme report stylesheet
```

---

## License

[MIT](./LICENSE.txt)
