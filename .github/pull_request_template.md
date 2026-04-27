## What was done

<!-- Briefly describe the changes made in this PR -->

- Added new accessibility skill with A11Y patterns and WCAG references
- Added SEO skill implementation
- Updated frontend design skill structure
- Added new SVG icons (LocationPin, ViewOffSlashIcon, ameneties, chevron-left, chevron-right, lightbulb, location, viewicon)
- Created new pricing page for landlords with CSS and JavaScript
- Updated public pages (for-landlords, haven-ai, find-a-room, signup-landlord)
- Added notification controller and service for backend
- Updated AGENTS.md with new skill references
- Added test files for icon verification

## Changes

<!-- Provide more details about specific changes -->

### Frontend

- New pricing page (`client/views/landlord/pricing.html`)
- New CSS files for pricing and updated public pages
- New JavaScript for pricing functionality
- Updated signup-landlord and find-a-room pages
- Added 8 new SVG icons

### Backend

- New NotificationController and NotificationService
- Updated skill structure and references

## Testing

<!-- Describe how to test these changes -->

```bash
# Run frontend build
bun run build

# Run backend tests
composer test --working-dir functions
```

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Related Issue

<!-- Link to related issue(s) -->

Closes #79

## Checklist

- [ ] Code follows project style guidelines
- [ ] Commit messages follow Conventional Commits format
- [ ] I have reviewed my changes
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings
