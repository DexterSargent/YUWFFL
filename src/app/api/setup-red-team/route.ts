import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const redMatches = [
  { opponent: "McMaster Marauders", time: "10:00 AM" },
  { opponent: "Waterloo Warriors", time: "12:00 PM" },
  { opponent: "Ottawa Gee-Gees", time: "2:00 PM" },
  { opponent: "Canadore Panthers", time: "4:00 PM" },
];

export async function GET() {
  try {
    const matchesSnap = await getDocs(collection(db, "red_matches"));
    for (const m of matchesSnap.docs) {
      await deleteDoc(m.ref);
    }

    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    const dateStr = d.toISOString().split('T')[0];

    for (let i = 0; i < redMatches.length; i++) {
      const matchId = `red_match_${i+1}`;
      await setDoc(doc(db, "red_matches", matchId), {
        homeTeamId: "York Lions",
        homeTeamName: "York Lions",
        awayTeamId: redMatches[i].opponent,
        awayTeamName: redMatches[i].opponent,
        date: dateStr,
        time: redMatches[i].time,
        location: "Millenium Sports Park (Ottawa)",
        status: "Scheduled",
        homeScore: 0,
        awayScore: 0,
        createdAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, message: "Red Team matches updated successfully!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
