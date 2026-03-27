# Haven Space - Assets

Static assets for the frontend application.

## Directory Structure

```
assets/
├── images/              # Image files (logos, illustrations, photos)
│   └── public/          # Public-facing images
│       ├── login.png    # Login page illustration
│       └── PrimeRealEstate.png  # Partner logo
└── nvidia.svg           # NVIDIA logo SVG
```

## Current Assets

### Images

| File                                | Description             | Usage                         |
| ----------------------------------- | ----------------------- | ----------------------------- |
| `images/nvidia.svg`                 | NVIDIA Corporation logo | Logo cloud / partners section |
| `images/public/login.png`           | Login page illustration | Authentication pages          |
| `images/public/PrimeRealEstate.png` | Prime Real Estate logo  | Logo cloud / partners section |

## Usage

Reference assets with relative paths from the client directory:

```html
<!-- Logo in logo cloud -->
<img src="./assets/images/nvidia.svg" alt="NVIDIA" />

<!-- Login illustration -->
<img src="./assets/images/public/login.png" alt="Login" />
```

Or with absolute paths from the root:

```html
<img src="/client/assets/images/public/login.png" alt="Login" />
```

## Adding New Assets

1. **Images**: Place in `images/` or `images/public/` depending on usage
2. **SVGs**: Place in root `assets/` directory for easy access
3. **Optimization**: Compress images before adding to reduce bundle size
4. **Naming**: Use descriptive, lowercase names with hyphens (e.g., `hero-banner.png`)

## Notes

- All images should be optimized for web use
- SVG files are preferred for logos and icons
- Consider using WebP format for photos with PNG fallbacks
