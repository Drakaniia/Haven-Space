#!/usr/bin/env node

/**
 * Build script for production deployment
 * Automatically scans all files under client/ and copies them to dist/
 * with a flat structure suitable for GitHub Pages root deployment.
 */

import {
  copyFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'client');
const DIST = join(ROOT, 'dist');

// --- Helpers ---

/**
 * Recursively scan a directory and return all files matching the given extensions.
 * Returns array of paths relative to the base directory.
 */
function scanDirectory(baseDir, extensions) {
  const results = [];

  function walk(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = '.' + entry.name.split('.').pop().toLowerCase();
        if (extensions.includes(ext)) {
          results.push(relative(baseDir, fullPath));
        }
      }
    }
  }

  walk(baseDir);
  // Normalize all paths to forward slashes for consistent processing
  return results.map(p => p.replace(/\\/g, '/')).sort();
}

/**
 * Copy a file from src relative path to dest relative path.
 */
function copyFile(srcRelative, destRelative, srcBase, distBase) {
  const srcPath = join(srcBase, srcRelative);
  const destPath = join(distBase, destRelative);

  if (!existsSync(srcPath)) {
    console.warn(`⚠️  Warning: ${srcPath} not found, skipping...`);
    return;
  }

  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
}

/**
 * Fix relative paths in HTML content for deployment.
 * `depth` = how many levels up from the file to the root (for ../ prefix).
 */
