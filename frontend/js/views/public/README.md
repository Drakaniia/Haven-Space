# Public JavaScript

JavaScript modules for public-facing views.

## Status

This directory is reserved for future public view logic. Currently, public page functionality is handled by:

- `main.js` - Global components (logo cloud, sidebar, floating header)
- `js/auth/` - Authentication page logic

## Planned Files

| File        | Description                   |
| ----------- | ----------------------------- |
| `public.js` | Homepage interactions         |
| `maps.js`   | Interactive map functionality |

## Exports (Planned)

```javascript
// public.js
export function initPublic() {}

// maps.js
export function initMaps() {}
```

## Usage (Future)

```html
<!-- Homepage -->
<script type="module" src="../../../js/views/public/public.js"></script>

<!-- Maps -->
<script type="module" src="../../../js/views/public/maps.js"></script>
```
