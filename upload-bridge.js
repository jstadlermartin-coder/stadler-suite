// Upload Bridge Exe to Firebase Storage
// Run: node upload-bridge.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

// Path to the exe file
const EXE_PATH = 'C:\\Users\\Info\\CapCorn-Bridge\\dist\\CapCornBridge-Setup.exe';
const STORAGE_PATH = 'downloads/CapCornBridge-Setup.exe';

async function uploadFile() {
  console.log('Uploading CapCorn Bridge to Firebase Storage...');
  console.log(`Source: ${EXE_PATH}`);
  console.log(`Destination: ${STORAGE_PATH}`);
  console.log('');

  // Check if file exists
  if (!fs.existsSync(EXE_PATH)) {
    console.error('ERROR: File not found:', EXE_PATH);
    process.exit(1);
  }

  try {
    // Initialize Firebase Admin (uses default credentials from gcloud auth)
    initializeApp({
      projectId: 'stadler-suite',
      storageBucket: 'stadler-suite.firebasestorage.app'
    });

    const bucket = getStorage().bucket();

    console.log('Uploading...');

    await bucket.upload(EXE_PATH, {
      destination: STORAGE_PATH,
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          description: 'CapCorn Bridge Setup - Hotel Database Connector'
        }
      }
    });

    console.log('');
    console.log('SUCCESS! File uploaded.');
    console.log('');
    console.log('The file is now available at:');
    console.log(`gs://stadler-suite.firebasestorage.app/${STORAGE_PATH}`);

  } catch (error) {
    console.error('Upload failed:', error.message);

    if (error.message.includes('Could not load the default credentials')) {
      console.log('');
      console.log('You need to authenticate first. Run:');
      console.log('  gcloud auth application-default login');
    }

    process.exit(1);
  }
}

uploadFile();
