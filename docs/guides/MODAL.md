## Modal Pattern

This is the standard modal implementation used across the app (e.g., the Announcements modal). Copy this pattern for any new modal.

### Structure

```html
<!-- Overlay sits at the root of the view, outside other content -->
<div class="landlord-modal-overlay" id="announcement-modal-overlay">
  <div class="landlord-announcement-form-container">
    <!-- header -->
    <div class="landlord-form-header">
      <h2 id="modal-title">Create New Announcement</h2>
      <button class="landlord-close-form" id="close-form-btn">✕</button>
    </div>
    <!-- form content -->
    <form class="landlord-form" id="announcement-form">
      <!-- fields -->
      <div class="landlord-form-actions">
        <button type="button" class="landlord-btn landlord-btn-outline" id="cancel-btn">
          Cancel
        </button>
        <button type="submit" class="landlord-btn landlord-btn-primary">
          Publish Announcement
        </button>
      </div>
    </form>
  </div>
</div>
```

### Overlay CSS

```css
/* Overlay: fades in/out via opacity + visibility toggle */
.landlord-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5); /* semi-transparent dark backdrop */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.landlord-modal-overlay.active {
  opacity: 1;
  visibility: visible;
}
```

### Modal Container CSS

```css
/* Container: scales + slides up on enter, reverses on exit */
.landlord-announcement-form-container {
  background-color: var(--dashboard-surface); /* white / dark-mode surface */
  border: 1px solid var(--dashboard-border);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  /* default (hidden) state */
  transform: scale(0.95) translateY(-20px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* active (visible) state */
.landlord-modal-overlay.active .landlord-announcement-form-container {
  transform: scale(1) translateY(0);
}
```

### Form Inputs CSS

```css
/* Inputs, selects, textareas share the same base style */
.landlord-form-input,
.landlord-form-select,
.landlord-form-textarea {
  padding: 12px 16px;
  border: 1px solid var(--dashboard-border);
  border-radius: 8px;
  font-size: 14px;
  font-family: var(--font-main);
  background-color: var(--bg-cream); /* #fef9f0 light / #1e293b dark */
  transition: border-color 0.2s ease;
}

.landlord-form-input:focus,
.landlord-form-select:focus,
.landlord-form-textarea:focus {
  outline: none;
  border-color: var(--primary-green); /* #4a7c23 */
}

/* Placeholder color inherits from --dashboard-text-secondary (muted gray) */
.landlord-form-input::placeholder,
.landlord-form-textarea::placeholder {
  color: var(--dashboard-text-secondary);
}
```

### Buttons CSS

```css
/* Base button */
.landlord-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

/* Cancel — outline style */
.landlord-btn-outline {
  background-color: var(--white);
  border: 2px solid var(--primary-green); /* #4a7c23 */
  color: var(--primary-green);
}
.landlord-btn-outline:hover {
  background-color: var(--bg-green); /* #e8f5e9 */
}

/* Primary action (Publish / Submit) */
.landlord-btn-primary {
  background-color: var(--primary-green); /* #4a7c23 */
  color: var(--white);
}
.landlord-btn-primary:hover {
  background-color: var(--dark-green); /* #2d4a14 */
}
```

### JS Open / Close Pattern

```javascript
function showModal() {
  document.getElementById('modal-overlay').classList.add('active');
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  // wait for CSS transition to finish before resetting form
  setTimeout(() => {
    document.getElementById('my-form').reset();
  }, 300);
}

// Close on backdrop click
overlay.addEventListener('click', e => {
  if (e.target === overlay) hideModal();
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('active')) hideModal();
});
```

### Key Values at a Glance

| Property                       | Value                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| Backdrop                       | `rgba(0, 0, 0, 0.5)`                                       |
| Overlay transition             | `opacity 0.3s ease, visibility 0.3s ease`                  |
| Container enter                | `scale(0.95) translateY(-20px)` → `scale(1) translateY(0)` |
| Container easing               | `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)               |
| Container duration             | `0.3s`                                                     |
| Input background               | `var(--bg-cream)` → `#fef9f0`                              |
| Input border                   | `var(--dashboard-border)`                                  |
| Input focus border             | `var(--primary-green)` → `#4a7c23`                         |
| Placeholder color              | `var(--dashboard-text-secondary)`                          |
| Primary button bg              | `var(--primary-green)` → `#4a7c23`                         |
| Primary button hover           | `var(--dark-green)` → `#2d4a14`                            |
| Cancel button border           | `var(--primary-green)` → `#4a7c23`                         |
| Cancel button hover bg         | `var(--bg-green)` → `#e8f5e9`                              |
| Border radius (container)      | `16px`                                                     |
| Border radius (inputs/buttons) | `8px`                                                      |

---
