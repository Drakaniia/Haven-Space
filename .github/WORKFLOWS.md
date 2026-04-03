# GitHub Actions CI/CD Workflows

This document describes the automated checks and PR review workflows configured for this project.

## Overview

The project uses GitHub Actions to automatically review pull requests and ensure code quality.

## Workflows

### 1. **PR Review Bot** (`.github/workflows/pr-review-bot.yml`)

**Trigger:** When a PR is opened, updated, or reopened

**What it does:**

- Runs Prettier formatting check
- Runs ESLint JavaScript code quality check
- Runs PHPStan PHP static analysis
- Posts a comprehensive review comment on the PR with:
  - Status table showing which checks passed/failed
  - Count of files changed by language
  - Recommendations for fixing issues
  - Creates a GitHub Check run with pass/fail status

**Example PR Comment:**

```
## ✅ Automated PR Review

All automated checks passed! Great work! 🎉

### Code Quality Checks

| Check | Status | Details |
| ----- | ------ | ------- |
| **Prettier** | ✅ Pass | ✅ Prettier formatting check passed |
| **ESLint** | ✅ Pass | ✅ ESLint check passed |
| **PHPStan** | ✅ Pass | ✅ PHPStan static analysis passed |
```

### 2. **ESLint Check** (`.github/workflows/eslint-check.yml`)

**Trigger:** Push or PR to main branch

**What it does:**

- Runs ESLint on all JavaScript files
- Checks for code quality issues, formatting, and best practices
- Fails the build if errors are found (warnings are allowed)

### 3. **PHPStan Check** (`.github/workflows/phpstan-check.yml`)

**Trigger:** Push or PR to main branch

**What it does:**

- Runs PHPStan static analysis on PHP code
- Detects bugs, type errors, and code smells
- Uses GitHub error format for inline annotations

### 4. **Security Audit** (`.github/workflows/security-audit.yml`)

**Trigger:** Push, PR to main, or weekly schedule (Monday 9 AM UTC)

**What it does:**

- **NPM Audit:** Checks for vulnerabilities in Node.js dependencies
- **Composer Audit:** Checks for vulnerabilities in PHP dependencies
- **CodeQL Security Analysis:** Performs deep security scanning of JavaScript code

### 5. **Prettier Check** (`.github/workflows/prettier-check.yml`)

**Trigger:** Push or PR to main branch

**What it does:**

- Ensures all code is formatted with Prettier
- Fails if any files need formatting

### 6. **Deploy to GitHub Pages** (`.github/workflows/github-pages.yml`)

**Trigger:** Push or PR to main branch

**What it does:**

- Builds the production version
- Deploys to GitHub Pages (only on main branch pushes)

## Local Development Commands

### JavaScript

```bash
# Check code quality
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### PHP

```bash
cd server

# Run PHPStan analysis
composer analyze

# Run tests
composer test
```

## Configuration Files

- **`.eslintrc.json`** - ESLint configuration
- **`.eslintignore`** - Files to exclude from ESLint
- **`server/phpstan.neon`** - PHPStan configuration
- **`.prettierrc`** - Prettier configuration

## Branch Protection Rules (Recommended)

To enforce these checks, configure branch protection in GitHub:

1. Go to **Settings → Branches → Branch protection rules**
2. Add rule for `main` branch
3. Enable:
   - ✅ **Require pull request reviews before merging**
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
4. Select required status checks:
   - `Automated PR Review`
   - `ESLint Code Quality`
   - `PHPStan Static Analysis`
   - `Prettier Check`

## What Gets Checked

### JavaScript (ESLint)

- ✅ Proper indentation (2 spaces)
- ✅ Single quotes
- ✅ Semicolons required
- ✅ Trailing commas in multi-line
- ✅ Curly braces after if/for/while
- ✅ No unused variables
- ✅ No undefined variables
- ✅ Const instead of var

### PHP (PHPStan - Level 5)

- ✅ Type safety
- ✅ Undefined variables
- ✅ Method signature mismatches
- ✅ Unreachable code
- ✅ Proper null handling

### Security

- ✅ Known vulnerabilities in dependencies
- ✅ SQL injection patterns
- ✅ XSS vulnerabilities
- ✅ Insecure cryptography

## Fixing Common Issues

### ESLint Issues

**Auto-fixable:**

```bash
npm run lint:fix  # Fixes most formatting issues
npm run format    # Fixes formatting with Prettier
```

**Manual fixes needed:**

- Unused variables: Remove or prefix with `_` if intentional
- Console statements: Remove debug `console.log` calls
- Missing curly braces: Add `{}` to if/for/while statements

### PHPStan Issues

```bash
cd server
composer analyze  # See detailed issues
```

Common fixes:

- Add proper type hints
- Handle null/undefined cases
- Fix method signatures

### Security Vulnerabilities

```bash
# Check Node dependencies
npm audit

# Check PHP dependencies
cd server
composer audit
```

## Workflow Status Badge

Add this to your README:

```markdown
[![PR Review Bot](https://github.com/username/repo/actions/workflows/pr-review-bot.yml/badge.svg)](https://github.com/username/repo/actions/workflows/pr-review-bot.yml)
[![Security Audit](https://github.com/username/repo/actions/workflows/security-audit.yml/badge.svg)](https://github.com/username/repo/actions/workflows/security-audit.yml)
```

## Customization

### Adjust ESLint Rules

Edit `.eslintrc.json`:

```json
{
  "rules": {
    "no-console": "off", // Allow console statements
    "indent": ["error", 4] // Change to 4 spaces
  }
}
```

### Adjust PHPStan Level

Edit `server/phpstan.neon`:

```neon
parameters:
    level: 6  # Increase strictness (0-9, 9 is strictest)
```

### Change Workflow Schedule

Edit `.github/workflows/security-audit.yml`:

```yaml
schedule:
  - cron: '0 9 * * 1' # Monday 9 AM UTC
```

Use [crontab.guru](https://crontab.guru) to customize the schedule.

## Troubleshooting

### Workflow Not Running

- Check if the workflow file is in `.github/workflows/`
- Verify YAML syntax at [YAML Lint](https://yamllint.com)
- Check GitHub Actions tab for error logs

### False Positives

- Add specific ignores to ESLint: `// eslint-disable-next-line`
- Add PHPStan ignores: See `server/phpstan.neon`
- Report issues in GitHub Issues

### Performance

- Workflows run in parallel for faster feedback
- PHPStan caches results automatically
- Consider using `actions/cache` for dependencies
