#!/usr/bin/env node

/**
 * Haven Space Cache Clearing Script
 *
 * This script helps clear various types of cache that might prevent
 * frontend changes from being reflected during development.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Haven Space Cache Clearing Script');
console.log('=====================================\n');

// Function to safely execute commands
function safeExec(command, description) {
  try {
    console.log(`📋 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.log(`⚠️  ${description} failed: ${error.message}\n`);
    return false;
  }
}

// Function to clear directory contents
function clearDirectory(dirPath, description) {
  try {
    if (fs.existsSync(dirPath)) {
      console.log(`📋 ${description}...`);
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      });
      console.log(`✅ ${description} completed\n`);
      return true;
    } else {
      console.log(`ℹ️  ${description} - directory doesn't exist, skipping\n`);
      return true;
    }
  } catch (error) {
    console.log(`⚠️  ${description} failed: ${error.message}\n`);
    return false;
  }
}

// Function to add cache-busting timestamp to HTML files
function addCacheBusting() {
  try {
    console.log('📋 Adding cache-busting parameters to HTML files...');
    const timestamp = Date.now();

    // Find all HTML files in client directory
    const htmlFiles = [];
    function findHtmlFiles(dir) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.')) {
          findHtmlFiles(filePath);
        } else if (file.endsWith('.html')) {
          htmlFiles.push(filePath);
        }
      });
    }

    findHtmlFiles('./client');

    htmlFiles.forEach(filePath => {
      let content = fs.readFileSync(filePath, 'utf8');

      // Add timestamp to CSS links
      content = content.replace(
        /(<link[^>]*href=["'][^"']*\.css)([^"']*["'][^>]*>)/g,
        `$1?v=${timestamp}$2`
      );

      // Add timestamp to JS script sources
      content = content.replace(
        /(<script[^>]*src=["'][^"']*\.js)([^"']*["'][^>]*>)/g,
        `$1?v=${timestamp}$2`
      );

      fs.writeFileSync(filePath, content);
    });

    console.log(`✅ Added cache-busting to ${htmlFiles.length} HTML files\n`);
    return true;
  } catch (error) {
    console.log(`⚠️  Cache-busting failed: ${error.message}\n`);
    return false;
  }
}

// Main execution
async function clearAllCache() {
  console.log('Starting comprehensive cache clearing...\n');

  const results = [];

  // 1. Clear Bun cache
  results.push(safeExec('bun pm cache rm', 'Clearing Bun package manager cache'));

  // 2. Clear npm cache (if exists)
  results.push(safeExec('npm cache clean --force', 'Clearing npm cache'));

  // 3. Clear browser-related caches
  results.push(clearDirectory('./.playwright-mcp', 'Clearing Playwright MCP cache'));

  // 4. Clear any build artifacts
  results.push(clearDirectory('./client/dist', 'Clearing client build directory'));
  results.push(clearDirectory('./client/build', 'Clearing client build directory (alternative)'));

  // 5. Clear temporary files
  results.push(clearDirectory('./tmp', 'Clearing temporary files'));
  results.push(clearDirectory('./.tmp', 'Clearing hidden temporary files'));

  // 6. Clear PHP cache (if applicable)
  results.push(clearDirectory('./functions/vendor/cache', 'Clearing PHP vendor cache'));

  // 7. Add cache-busting parameters
  results.push(addCacheBusting());

  // 8. Clear any IDE caches
  results.push(clearDirectory('./.vscode/.cache', 'Clearing VSCode cache'));

  // Summary
  const successful = results.filter(r => r).length;
  const total = results.length;

  console.log('=====================================');
  console.log(`🎯 Cache clearing completed: ${successful}/${total} operations successful`);

  if (successful === total) {
    console.log('✨ All cache clearing operations completed successfully!');
    console.log('\n💡 Additional steps you can take:');
    console.log('   • Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   • Open browser DevTools > Application > Storage > Clear site data');
    console.log('   • Try incognito/private browsing mode');
    console.log('   • Restart your development server if running');
  } else {
    console.log('⚠️  Some operations failed, but this is often normal.');
    console.log('   The most important caches have likely been cleared.');
  }

  console.log('\n🔄 If issues persist, try running: bun run build');
}

// Run the script
clearAllCache().catch(console.error);
