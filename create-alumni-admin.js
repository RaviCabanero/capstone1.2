// Script to create Alumni Association Admin account
// Run this with: node create-alumni-admin.js

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAlumniAdmin() {
  try {
    console.log('\n=== Alumni Association Admin Setup ===\n');
    
    const email = await prompt('Enter admin email: ');
    const password = await prompt('Enter admin password (min 6 characters): ');
    const displayName = await prompt('Enter admin display name: ');
    
    console.log('\nCreating user account...');
    
    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true // Set to true so they can login immediately
    });
    
    console.log('✓ User created successfully with UID:', userRecord.uid);
    
    // Create/update user document in Firestore with alumni_association_admin role
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: 'alumni_association_admin',
      status: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✓ User document created in Firestore with alumni_association_admin role');
    console.log('\n=== Setup Complete! ===');
    console.log(`\nYou can now login with:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: alumni_association_admin\n`);
    
  } catch (error) {
    console.error('Error creating admin:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAlumniAdmin();
