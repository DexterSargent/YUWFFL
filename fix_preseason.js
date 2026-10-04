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
  console.log(`Found Preseason Match: ${mId}`);
  
  console.log("Cleaning up the 70 duplicated plays from today...");
  const playsSnap = await getDocs(query(collection(db, "plays"), where("matchId", "==", mId)));
  
  let deletedCount = 0;
  let originalPlays = [];
  
  // A timestamp threshold: 24 hours ago. 
  // Any play injected today will be deleted, preserving the original plays from Tuesday.
  const thresholdSeconds = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  
  for (const p of playsSnap.docs) {
    const playData = p.data();
    
    // If the play was injected recently (timestamp is greater than the threshold)
    if (playData.timestamp && playData.timestamp.seconds > thresholdSeconds) {
      await deleteDoc(p.ref);
      deletedCount++;
    } else {
      originalPlays.push(playData);
    }
  }
  
  console.log(`Deleted ${deletedCount} newly injected duplicate plays.`);
  console.log(`Kept ${originalPlays.length} original authentic plays from Tuesday.`);
  
  let homeScore = 0;
  let awayScore = 0;
  
  originalPlays.forEach(play => {
    let pts = 0;
    if (play.isTouchdown || play.isPick6) {
      pts += 6;
      if (play.conversionSuccess && play.conversionAttempt) pts += play.conversionAttempt;
    } else if (play.isSafety) {
      pts += 2;
    }
    
    if (pts > 0) {
      let sTeam = play.possessionTeamId;
      if (play.isPick6 || play.isSafety) sTeam = play.defendingTeamId;
      
      if (sTeam === mData.homeTeamId) homeScore += pts;
      if (sTeam === mData.awayTeamId) awayScore += pts;
    }
  });
  
  console.log(`Recalculated True Score: HOME ${homeScore} - AWAY ${awayScore}`);
  
  console.log("Updating match and stripping corrupted matchState...");
  await updateDoc(doc(db, "matches", mId), {
    homeScore,
    awayScore,
    status: 'completed',
    matchState: null 
  });
  
  console.log("Done. Stats have been perfectly halved back to the original.");
}

fix().catch(console.error);
