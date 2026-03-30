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
  // Public pages
  'views/public/index.html',
  'views/public/maps.html',
  'views/public/auth/login.html',
  'views/public/auth/signup.html',
  'views/public/auth/forgot-password.html',
  // Admin pages
  'views/admin/index.html',
  // Boarder pages
  'views/boarder/index.html',
  'views/boarder/maps/index.html',
  'views/boarder/applications/index.html',
  'views/boarder/applications/detail.html',
  'views/boarder/maintenance/index.html',
  'views/boarder/maintenance/create.html',
  'views/boarder/messages/index.html',
  'views/boarder/notices/index.html',
  'views/boarder/payments/index.html',
  'views/boarder/payments/pay.html',
  'views/boarder/profile/index.html',
  'views/boarder/rooms/index.html',
  'views/boarder/rooms/detail.html',
  // Landlord pages
  'views/landlord/index.html',
  'views/landlord/maps/index.html',
  'views/landlord/applications/index.html',
  'views/landlord/applications/detail.html',
  'views/landlord/boarders/index.html',
  'views/landlord/boarders/detail.html',
  'views/landlord/listings/index.html',
  'views/landlord/listings/create.html',
  'views/landlord/listings/edit.html',
  'views/landlord/maintenance/index.html',
  'views/landlord/maintenance/detail.html',
  'views/landlord/messages/index.html',
  'views/landlord/myproperties/index.html',
  'views/landlord/payments/index.html',
  'views/landlord/payments/record.html',
  'views/landlord/profile/index.html',
  'views/landlord/reports/index.html',
];

// Copy CSS files
const cssFiles = [
  'css/global.css',
  // Public CSS
  'css/views/public/public.css',
  'css/views/public/auth.css',
  'css/views/public/maps.css',
  // Admin CSS
  'css/views/admin/admin.css',
  // Boarder CSS
  'css/views/boarder/boarder.css',
  'css/views/boarder/maps.css',
  'css/views/boarder/boarder-applications.css',
  'css/views/boarder/boarder-maintenance.css',
  'css/views/boarder/boarder-payments.css',
  'css/views/boarder/boarder-rooms.css',
  // Landlord CSS
  'css/views/landlord/landlord.css',
  'css/views/landlord/maps.css',
  'css/views/landlord/landlord-applications.css',
  'css/views/landlord/landlord-listings.css',
  'css/views/landlord/landlord-maintenance.css',
  'css/views/landlord/landlord-payments.css',
  'css/views/landlord/create-listing.css',
  'css/views/landlord/edit-property.css',
  'css/views/landlord/your-properties.css',
  // Components
  'css/components/logo-cloud.css',
  'css/components/sidebar.css',
  'css/components/navbar.css',
];

