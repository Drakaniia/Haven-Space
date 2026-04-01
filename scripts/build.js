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
  'views/boarder/lease/index.html',
  'views/boarder/maintenance/index.html',
  'views/boarder/maintenance/create.html',
  'views/boarder/messages/index.html',
  'views/boarder/notices/index.html',
  'views/boarder/payments/index.html',
  'views/boarder/payments/pay.html',
  'views/boarder/profile/index.html',
  'views/boarder/rooms/index.html',
  'views/boarder/rooms/detail.html',
  'views/boarder/find-a-room/index.html',
  'views/boarder/room-history/index.html',
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
  'css/views/boarder/boarder-lease.css',
  'css/views/boarder/boarder-maintenance.css',
  'css/views/boarder/boarder-payments.css',
  'css/views/boarder/boarder-rooms.css',
  'css/views/boarder/boarder-messages.css',
  'css/views/boarder/boarder-notices.css',
  'css/views/boarder/boarder-find-a-room.css',
  'css/views/boarder/boarder-room-history.css',
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
  'js/shared/icons.js',
  // Entry point files (index.js for each role)
  'js/views/public/index.js',
  'js/views/admin/index.js',
  'js/views/boarder/index.js',
  'js/views/landlord/index.js',
  // Landing
  'js/views/landing/landing.js',
  // Admin
  'js/views/admin/admin.js',
  // Boarder
  'js/views/boarder/dashboard.js',
  'js/views/boarder/boarder.js',
  'js/views/boarder/boarder-applications.js',
  'js/views/boarder/lease.js',
  'js/views/boarder/boarder-maintenance.js',
  'js/views/boarder/boarder-payments.js',
  'js/views/boarder/boarder-rooms.js',
  'js/views/boarder/messages.js',
  'js/views/boarder/notices.js',
  'js/views/boarder/boarder-find-a-room.js',
  'js/views/boarder/room-history.js',
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
  // File format: 'views/<role>/<subfolder>/file.html' or 'views/<role>/file.html'
  const parts = file.split('/'); // e.g., ['views', 'boarder', 'applications', 'index.html']
  const fileName = parts.pop(); // 'index.html'
  const lastFolder = parts.pop(); // e.g., 'applications' or 'boarder' (if no subfolder)

  const srcPath = join(SRC, file);

  // Determine destination path based on folder structure
  let destPath;
  let depth = 0;

  // Check if lastFolder is a role folder (dashboard index) or a subfolder
  // For files like 'views/boarder/index.html', lastFolder = 'boarder' (role folder)
  // For files like 'views/boarder/applications/index.html', lastFolder = 'applications' (subfolder)
  const roleFolders = ['admin', 'boarder', 'landlord', 'public'];
  const isRoleFolder = roleFolders.includes(lastFolder);

  if (isRoleFolder) {
    // Dashboard index file (e.g., views/boarder/index.html)
    const role = lastFolder;

    if (role === 'public') {
      // Public pages go to root
      destPath = join(DIST, fileName);
      depth = 0;
    } else if (role === 'admin') {
      // Admin dashboard goes to admin/index.html
      destPath = join(DIST, 'admin', fileName);
      depth = 1;
    } else if (role === 'boarder') {
      // Boarder dashboard goes to boarder/index.html
      destPath = join(DIST, 'boarder', fileName);
      depth = 1;
    } else if (role === 'landlord') {
      // Landlord dashboard goes to landlord/index.html
      destPath = join(DIST, 'landlord', fileName);
      depth = 1;
    }
  } else {
    // Subfolder file (e.g., views/boarder/applications/index.html)
    // Need to get the role from the remaining parts
    const role = parts.pop(); // e.g., 'boarder', 'landlord', 'public'

    if (role === 'public') {
      if (lastFolder === 'auth') {
        // Auth files go to auth/ subfolder
        destPath = join(DIST, 'auth', fileName);
        depth = 1;
      } else {
        // Other public files go to root
        destPath = join(DIST, fileName);
        depth = 0;
      }
    } else if (role === 'admin') {
      // Admin subfolder files go to admin/<subfolder>/index.html
      destPath = join(DIST, 'admin', lastFolder, fileName);
      depth = 2;
    } else if (role === 'boarder') {
      if (lastFolder === 'maps') {
        // Boarder maps files go to boarder/maps/ subfolder
        destPath = join(DIST, 'boarder', 'maps', fileName);
        depth = 2;
      } else {
        // Other boarder files go to boarder/<subfolder>/index.html
        destPath = join(DIST, 'boarder', lastFolder, fileName);
        depth = 2;
      }
    } else if (role === 'landlord') {
      if (lastFolder === 'maps') {
        // Landlord maps files go to landlord/maps/ subfolder
        destPath = join(DIST, 'landlord', 'maps', fileName);
        depth = 2;
      } else {
        // Other landlord files go to landlord/<subfolder>/index.html
        destPath = join(DIST, 'landlord', lastFolder, fileName);
        depth = 2;
      }
    }
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
  const relativePath = isRoleFolder
    ? lastFolder === 'public'
      ? ''
      : `${lastFolder}/`
    : roleFolders.includes(parts[parts.length - 1])
    ? parts[parts.length - 1] === 'public' && lastFolder === 'auth'
      ? 'auth/'
      : parts[parts.length - 1] === 'public'
      ? ''
      : `${parts[parts.length - 1]}/`
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
console.log('    havenspace.com/boarder/find-a-room/ → Find a Room');
console.log('    havenspace.com/boarder/room-history/ → Room History');
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
