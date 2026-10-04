const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, query, where } = require("firebase/firestore");

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

async function check() {
  const matchesSnap = await getDocs(query(collection(db, "matches"), where("isPreseason", "==", true)));
  if (!matchesSnap.empty) {
    console.log("Preseason match:", matchesSnap.docs[0].id);
    console.log(matchesSnap.docs[0].data());
  }
}

check().catch(console.error);
