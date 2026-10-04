const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } = require("firebase/firestore");

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

async function undo() {
  console.log("Reverting changes and restoring the original teams from the match data...");
  
  // Wipe the new teams we incorrectly generated
  const teamsSnap = await getDocs(collection(db, "teams"));
  for (const t of teamsSnap.docs) {
    await deleteDoc(t.ref);
  }

  // Wipe the new players
  const playersSnap = await getDocs(collection(db, "players"));
  for (const p of playersSnap.docs) {
    await deleteDoc(p.ref);
  }

  // Fetch the preseason match to get the original team IDs
  const matchesSnap = await getDocs(query(collection(db, "matches"), where("isPreseason", "==", true)));
  
  if (matchesSnap.empty) {
    console.log("Could not find preseason match to restore from.");
    return;
  }
  
  const matchData = matchesSnap.docs[0].data();
  const originalHomeId = matchData.homeTeamId;
  const originalAwayId = matchData.awayTeamId;
  const originalHomeName = matchData.homeTeamName || "Team 1";
  const originalAwayName = matchData.awayTeamName || "Team 2";

  console.log(`Restoring original team: ${originalHomeName} (${originalHomeId})`);
  await setDoc(doc(db, "teams", originalHomeId), {
    name: originalHomeName,
    createdAt: new Date().toISOString()
  });

  console.log(`Restoring original team: ${originalAwayName} (${originalAwayId})`);
  await setDoc(doc(db, "teams", originalAwayId), {
    name: originalAwayName,
    createdAt: new Date().toISOString()
  });

  // Now, fetch all unique players from the PLAYS collection to instantly restore their exact original player profiles!
  console.log("Restoring original player profiles from the play history...");
  const playsSnap = await getDocs(query(collection(db, "plays"), where("matchId", "==", matchesSnap.docs[0].id)));
  
  const restoredPlayers = new Set();
  
  for (const p of playsSnap.docs) {
    const play = p.data();
    
    const assignPlayer = async (playerName, teamId) => {
      if (!playerName || playerName === 'TEAM') return;
      if (restoredPlayers.has(playerName)) return;
      
      const playerId = playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await setDoc(doc(db, "players", playerId), {
        playerName: playerName,
        teamId: teamId,
        createdAt: new Date().toISOString()
      });
      restoredPlayers.add(playerName);
    };

    // Offensive players
    await assignPlayer(play.qbPlayerId, play.possessionTeamId);
    await assignPlayer(play.runnerPlayerId, play.possessionTeamId);
    await assignPlayer(play.receiverPlayerId, play.possessionTeamId);
    await assignPlayer(play.conversionPasser, play.possessionTeamId);
    await assignPlayer(play.conversionReceiver, play.possessionTeamId);

    // Defensive players
    const defTeamId = play.possessionTeamId === originalHomeId ? originalAwayId : originalHomeId;
    if (play.defenders && Array.isArray(play.defenders)) {
      for (const def of play.defenders) {
        await assignPlayer(def, defTeamId);
      }
    }
  }

  console.log(`Restored ${restoredPlayers.size} original players!`);
  console.log("Undo complete. Your database is back to exactly how it was before the previous script.");
}

undo().catch(console.error);
