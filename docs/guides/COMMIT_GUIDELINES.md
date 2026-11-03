# Commit Message Guidelines

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (white-space, formatting, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

## Examples

### Good Commit Messages ✅

```
feat: add Send Announcement navigation to landlord dashboard
fix: correct payment status display on boarder dashboard
docs: update API documentation for room endpoints
style: format landlord dashboard CSS
refactor: simplify authentication logic
perf: optimize database queries for property listings
test: add unit tests for payment service
build: update dependencies to latest versions
ci: add GitHub Actions workflow for deployment
chore: update .gitignore
```

### Bad Commit Messages ❌

```
feat: digalTzy (unclear description)
update stuff (no type)
Fixed bug (no type, capitalized)
feat: Added new feature. (ends with period)
FEAT: new feature (type should be lowercase)
```

## Rules

1. **Type must be lowercase**: `feat` not `FEAT`
2. **Subject must not be empty**: Provide a clear description
3. **Subject must not end with a period**: `feat: add feature` not `feat: add feature.`
4. **Header max length**: 100 characters
5. **Use imperative mood**: "add feature" not "added feature" or "adds feature"

## Current Commit

For your current changes (fixing Send Announcement navigation), use:

```bash
git commit -m "fix: correct Send Announcement navigation on landlord dashboard"
```

Or with more detail:

```bash
git commit -m "fix: correct Send Announcement navigation on landlord dashboard

Changed href from ../messages/index.html to announcements/index.html
to properly navigate to the announcements page when clicking the
Send Announcement button in Quick Actions."
```
