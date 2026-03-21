# CSS Stylesheets

Styles organized using a component-based architecture.

## Structure

```
css/
├── global.css           # CSS variables, reset, base styles, utilities
├── components/          # Reusable component styles
│   ├── nav.css          # Navigation, header, sidebar
│   ├── buttons.css      # Button variants
│   ├── cards.css        # Cards, property cards, stats
│   └── forms.css        # Forms, inputs, search, filters
└── views/               # View-specific styles
    ├── landing.css      # Landing page styles
    ├── landlord.css     # Landlord dashboard styles
    ├── boarder.css      # Boarder dashboard styles
    └── admin.css        # Admin dashboard styles
```

## Usage

Include stylesheets in HTML views:

```html
<link rel="stylesheet" href="/css/global.css">
<link rel="stylesheet" href="/css/components/buttons.css">
<link rel="stylesheet" href="/css/views/landlord.css">
```

## Features

- **CSS Custom Properties**: Theme variables in `global.css`
- **Dark Theme**: Toggle via `data-theme="dark"` attribute
- **Responsive**: Mobile-first breakpoints
- **Utility Classes**: Common utilities in `global.css`
