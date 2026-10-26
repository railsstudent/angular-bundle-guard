# Domain Glossary

This glossary defines the core domain terminology used by **Angular Bundle Guard** across its CLI summary, HTML audit report, and 8-vector / 4-category analysis engine.

| Term | Definition |
| :--- | :--- |
| **Initial Bundle (`main-*.js`)** | The primary entry-point JavaScript bundle downloaded and executed synchronously when the Angular application boots. |
| **Lazy Chunk (`chunk-*.js`)** | Any secondary JavaScript bundle emitted by the Angular compiler and loaded on demand via `loadComponent`, `loadChildren`, `@defer`, or dynamic `import()`. |
| **Baseline Startup Package** | One of the 7 foundational runtime packages expected in `main-*.js` without triggering a leak alert: `@angular/core`, `@angular/common`, `@angular/platform-browser`, `@angular/router`, `@angular/service-worker`, `rxjs`, and `tslib`. |
| **Eager Leak** | Any non-baseline third-party package, feature component, service, or static asset that is inadvertently hoisted into `main-*.js` through a static import chain instead of being code-split into a lazy chunk. |
| **Embedded Component Styles** | CSS strings compiled directly into a JavaScript chunk (`styles: [...]`) from a component's `styleUrl`, `styleUrls`, or inline `styles` metadata. |
| **Tailwind `@property` Overhead** | The ~1.5 KB to 4.5 KB block of CSS `@property --tw-*` declarations that Tailwind CSS v4 appends to each component stylesheet using `@reference` unless `@tailwindcss/postcss` is configured with `{ "optimize": false }`. |
| **Short Static `@apply` Rule** | A component CSS class containing `<= 3` static Tailwind utilities (no pseudo-variants like `hover:` or `focus:`) that is referenced exclusively in static `class="..."` attributes and can be inlined directly into the template. |
| **Partial Static Split** | A component CSS class combining base static Tailwind utilities with pseudo-state or responsive variants (e.g., `hover:`, `focus-visible:`, `sm:`), where the base utilities can be moved to the HTML `class="..."` attribute while the CSS rule retains only the state/responsive utilities. |
| **Global CSS Override** | A rule where a component `.css` file redefines a selector name that already exists in a global stylesheet (`styles.css` or its `@import` chain), exempting that selector from dead-code and single-use inlining flags. |