function fixPaths(htmlContent, depth) {
  const prefix = '../'.repeat(depth);

  // Fix CSS paths (../../css/ -> ../css/ or css/)
  let fixed = htmlContent.replace(/(href=["'])(\.\.\/)*(css\/[^"']+\.css["'])/g, `$1${prefix}$3`);

  // Fix JS paths (../../js/ -> ../js/ or js/)
  fixed = fixed.replace(/(src=["'])(\.\.\/)*(js\/[^"']+\.js["'])/g, `$1${prefix}$3`);

  // Fix image paths (../../assets/ -> ../assets/ or assets/)
  fixed = fixed.replace(
    /(src=["'])(\.\.\/)*(assets\/[^"']+\.(png|jpg|svg|webp|jpeg|gif|ico|webm)["'])/g,
    `$1${prefix}$3`
  );

  // Fix auth page links
  fixed = fixed.replace(/(href=["'])(\.\.\/)*auth\//g, `$1${prefix}auth/`);

  // Fix maps.html link
  fixed = fixed.replace(/(href=["'])maps\.html(["'])/g, `$1${prefix}maps.html$2`);

  // Fix role dashboard links (boarder/, landlord/, admin/)
  fixed = fixed.replace(/(href=["'])(\.\.\/)*(boarder\/)/g, `$1${prefix}boarder/`);
  fixed = fixed.replace(/(href=["'])(\.\.\/)*(landlord\/)/g, `$1${prefix}landlord/`);
  fixed = fixed.replace(/(href=["'])(\.\.\/)*(admin\/)/g, `$1${prefix}admin/`);

  // Fix index.html root links
  fixed = fixed.replace(/(href=["'])(\.\.\/)+(index\.html)/g, `$1${prefix}$3`);

  return fixed;
}

/**
 * Calculate the depth (number of ../ needed) from a file's position to the dist root.
 */
function depthToRoot(filePath) {
  // Count directory separators to determine depth
  // e.g., 'boarder/applications/index.html' → depth 2
  // e.g., 'index.html' → depth 0
  const parts = filePath.split('/');
  return parts.length - 1; // subtract 1 because the last part is the filename
}

// --- Main Build ---

console.log('Building for production...\n');

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

// ===== 1. Scan all files =====

const htmlFiles = scanDirectory(join(SRC, 'views'), ['.html']);
const cssFiles = scanDirectory(join(SRC, 'css'), ['.css']);
const jsFiles = scanDirectory(join(SRC, 'js'), ['.js']);
const imageFiles = scanDirectory(join(SRC, 'assets'), [
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp',
  '.gif',
  '.ico',
  '.webm',
]);
const componentFiles = scanDirectory(join(SRC, 'components'), ['.html']);

console.log(`Found ${htmlFiles.length} HTML files`);
console.log(`Found ${cssFiles.length} CSS files`);
console.log(`Found ${jsFiles.length} JS files`);
console.log(`Found ${imageFiles.length} image files`);
console.log(`Found ${componentFiles.length} component HTML files`);
console.log('');

// ===== 2. Process HTML files with path fixing =====

const roleFolders = ['admin', 'boarder', 'landlord', 'public'];

htmlFiles.forEach(file => {
  // file is relative to views/, e.g., 'boarder/applications/index.html'
  // Already normalized to forward slashes by scanDirectory
  const parts = file.split('/');
  const fileName = parts[parts.length - 1];
  const lastFolder = parts.length > 1 ? parts[parts.length - 2] : '';

  const srcPath = join(SRC, 'views', file);
  if (!existsSync(srcPath)) {
    console.warn(`⚠️  Warning: ${srcPath} not found, skipping...`);
    return;
  }

  // Determine destination path
  let destPath;
  let depth = 0;

  // parts[0] is the role folder
  const role = parts[0];
  const isRoleFolder = roleFolders.includes(role);

  if (!isRoleFolder) {
    console.warn(`⚠️  Warning: Unknown role folder "${role}" in ${file}, skipping...`);
    return;
  }

  if (role === 'public') {
    if (lastFolder === 'auth') {
      // Auth files → dist/auth/
      destPath = join(DIST, 'auth', fileName);
      depth = 1;
    } else {
      // Other public files → dist root
      destPath = join(DIST, fileName);
      depth = 0;
    }
  } else if (role === 'admin') {
    // Admin files → dist/admin/...
    if (parts.length === 2) {
      // Direct admin file (e.g., admin/index.html)
      destPath = join(DIST, 'admin', fileName);
      depth = 1;
    } else {
      // Admin subfolder (e.g., admin/settings/index.html)
      const subPath = parts.slice(1, -1).join('/');
      destPath = join(DIST, 'admin', subPath, fileName);
      depth = depthToRoot(join('admin', subPath, fileName));
    }
  } else if (role === 'boarder') {
    if (parts.length === 2) {
      // Direct boarder file (e.g., boarder/index.html)
      destPath = join(DIST, 'boarder', fileName);
      depth = 1;
    } else {
      // Boarder subfolder (e.g., boarder/applications/index.html)
      const subPath = parts.slice(1, -1).join('/');
      destPath = join(DIST, 'boarder', subPath, fileName);
      depth = depthToRoot(join('boarder', subPath, fileName));
    }
  } else if (role === 'landlord') {
    if (parts.length === 2) {
      // Direct landlord file (e.g., landlord/index.html)
      destPath = join(DIST, 'landlord', fileName);
      depth = 1;
    } else {
      // Landlord subfolder
      const subPath = parts.slice(1, -1).join('/');
      destPath = join(DIST, 'landlord', subPath, fileName);
      depth = depthToRoot(join('landlord', subPath, fileName));
    }
  }

  // Read and fix paths
  let content = readFileSync(srcPath, 'utf8');
  content = fixPaths(content, depth);

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, content);

  // Calculate display path
  const displayDest = relative(DIST, destPath);
  console.log(`✓ ${file} → ${displayDest}`);
});

console.log('');

// ===== 3. Copy CSS files → dist/css/ =====

cssFiles.forEach(file => {
  copyFile(file, `css/${file}`, join(SRC, 'css'), DIST);
  console.log(`✓ css/${file}`);
});

console.log('');

// ===== 4. Copy JS files → dist/js/ =====

jsFiles.forEach(file => {
  copyFile(file, `js/${file}`, join(SRC, 'js'), DIST);
  console.log(`✓ js/${file}`);
});

console.log('');

// ===== 5. Copy image files → dist/assets/ =====

imageFiles.forEach(file => {
  copyFile(file, `assets/${file}`, join(SRC, 'assets'), DIST);
  console.log(`✓ assets/${file}`);
});

console.log('');

// ===== 6. Copy component HTML files → dist/components/ =====

componentFiles.forEach(file => {
  copyFile(file, `components/${file}`, join(SRC, 'components'), DIST);
  console.log(`✓ components/${file}`);
});

// ===== Done =====

console.log('\n✅ Build complete! Production files are in ./dist');
console.log(`\n   ${htmlFiles.length} HTML files processed`);
console.log(`   ${cssFiles.length} CSS files copied`);
console.log(`   ${jsFiles.length} JS files copied`);
console.log(`   ${imageFiles.length} image files copied`);
console.log(`   ${componentFiles.length} component files copied`);
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
console.log('    havenspace.com/boarder/lease/ → Lease');
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
