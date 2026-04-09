// Migration script: ensure Firestore `users/{uid}` documents exist and add
// required subcollections (Chats, ConnectionRequest, IdRequest, Notifications, Post)
// Run: node scripts/migrate_users_create_subcollections.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function ensureUser(userRecord) {
  const uid = userRecord.uid;
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();

  const displayName = (userRecord.displayName || '').toString().trim();
  const firstName = displayName.split(/\s+/)[0] || '';
  let lastName = displayName.split(/\s+/).slice(1).join(' ') || '';

  // If a Firestore user doc already exists with a lastName field, prefer that
  try {
    const existingDoc = await userRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() || {} : {};
    if (existingData.lastName && typeof existingData.lastName === 'string' && existingData.lastName.trim()) {
      lastName = existingData.lastName.toString().trim();
    }
  } catch (err) {
    console.warn(`Could not read existing user doc for ${uid}: ${err?.message || err}`);
  }

  if (!snap.exists || Object.keys(snap.data() || {}).length === 0) {
    await userRef.set({
      uid,
      email: userRecord.email || '',
      displayName: displayName || (userRecord.email ? userRecord.email.split('@')[0] : ''),
      firstName,
      lastName,
      role: 'alumni',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Created/updated user doc for ${uid}`);
  } else {
    console.log(`User doc exists for ${uid}`);
  }

  const subcollections = ['Chats', 'ConnectionRequest', 'IdRequest', 'Notifications', 'Post'];
  const initDoc = {
    initialized: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    userId: uid
  };

  for (const name of subcollections) {
    await userRef.collection(name).doc('init').set(initDoc, { merge: true });
  }

  // create alias doc keyed by lastName for admin readability
  if (lastName) {
    let aliasId = lastName;
    const aliasRef = db.collection('users').doc(aliasId);
    const aliasSnap = await aliasRef.get();
    if (aliasSnap.exists && (aliasSnap.data().uid !== uid)) {
      aliasId = `${lastName}_${uid.toString().slice(0,6)}`;
    }
    const finalAliasRef = db.collection('users').doc(aliasId);
    await finalAliasRef.set({
      uid,
      email: userRecord.email || '',
      displayName: displayName || (userRecord.email ? userRecord.email.split('@')[0] : ''),
      firstName,
      lastName,
      role: 'alumni',
      status: 'pending',
      aliasOf: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    for (const name of subcollections) {
      await finalAliasRef.collection(name).doc('init').set(initDoc, { merge: true });
    }
  }
}

async function main() {
  console.log('Starting migration: ensuring user docs and subcollections...');
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      await ensureUser(u);
    }
    pageToken = res.pageToken;
  } while (pageToken);
  console.log('Migration complete.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
