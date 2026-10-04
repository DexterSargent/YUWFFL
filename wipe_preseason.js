const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipe() {
  console.log("Finding the preseason match...");
  const matchesSnap = await getDocs(query(collection(db, "matches"), where("isPreseason", "==", true)));
  
  if (matchesSnap.empty) {
    console.log("No preseason match found.");
    return;
  }
  
  const mDoc = matchesSnap.docs[0];
  const mId = mDoc.id;
  
  console.log("Deleting absolutely every play for this match...");
  const playsSnap = await getDocs(query(collection(db, "plays"), where("matchId", "==", mId)));
  
  let deletedCount = 0;
  for (const p of playsSnap.docs) {
    await deleteDoc(p.ref);
    deletedCount++;
  }
  
  console.log(`Wiped ${deletedCount} plays from the database.`);
  
  console.log("Resetting scoreboard to 0-0 and clearing corrupted matchState...");
  await updateDoc(doc(db, "matches", mId), {
    homeScore: 0,
    awayScore: 0,
    status: 'completed',
    matchState: null 
  });
  
  console.log("Match has been completely factory reset!");
}

wipe().catch(console.error);
