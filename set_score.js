const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require("firebase/firestore");

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

async function fix() {
  console.log("Finding the preseason match...");
  const matchesSnap = await getDocs(query(collection(db, "matches"), where("isPreseason", "==", true)));
  
  if (matchesSnap.empty) {
    console.log("No preseason match found.");
    return;
  }
  
  const mDoc = matchesSnap.docs[0];
  const mId = mDoc.id;
  const mData = mDoc.data();
  
  // Find which team is Cameron/Dana (24) and which is Ashlynn (13) based on the old script output 
  // It said "HOME 24 - AWAY 6", which means HOME is Cameron's team (24 points). 
  // Ashlynn's team is AWAY and should have 13 points (not 6, because the script missed the 7 points from the pick 6).
  const homeScore = 24;
  const awayScore = 13;
  
  console.log("Updating match scoreboard...");
  await updateDoc(doc(db, "matches", mId), {
    homeScore: homeScore,
    awayScore: awayScore,
    status: 'completed',
    matchState: {
      gameClock: 0,
      half: 2,
      homeScore: homeScore,
      awayScore: awayScore,
      possession: mData.homeTeamName || 'HOME',
      currentDown: 1
    }
  });
  
  console.log("Done. The scoreboard has been locked exactly at 24-13 with 0:00 on the clock.");
}

fix().catch(console.error);
