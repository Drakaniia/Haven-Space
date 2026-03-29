#!/usr/bin/env node

/**
 * Build script for production deployment
 * Copies public-facing files to dist folder with flat structure
 * and fixes relative paths for root deployment
 */

import { copyFileSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'client');
const DIST = join(ROOT, 'dist');

// Clean dist folder
if (existsSync(DIST)) {
  try {
    rmSync(DIST, { recursive: true, force: true });
  } catch (error) {
    console.warn(
      `⚠️  Warning: Could not delete ${DIST}, will attempt to overwrite: ${error.message}`
    );
  }
}
mkdirSync(DIST, { recursive: true });

// Copy public views to root of dist
const publicFiles = [
  'views/public/index.html',
  'views/public/maps.html',
  'views/public/auth/login.html',
  'views/public/auth/signup.html',
  'views/public/auth/forgot-password.html',
  'views/boarder/index.html',
  'views/boarder/maps/index.html',
];

// Copy CSS files
const cssFiles = [
  'css/global.css',
  'css/views/public/public.css',
  'css/views/public/auth.css',
  'css/views/public/maps.css',
  'css/views/boarder/boarder.css',
  'css/views/boarder/maps.css',
  'css/components/logo-cloud.css',
  'css/components/sidebar.css',
];

// Copy JS files
const jsFiles = [
  'js/main.js',
  'js/components/logo-cloud.js',
  'js/components/navbar.js',
  'js/components/sidebar.js',
  'js/shared/state.js',
  'js/views/landing/landing.js',
  'js/views/boarder/dashboard.js',
  'js/auth/login.js',
  'js/auth/signup.js',
  'js/auth/forgot-password.js',
];

// Copy images
const imageFiles = [
  'assets/images/public/login.png',
  'assets/images/public/PrimeRealEstate.png',
  'assets/images/Haven_Space_Logo.png',
  'assets/images/nvidia.svg',
  'assets/svg/google-icon-logo.svg',
  'assets/svg/apple-dark-logo.svg',
];

console.log('Building for production...');

// Helper to copy file and create directories
function copyFile(src, dest) {
  const srcPath = join(SRC, src);
  const destPath = join(DIST, dest);

  if (!existsSync(srcPath)) {
    console.warn(`⚠️  Warning: ${srcPath} not found, skipping...`);
    return;
  }

  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
  console.log(`✓ Copied ${src} → ${dest}`);
}

// Helper to fix relative paths in HTML files
function fixPaths(htmlContent, depth) {
  // Calculate how many levels up we need to go
  const prefix = '../'.repeat(depth);

  // Fix CSS paths (../../css/ -> /css/ or css/)
  let fixed = htmlContent.replace(/(href=["'])(\.\.\/)*(css\/[^"']+\.css["'])/g, `$1${prefix}$3`);

  // Fix JS paths (../../js/ -> /js/ or js/)
  fixed = fixed.replace(/(src=["'])(\.\.\/)*(js\/[^"']+\.js["'])/g, `$1${prefix}$3`);

  // Fix image paths (../../assets/ -> /assets/ or assets/)
  fixed = fixed.replace(
    /(src=["'])(\.\.\/)*(assets\/[^"']+\.(png|jpg|svg|webp)["'])/g,
    `$1${prefix}$3`
  );

  // Fix auth page links (auth/login.html -> /auth/login.html or auth/login.html)
  fixed = fixed.replace(/(href=["'])(\.\.\/)*auth\//g, `$1${prefix}auth/`);

  // Fix maps.html link
  fixed = fixed.replace(/(href=["'])maps\.html(["'])/g, `$1${prefix}maps.html$2`);

  return fixed;
}

// Copy public HTML files to root with path fixes
publicFiles.forEach(file => {
  // Extract only the last parts: auth/login.html, boarder/index.html, or index.html (from views/public/...)
  const parts = file.split('/');
  const fileName = parts.pop(); // login.html, index.html, etc.
  const subfolder = parts.pop(); // 'auth', 'boarder', 'public', or 'maps'

  const srcPath = join(SRC, file);

  // Determine destination path based on folder structure
  let destPath;
  let depth = 0;

  if (subfolder === 'auth') {
    // Keep auth files in auth/ subfolder
    destPath = join(DIST, 'auth', fileName);
    depth = 1;
  } else if (subfolder === 'boarder') {
    // Keep boarder files in boarder/ subfolder
    destPath = join(DIST, 'boarder', fileName);
    depth = 1;
  } else if (subfolder === 'maps' && parts[parts.length - 1] === 'boarder') {
    // Keep boarder maps files in boarder/maps/ subfolder
    destPath = join(DIST, 'boarder', 'maps', fileName);
    depth = 2;
  } else {
    // Put other files at root
    destPath = join(DIST, fileName);
    depth = 0;
  }

  if (!existsSync(srcPath)) {
    console.warn(`⚠️  Warning: ${srcPath} not found, skipping...`);
    return;
  }

  // Read and fix paths
  let content = readFileSync(srcPath, 'utf8');

  content = fixPaths(content, depth);

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, content);

  // Determine relative path for console output
  const relativePath =
    subfolder === 'auth'
      ? 'auth/'
      : subfolder === 'boarder'
      ? 'boarder/'
      : subfolder === 'maps'
      ? 'boarder/maps/'
      : '';
  console.log(`✓ Processed ${file} → ${relativePath}${fileName}`);
});

// Copy CSS to css/ folder
cssFiles.forEach(file => {
  copyFile(file, file);
});

// Copy JS to js/ folder
jsFiles.forEach(file => {
  copyFile(file, file);
});

// Copy images to assets/ folder
imageFiles.forEach(file => {
  copyFile(file, file);
});

console.log('\n✅ Build complete! Production files are in ./dist');
console.log('\nURLs will now be:');
console.log('  havenspace.com/ → Homepage');
console.log('  havenspace.com/maps.html → Map view');
console.log('  havenspace.com/auth/login.html → Login page');
console.log('  havenspace.com/auth/signup.html → Signup page');
console.log('  havenspace.com/boarder/ → Boarder dashboard');
console.log('  havenspace.com/boarder/maps/ → Boarder map view');
