#!/usr/bin/env node

import { build } from 'esbuild';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runViteBuild() {
  console.log('Running Vite build...');
  try {
    const { stdout, stderr } = await execAsync('npx vite build');
    console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error('Vite build failed:', error.message);
    return false;
  }
}

async function runServerBuild() {
  console.log('Building server with esbuild...');
  try {
    await build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      external: ['pg-native', 'passport-local', 'express', 'jsonwebtoken'],
      outdir: 'dist',
      logLevel: 'info',
    });
    return true;
  } catch (error) {
    console.error('Server build failed:', error.message);
    return false;
  }
}

async function main() {
  const viteBuildSuccess = await runViteBuild();
  const serverBuildSuccess = await runServerBuild();
  
  if (viteBuildSuccess && serverBuildSuccess) {
    console.log('Build completed successfully!');
    process.exit(0);
  } else {
    console.error('Build failed!');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error during build:', error);
  process.exit(1);
});