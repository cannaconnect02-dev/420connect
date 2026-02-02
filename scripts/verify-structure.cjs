#!/usr/bin/env node

/**
 * Monorepo structure verification script
 * Validates that the folder structure matches the expected layout
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_DIRS = [
  'apps/customer-app',
  'apps/driver-app',
  'apps/merchant-portal',
  'apps/admin-dashboard',
  'supabase/migrations',
  'tests',
  'packages'
];

const REQUIRED_FILES = [
  'package.json',
  'PROJECT_STRUCTURE.md',
  'FEATURES.md',
  'supabase/config.toml',
  'apps/customer-app/app.json',
  'apps/customer-app/index.ts',
  'apps/customer-app/package.json',
  'apps/driver-app/package.json',
  'apps/merchant-portal/package.json',
  'apps/merchant-portal/vite.config.ts',
  'apps/admin-dashboard/package.json'
];

const rootDir = path.join(__dirname, '..');
let allValid = true;

console.log('📋 Verifying 420Connect monorepo structure...\n');

// Check directories
console.log('📁 Checking required directories:');
REQUIRED_DIRS.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : '❌';
  console.log(`  ${icon} ${dir}`);
  if (!exists) allValid = false;
});

// Check files
console.log('\n📄 Checking required files:');
REQUIRED_FILES.forEach(file => {
  const fullPath = path.join(rootDir, file);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : '❌';
  console.log(`  ${icon} ${file}`);
  if (!exists) allValid = false;
});

// Check app package.json validity
console.log('\n🔍 Validating app configurations:');
const apps = ['customer-app', 'driver-app', 'merchant-portal', 'admin-dashboard'];
apps.forEach(app => {
  const pkgPath = path.join(rootDir, `apps/${app}/package.json`);
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name === app) {
      console.log(`  ✅ apps/${app}/package.json has correct name`);
    } else {
      console.log(`  ⚠️ apps/${app}/package.json name mismatch`);
    }
  } catch (e) {
    console.log(`  ❌ Error reading apps/${app}/package.json`);
    allValid = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('✅ All structure checks passed!');
  console.log('\n📚 Documentation:');
  console.log('  - See PROJECT_STRUCTURE.md for detailed layout');
  console.log('  - See README.md for getting started');
  console.log('  - See FEATURES.md for feature documentation');
  process.exit(0);
} else {
  console.log('❌ Some structure checks failed!');
  console.log('\nPlease ensure all required directories and files exist.');
  process.exit(1);
}
