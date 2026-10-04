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

const newTeams = [
  {
    name: "Team 1",
    players: ["Maya Jenkinson", "Rai Crowell*", "Rabia Ahmad*", "Camila*", "Dana*", "Kayla", "Dilem"]
  },
  {
    name: "Team 2",
    players: ["Phoebe", "Keira Flynn", "Isabel McCallum", "Rodesha Shakya*", "Cameron Boyes*", "Ashlynn Stephenson*", "Ashley Ward*", "Abieyuwa Edison-Edebor"]
  },
  {
    name: "Team 3",
    players: ["Ashley Dino", "Raichel Dino", "Keirra Mills-Gollop", "Stefania Paglia*", "Chloe Coleman*", "Nissi", "Isabella Currie*", "Martha"]
  },
  {
    name: "Team 4",
    players: ["Samoy Grant*", "Florence Emile", "Sophie Vanni", "Rosemary Olivieri", "Kylie Maiorano*", "Lori-Ann Scott", "Nneka Agbaifoh", "Tioluwani Oyinlade*"]
  }
];

async function setupRosters() {
  console.log("Wiping old teams...");
  const teamsSnap = await getDocs(collection(db, "teams"));
  for (const t of teamsSnap.docs) {
    await deleteDoc(t.ref);
  }

  console.log("Wiping old players...");
  const playersSnap = await getDocs(collection(db, "players"));
  for (const p of playersSnap.docs) {
    await deleteDoc(p.ref);
  }

  console.log("Creating new teams and players...");

  for (let i = 0; i < newTeams.length; i++) {
    const teamData = newTeams[i];
    const teamId = `team_${i + 1}`;
    
    await setDoc(doc(db, "teams", teamId), {
      name: teamData.name,
      createdAt: new Date().toISOString()
    });

    for (const p of teamData.players) {
      let isQB = false;
      let playerName = p;
      if (p.endsWith("*")) {
        isQB = true;
        playerName = p.slice(0, -1);
      }
      
      const playerId = playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await setDoc(doc(db, "players", playerId), {
        playerName: playerName,
        teamId: teamId,
        isQB: isQB,
        createdAt: new Date().toISOString()
      });
    }
  }

  console.log("All set! 4 new teams created with assigned players.");
}

setupRosters().catch(console.error);
