# Partials

Reusable HTML partial templates.

## Structure

```
partials/
├── nav.html       # Navigation bar
├── header.html    # Page header
└── footer.html    # Footer
```

## Usage

Partials are loaded dynamically into pages via JavaScript:

```html
<nav id="nav-container"></nav>
<header id="header-container"></header>
<footer id="footer-container"></footer>
```

```js
// Load partial via fetch
fetch('/partials/nav.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('nav-container').innerHTML = html;
  });
```

## Note

For production, consider using a build tool or server-side includes for better performance.
