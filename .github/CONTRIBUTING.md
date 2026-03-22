# Contributing to Haven-Space

Thank you for contributing to Haven-Space! This document provides guidelines for commits, pull requests, and general contribution standards.

---

## Table of Contents

- [Commit Message Format](#commit-message-format)
- [Commit Types](#commit-types)
- [Branch Naming Convention](#branch-naming-convention)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Code Style](#code-style)
- [Development Workflow](#development-workflow)

---

## Commit Message Format

We follow the **Conventional Commits** specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Structure

| Part          | Description                          | Required    |
| ------------- | ------------------------------------ | ----------- |
| `type`        | The type of change (see below)       | ✅ Yes      |
| `scope`       | The section of the codebase affected | ❌ Optional |
| `description` | Short summary of the change          | ✅ Yes      |
| `body`        | Detailed explanation                 | ❌ Optional |
| `footer`      | Related issues, breaking changes     | ❌ Optional |

### Examples

```bash
# Good commits
git commit -m "feat: add user authentication system"
git commit -m "fix(css): resolve navigation overflow on mobile"
git commit -m "docs: update README with setup instructions"
git commit -m "refactor(js): simplify API error handling"

# With scope
git commit -m "feat(auth): implement JWT token refresh"
git commit -m "fix(ui): correct button alignment in header"

# With body
git commit -m "feat: add dark mode toggle

- Add theme switcher component
- Store preference in localStorage
- Update CSS variables for dark theme

Closes #42"
```

---

## Commit Types

| Type       | Description      | When to Use                                 |
| ---------- | ---------------- | ------------------------------------------- |
| `feat`     | New feature      | Adding new functionality                    |
| `fix`      | Bug fix          | Fixing a bug or error                       |
| `docs`     | Documentation    | Updating docs, README, comments             |
| `style`    | Formatting       | Code style changes (whitespace, semicolons) |
| `refactor` | Code refactoring | Restructuring without changing behavior     |
| `test`     | Tests            | Adding or updating tests                    |
| `chore`    | Maintenance      | Build process, dependencies, config         |
| `perf`     | Performance      | Improving performance                       |
| `ci`       | CI/CD            | GitHub Actions, workflows                   |
| `build`    | Build system     | Webpack, Vite, bundler changes              |
| `setup`    | Initial setup    | Project scaffolding, architecture           |

---

## Branch Naming Convention

Format: `<type>/<description>`

| Type       | Description           |
| ---------- | --------------------- |
| `feat`     | New feature           |
| `fix`      | Bug fix               |
| `docs`     | Documentation         |
| `refactor` | Refactoring           |
| `chore`    | Maintenance           |
| `hotfix`   | Urgent production fix |

### Examples

```bash
git checkout -b feat/user-authentication
git checkout -b fix/navigation-mobile-overflow
git checkout -b docs/update-readme
git checkout -b refactor/api-error-handling
git checkout -b hotfix/critical-security-patch
```

---

## Pull Request Guidelines

### PR Title Format

Use the same format as commit messages:

```
<type>(<scope>): <description>
```

### PR Description Template

````markdown
## What was done

- Brief list of changes made

## Changes

### Feature/Area

- Specific change 1
- Specific change 2

## Testing

How to test these changes:

```bash
# Commands to run
```
````

## Related Issue

Closes #<issue-number>

````

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Commit messages follow Conventional Commits format
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings

### Review Process

1. Create branch from `main`
2. Make changes and commit
3. Push branch to GitHub
4. Create PR with description
5. Wait for review
6. Address feedback
7. Merge when approved

---

## Code Style

### JavaScript

- Use ES6+ features where appropriate
- Prefer `const` over `let` (use `let` only when reassignment is needed)
- Use meaningful variable names
- Add JSDoc comments for complex functions

```javascript
// ✅ Good
const API_BASE_URL = '/api';

async function fetchUser(id) {
  const response = await fetch(`${API_BASE_URL}/users/${id}`);
  return response.json();
}

// ❌ Avoid
var x = 10;
function getData(i) { ... }
````

### CSS

- Use CSS custom properties (variables)
- Follow BEM-like naming for classes
- Organize styles logically

```css
/* ✅ Good */
.card {
}
.card-header {
}
.card-body {
}
.card--featured {
}

/* ❌ Avoid */
.crd {
}
.cardHeader {
}
```

### HTML

- Use semantic elements
- Include `alt` attributes for images
- Keep indentation consistent (2 spaces)

```html
<!-- ✅ Good -->
<article class="property-card">
  <img src="..." alt="Property exterior view" />
  <h3>Property Name</h3>
</article>

<!-- ❌ Avoid -->
<div class="card">
  <img src="..." />
  <div>Property Name</div>
</div>
```

---

## Development Workflow

### 1. Setup

```bash
git clone https://github.com/Drakaniia/Haven-Space.git
cd Haven-Space
npm install
```

### 2. Create Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

### 3. Make Changes

```bash
# Edit files
git add .
git commit -m "feat: add your feature"
```

### 4. Push and Create PR

```bash
git push -u origin feat/your-feature-name
# Then create PR on GitHub
```

### 5. Keep Branch Updated

```bash
git fetch origin
git rebase origin/main
```

---

## Questions?

- Open an issue for questions or suggestions
- Check existing issues before creating new ones
- Be respectful and constructive in discussions

---

**Thank you for contributing!** 🎉