// Copy JS files
const jsFiles = [
  'js/main.js',
  'js/components/logo-cloud.js',
  'js/components/navbar.js',
  'js/components/sidebar.js',
  'js/shared/state.js',
  // Landing
  'js/views/landing/landing.js',
  // Admin
  'js/views/admin/admin.js',
  // Boarder
  'js/views/boarder/dashboard.js',
  'js/views/boarder/boarder.js',
  'js/views/boarder/boarder-applications.js',
  'js/views/boarder/boarder-maintenance.js',
  'js/views/boarder/boarder-payments.js',
  'js/views/boarder/boarder-rooms.js',
  // Landlord
  'js/views/landlord/landlord.js',
  'js/views/landlord/maps.js',
  'js/views/landlord/landlord-applications.js',
  'js/views/landlord/landlord-listings.js',
  'js/views/landlord/landlord-maintenance.js',
  'js/views/landlord/landlord-payments.js',
  'js/views/landlord/create-listing.js',
  'js/views/landlord/edit-property.js',
  'js/views/landlord/my-properties.js',
  'js/views/landlord/your-properties.js',
  // Auth
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
  // Extract path parts to determine destination
  const parts = file.split('/'); // e.g., ['views', 'boarder', 'applications', 'index.html']
  const fileName = parts.pop(); // 'index.html'
  const subfolder = parts.pop(); // e.g., 'applications', 'auth', 'maps'
  const parentFolder = parts.pop(); // e.g., 'boarder', 'landlord', 'public'

  const srcPath = join(SRC, file);

  // Determine destination path based on folder structure
  let destPath;
  let depth = 0;

  // Build the destination path based on parent and subfolder
  if (parentFolder === 'public') {
    if (subfolder === 'auth') {
      // Keep auth files in auth/ subfolder
      destPath = join(DIST, 'auth', fileName);
      depth = 1;
    } else {
      // Put other public files at root
      destPath = join(DIST, fileName);
      depth = 0;
    }
  } else if (parentFolder === 'admin') {
    // Keep admin files in admin/ subfolder
    destPath = join(DIST, 'admin', fileName);
    depth = 1;
  } else if (parentFolder === 'boarder') {
    if (subfolder === 'maps') {
      // Keep boarder maps files in boarder/maps/ subfolder
      destPath = join(DIST, 'boarder', 'maps', fileName);
      depth = 2;
    } else {
      // Keep other boarder files in boarder/ subfolder
      destPath = join(DIST, 'boarder', subfolder, fileName);
      depth = 2;
    }
  } else if (parentFolder === 'landlord') {
    if (subfolder === 'maps') {
      // Keep landlord maps files in landlord/maps/ subfolder
      destPath = join(DIST, 'landlord', 'maps', fileName);
      depth = 2;
    } else {
      // Keep other landlord files in landlord/ subfolder
      destPath = join(DIST, 'landlord', subfolder, fileName);
      depth = 2;
    }
  } else {
    // Fallback: put at root
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
    parentFolder === 'public' && subfolder === 'auth'
      ? 'auth/'
      : parentFolder === 'admin'
      ? 'admin/'
      : parentFolder === 'boarder' && subfolder === 'maps'
      ? 'boarder/maps/'
      : parentFolder === 'boarder'
      ? `boarder/${subfolder}/`
      : parentFolder === 'landlord' && subfolder === 'maps'
      ? 'landlord/maps/'
      : parentFolder === 'landlord'
      ? `landlord/${subfolder}/`
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
console.log('\n  Public:');
console.log('    havenspace.com/ → Homepage');
console.log('    havenspace.com/maps.html → Map view');
console.log('    havenspace.com/auth/login.html → Login page');
console.log('    havenspace.com/auth/signup.html → Signup page');
console.log('    havenspace.com/auth/forgot-password.html → Forgot Password');
console.log('\n  Admin:');
console.log('    havenspace.com/admin/ → Admin Dashboard');
console.log('\n  Boarder:');
console.log('    havenspace.com/boarder/ → Dashboard');
console.log('    havenspace.com/boarder/maps/ → Map view');
console.log('    havenspace.com/boarder/applications/ → Applications');
console.log('    havenspace.com/boarder/maintenance/ → Maintenance');
console.log('    havenspace.com/boarder/messages/ → Messages');
console.log('    havenspace.com/boarder/notices/ → Notices');
console.log('    havenspace.com/boarder/payments/ → Payments');
console.log('    havenspace.com/boarder/profile/ → Profile');
console.log('    havenspace.com/boarder/rooms/ → Rooms');
console.log('\n  Landlord:');
console.log('    havenspace.com/landlord/ → Dashboard');
console.log('    havenspace.com/landlord/maps/ → Map view');
console.log('    havenspace.com/landlord/applications/ → Applications');
console.log('    havenspace.com/landlord/boarders/ → Boarders');
console.log('    havenspace.com/landlord/listings/ → Listings');
console.log('    havenspace.com/landlord/maintenance/ → Maintenance');
console.log('    havenspace.com/landlord/messages/ → Messages');
console.log('    havenspace.com/landlord/myproperties/ → My Properties');
console.log('    havenspace.com/landlord/payments/ → Payments');
console.log('    havenspace.com/landlord/profile/ → Profile');
console.log('    havenspace.com/landlord/reports/ → Reports');
