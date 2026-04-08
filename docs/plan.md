# Haven Space - Project Planning Documentation

## Future Plans & Roadmap

### SCSS Migration (Planned)

**Status:** Not started - Future consideration

**Overview:**
Migrate from standard CSS to SCSS (Sassy CSS) to improve maintainability, reusability, and developer experience.

**Motivation:**

- Better code organization through nesting and modular imports
- Reusable mixins for common patterns (responsive breakpoints, animations)
- Variables with better tooling support (`$variables` vs `--custom-properties`)
- Functions for color manipulation and calculations
- `@extend` for DRY style inheritance

**Migration Steps:**

1. Install SCSS compiler / configure build tool (e.g., Dart Sass)
2. Update `package.json` with SCSS dependencies
3. Rename `.css` files to `.scss` incrementally
4. Convert CSS custom properties to SCSS variables where appropriate
5. Implement nesting for component styles
6. Create mixin library for reusable patterns
7. Update build scripts to compile SCSS → CSS
8. Test all dashboard views for style regressions

**Considerations:**

- Maintain CSS custom properties for runtime-dynamic values (theme switching)
- Use SCSS variables for static design tokens (colors, spacing, typography)
- Keep file structure modular: `scss/components/`, `scss/views/`, `scss/abstracts/`
- Ensure GitHub Actions workflow compiles SCSS before deployment

**Estimated Impact:**

- Developer experience: **High** (easier maintenance, less repetition)
- Performance: **Neutral** (SCSS compiles to standard CSS)
- Build complexity: **Low** (minimal configuration required)

---

## Related Documentation

- [Contributing Guidelines](../.github/CONTRIBUTING.md)
- [Frontend README](../client/README.md)
- [Backend README](../server/Readme.md)
