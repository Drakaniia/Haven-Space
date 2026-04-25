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

// Function to safely execute commands
function safeExec(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to clear directory contents
function clearDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
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
      return true;
    } else {
      return true;
    }
  } catch (error) {
    return false;
  }
}

// Function to add cache-busting timestamp to HTML files
function addCacheBusting() {
  try {
    const timestamp = Date.now();

    // Find all HTML files in client directory
    const htmlFiles = [];

    const findHtmlFiles = dir => {
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
    };

    findHtmlFiles('./client');

    htmlFiles.forEach(filePath => {
      let content = fs.readFileSync(filePath, 'utf8');

      // Add timestamp to CSS links
      content = content.replace(
        /(<link[^>]*href=["'][^""]*\.css)([^""]*["'][^>]*>)/g,
        `$1?v=${timestamp}$2`
      );

      // Add timestamp to JS script sources
      content = content.replace(
        /(<script[^>]*src=["'][^""]*\.js)([^""]*["'][^>]*>)/g,
        `$1?v=${timestamp}$2`
      );

      fs.writeFileSync(filePath, content);
    });

    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function clearAllCache() {
  const results = [];

  // 1. Clear Bun cache
  results.push(safeExec('bun pm cache rm'));

  // 2. Clear npm cache (if exists)
  results.push(safeExec('npm cache clean --force'));

  // 3. Clear browser-related caches
  results.push(clearDirectory('./.playwright-mcp'));

  // 4. Clear any build artifacts
  results.push(clearDirectory('./client/dist'));
  results.push(clearDirectory('./client/build'));

  // 5. Clear temporary files
  results.push(clearDirectory('./tmp'));
  results.push(clearDirectory('./.tmp'));

  // 6. Clear PHP cache (if applicable)
  results.push(clearDirectory('./functions/vendor/cache'));

  // 7. Add cache-busting parameters
  results.push(addCacheBusting());

  // 8. Clear any IDE caches
  results.push(clearDirectory('./.vscode/.cache'));

  // Summary
  const successful = results.filter(r => r).length;
  const total = results.length;

  if (successful === total) {
    console.log('✨ All cache clearing operations completed successfully!');
  } else {
    console.log('⚠️  Some operations failed, but this is often normal.');
  }
}

// Run the script
clearAllCache().catch(console.error);
