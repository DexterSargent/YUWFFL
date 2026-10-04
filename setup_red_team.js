require('dotenv').config();
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require("firebase/firestore");

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

const redTeamRoster = [
  { num: 2, name: "CIARA BAGBY-SUE" },
  { num: 3, name: "MELINA BOSCO" },
  { num: 4, name: "TIZANA SUTHARSAN" },
  { num: 5, name: "ISABELLE VERSTRATEN" },
  { num: 6, name: "SONIA CABRAL" },
  { num: 7, name: "ALEXXANDRIA OLIVIER" },
  { num: 8, name: "ISABELLA ACHONEFTOS" },
  { num: 10, name: "CHARLETTE DEWAEPENAERE" },
  { num: 11, name: "TEHYA CASTRO" },
  { num: 13, name: "EMILIE ESLAMIAN" },
  { num: 14, name: "CIARA WILLIAMS" },
  { num: 15, name: "MALIKA BABUR" },
  { num: 17, name: "NICOLE STYLIANOU" },
  { num: 18, name: "CAMERON SEARS" },
  { num: 19, name: "CATHERINE CHASE" },
  { num: 21, name: "GIOVANNA SCOUNTRIANOS" },
  { num: 22, name: "EMMA GIANGROSSO" },
  { num: 24, name: "ALEXA TOMINES-RIVERA" },
  { num: 27, name: "SHAVANNAH WALKER" },
  { num: 29, name: "JORDYN PEMBERTON" },
];

const redMatches = [
  { opponent: "McMaster Marauders", time: "10:00 AM" },
  { opponent: "Waterloo Warriors", time: "12:00 PM" },
  { opponent: "Ottawa Gee-Gees", time: "2:00 PM" },
  { opponent: "Canadore Panthers", time: "4:00 PM" },
];

async function setupRedTeam() {
  console.log("Wiping old Red Team matches...");
  const matchesSnap = await getDocs(collection(db, "red_matches"));
  for (const m of matchesSnap.docs) {
    await deleteDoc(m.ref);
  }

  console.log("Setting up Red Team matches...");
  
  // Set upcoming Sunday date
  const d = new Date();
  d.setDate(d.getDate() + (7 - d.getDay())); // Next Sunday
  const dateStr = d.toISOString().split('T')[0];

  for (let i = 0; i < redMatches.length; i++) {
    const matchId = `red_match_${i+1}`;
    await setDoc(doc(db, "red_matches", matchId), {
      homeTeamId: "York Lions", // Red Team is always Home conceptually for stats
      awayTeamId: redMatches[i].opponent,
      date: dateStr,
      time: redMatches[i].time,
      location: "Millenium Sports Park (Ottawa)",
      status: "Scheduled",
      homeScore: 0,
      awayScore: 0,
      createdAt: new Date().toISOString()
    });
  }

  console.log("Wiping old Red Team roster...");
  const playersSnap = await getDocs(collection(db, "red_players"));
  for (const p of playersSnap.docs) {
    await deleteDoc(p.ref);
  }

  console.log("Creating Red Team roster...");
  for (const p of redTeamRoster) {
    const playerId = p.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, "red_players", playerId), {
      playerName: p.name,
      number: p.num,
      createdAt: new Date().toISOString()
    });
  }

  console.log("Red Team setup complete!");
}

setupRedTeam().catch(console.error);
