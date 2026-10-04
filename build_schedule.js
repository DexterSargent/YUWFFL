const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, addDoc } = require("firebase/firestore");

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

async function buildSchedule() {
  console.log("Fetching existing matches...");
  const matchesSnap = await getDocs(collection(db, "matches"));
  
  // 1. Delete all matches that are NOT the preseason game or completed games
  for (const m of matchesSnap.docs) {
    const data = m.data();
    if (!data.isPreseason && data.status !== 'completed') {
      console.log(`Deleting broken/old match: ${m.id}`);
      await deleteDoc(m.ref);
    }
  }

  // 2. Fetch the 4 teams
  const teamsSnap = await getDocs(collection(db, "teams"));
  const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  if (teams.length < 4) {
    console.log(`Warning: Found ${teams.length} teams. Need 4 teams to build the schedule properly.`);
    return;
  }
  
  // Sort them to be deterministic
  teams.sort((a, b) => a.name.localeCompare(b.name));
  
  // 3. Generate the 18 matchups (3 rounds of round robin)
  const baseMatchups = [
    [0, 1], [2, 3], // 2 matches
    [0, 2], [1, 3], // 2 matches
    [0, 3], [1, 2]  // 2 matches
  ]; // 6 matches per round
  
  const allMatchups = [];
  for (let round = 0; round < 3; round++) {
    for (const [homeIdx, awayIdx] of baseMatchups) {
      allMatchups.push({
        homeTeam: teams[homeIdx],
        awayTeam: teams[awayIdx]
      });
    }
  }
  
  // 4. Spread across 9 dates (2 games each = 18 games)
  const gameDates = [
    { date: "2026-10-01", label: "Week 1", count: 2 },
    { date: "2026-10-06", label: "Week 2", count: 2 },
    { date: "2026-10-08", label: "Week 3", count: 2 },
    { date: "2026-10-15", label: "Week 4", count: 2 },
    { date: "2026-10-22", label: "Week 5", count: 2 },
    { date: "2026-10-29", label: "Week 6", count: 2 },
    { date: "2026-11-05", label: "Week 7", count: 2 },
    { date: "2026-11-10", label: "Week 8", count: 2 },
    { date: "2026-11-12", label: "Week 9", count: 2 }
  ]; // Total 18 matches
  
  let matchIdx = 0;
  console.log(`Generating ${allMatchups.length} regular season matches...`);
  
  for (const dateObj of gameDates) {
    for (let i = 0; i < dateObj.count; i++) {
      if (matchIdx >= allMatchups.length) break;
      const m = allMatchups[matchIdx];
      
      const timeStr = i === 0 ? "8:30 PM" : "9:30 PM";
      const weekNum = parseInt(dateObj.label.replace(/\D/g,''), 10);
      
      await addDoc(collection(db, "matches"), {
        homeTeamId: m.homeTeam.id,
        homeTeamName: m.homeTeam.name,
        awayTeamId: m.awayTeam.id,
        awayTeamName: m.awayTeam.name,
        date: dateObj.date,
        time: timeStr,
        location: "South Utility Field",
        week: weekNum.toString(),
        matchdayIndex: weekNum,
        isPreseason: false,
        status: "scheduled",
        homeScore: 0,
        awayScore: 0
      });
      matchIdx++;
    }
  }

  // 5. Playoffs on Nov 17
  console.log("Generating 3 playoff games for Nov 17...");
  const playoffs = [
    { name: "Playoff Semi-Final 1", time: "7:30 PM" }, // slightly earlier to fit 3 games? Or maybe 8:30, 9:30, 10:30
    { name: "Playoff Semi-Final 2", time: "8:30 PM" },
    { name: "Championship", time: "9:30 PM" }
  ];

  for (let i = 0; i < playoffs.length; i++) {
    const p = playoffs[i];
    await addDoc(collection(db, "matches"), {
      homeTeamId: "TBD",
      homeTeamName: "TBD",
      awayTeamId: "TBD",
      awayTeamName: "TBD",
      date: "2026-11-17",
      time: p.time,
      location: "South Utility Field",
      week: "Playoffs",
      matchdayIndex: 100 + i,
      isPreseason: false,
      status: "scheduled",
      homeScore: 0,
      awayScore: 0
    });
  }

  console.log("Schedule successfully rebuilt!");
}

buildSchedule().catch(console.error);
