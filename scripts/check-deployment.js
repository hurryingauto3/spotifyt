#!/usr/bin/env node

/**
 * Pre-deployment checklist script
 * Run this before deploying to production
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 SpotifyT Deployment Readiness Check\n');

let errors = 0;
let warnings = 0;

// Check 1: Environment variables
console.log('📋 Checking environment variables...');
const requiredEnvVars = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'SPOTIFY_REDIRECT_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'SESSION_SECRET',
  'NEXT_PUBLIC_APP_URL',
];

const optionalEnvVars = ['GEMINI_API_KEY'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.log(`  ❌ Missing required: ${envVar}`);
    errors++;
  } else {
    console.log(`  ✅ ${envVar}`);
  }
});

optionalEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.log(`  ⚠️  Missing optional: ${envVar} (AI matching will not work)`);
    warnings++;
  } else {
    console.log(`  ✅ ${envVar}`);
  }
});

// Check 2: Session secret strength
console.log('\n🔐 Checking session secret...');
if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
  console.log('  ⚠️  SESSION_SECRET should be at least 32 characters');
  warnings++;
} else if (process.env.SESSION_SECRET) {
  console.log('  ✅ SESSION_SECRET length is adequate');
}

// Check 3: URLs are valid
console.log('\n🌐 Validating URLs...');
const urlVars = ['NEXT_PUBLIC_APP_URL', 'SPOTIFY_REDIRECT_URI', 'GOOGLE_REDIRECT_URI'];
urlVars.forEach((envVar) => {
  if (process.env[envVar]) {
    try {
      const url = new URL(process.env[envVar]);
      if (url.protocol === 'http:' && !url.hostname.includes('localhost')) {
        console.log(`  ⚠️  ${envVar} uses HTTP (should use HTTPS in production)`);
        warnings++;
      } else {
        console.log(`  ✅ ${envVar} is valid`);
      }
    } catch (e) {
      console.log(`  ❌ ${envVar} is not a valid URL`);
      errors++;
    }
  }
});

// Check 4: Build files
console.log('\n📦 Checking build...');
const buildDir = path.join(__dirname, '../.next');
if (!fs.existsSync(buildDir)) {
  console.log('  ⚠️  No build found. Run "npm run build" before deploying');
  warnings++;
} else {
  console.log('  ✅ Build directory exists');
}

// Check 5: Dependencies
console.log('\n📚 Checking dependencies...');
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
  );
  const hasGeminiDep = packageJson.dependencies && packageJson.dependencies['@google/generative-ai'];
  if (!hasGeminiDep && !process.env.GEMINI_API_KEY) {
    console.log('  ⚠️  No Gemini dependency and no API key (AI matching disabled)');
    warnings++;
  } else {
    console.log('  ✅ Dependencies look good');
  }
} catch (e) {
  console.log('  ❌ Could not read package.json');
  errors++;
}

// Check 6: Database
console.log('\n💾 Checking database...');
const prismaDir = path.join(__dirname, '../prisma');
if (!fs.existsSync(prismaDir)) {
  console.log('  ❌ Prisma directory not found');
  errors++;
} else {
  console.log('  ✅ Prisma directory exists');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors > 0) {
  console.log(`\n❌ Deployment NOT ready: ${errors} error(s), ${warnings} warning(s)`);
  console.log('\nPlease fix the errors above before deploying.');
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  Deployment ready with warnings: ${warnings} warning(s)`);
  console.log('\nConsider addressing warnings for optimal production setup.');
  process.exit(0);
} else {
  console.log('\n✅ Deployment ready! No errors or warnings.');
  console.log('\nYou can now deploy with confidence! 🚀');
  process.exit(0);
}
