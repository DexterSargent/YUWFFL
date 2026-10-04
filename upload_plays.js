const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc, query, where, updateDoc } = require("firebase/firestore");
const fs = require('fs');

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

async function run() {
  console.log("Loading raw plays...");
  const raw = fs.readFileSync('raw_plays.txt', 'utf-8');
  const blocks = raw.split('\n\n').map(s => s.trim()).filter(Boolean);

  const parsedPlays = blocks.map(block => {
    const lines = block.split('\n');
    const downLine = lines[0];
    const downMatch = downLine.match(/\d+/);
    const down = downMatch ? parseInt(downMatch[0], 10) : 1;
    
    const descLine = lines[1];
    let convLine = lines[2] || null;
    
    let qb = null;
    let receiver = null;
    let runner = null;
    let playType = null;
    let outcome = null;
    let result = null;
    let flaggers = [];
    let defenders = [];
    let isTouchdown = false;
    let isPick6 = false;
    let isSafety = false;
    let firstDown = false;
    let turnover = false;

    let flagMatch = descLine.match(/\(Flagged by ([^)]+)\)/);
    if (flagMatch) {
      flaggers.push(flagMatch[1]);
    }
    
    if (descLine.includes('for a TOUCHDOWN!')) {
      result = 'Touchdown';
      isTouchdown = true;
      firstDown = true;
    } else if (descLine.includes('for a Pick 6!')) {
      result = 'Pick 6';
      isPick6 = true;
      turnover = true;
    } else if (descLine.includes('for a FIRST DOWN.')) {
      result = 'First Down';
      firstDown = true;
    } else if (descLine.includes('(Turnover)')) {
      result = 'Turnover';
      turnover = true;
    } else if (descLine.includes('(Next Down)')) {
      result = 'Next Down';
    } else if (descLine.includes('(Short)')) {
      result = 'Short';
    } else if (descLine.includes('(Loss of Down)')) {
      result = 'Loss of Down';
    }

    if (descLine.includes(' pass ')) {
      playType = 'Pass';
      qb = descLine.split(' pass ')[0].trim();
      
      if (descLine.includes(' complete to ')) {
        outcome = 'Complete';
        receiver = descLine.split(' complete to ')[1].split(/ \(| for /)[0].trim();
      } else if (descLine.includes(' incomplete/missed')) {
        outcome = 'Incomplete';
      } else if (descLine.includes(' intercepted by ')) {
        outcome = 'Interception';
        defenders.push(descLine.split(' intercepted by ')[1].split(/ \(| for /)[0].trim());
      } else if (descLine.includes(' broken up by ')) {
        outcome = 'PBU';
        defenders.push(descLine.split(' broken up by ')[1].split(/ \(| for /)[0].trim());
      }
    } else if (descLine.includes(' run ')) {
      playType = 'Run';
      runner = descLine.split(' run')[0].trim();
      qb = runner; 
    } else if (descLine.includes(' flagged for loss by ')) {
      playType = 'Run'; 
      qb = descLine.split(' flagged for loss by ')[0].trim();
      defenders.push(descLine.split(' flagged for loss by ')[1].split(/ \(| for /)[0].trim());
      outcome = 'FFL'; 
      result = 'Short';
    }

    let convAtt = null;
    let convSuccess = false;
    let convPasser = null;
    let convReceiver = null;

    if (convLine) {
      if (convLine.includes('FAILED')) {
        convAtt = parseInt(convLine.match(/\d+/)[0], 10);
        convSuccess = false;
      } else if (convLine.includes('GOOD:')) {
        convAtt = parseInt(convLine.match(/\d+/)[0], 10);
        convSuccess = true;
        if (convLine.includes(' pass to ')) {
          const parts = convLine.split('GOOD: ')[1].split(' pass to ');
          convPasser = parts[0].trim();
          convReceiver = parts[1].trim();
        }
      }
    }

    return {
      down,
      playType,
      qbPlayerId: qb,
      runnerPlayerId: runner,
      receiverPlayerId: receiver,
      passOutcome: outcome,
      result,
      isTouchdown,
      isPick6,
      isSafety,
      firstDown,
      turnover,
      flaggers,
      defenders,
      conversionAttempt: convAtt,
      conversionSuccess: convSuccess,
      conversionPasser: convPasser,
      conversionReceiver: convReceiver,
      desc: descLine // just for debugging
    };
  });

  const orderedPlays = parsedPlays.reverse();

  console.log("Fetching database maps...");
  const playersSnap = await getDocs(collection(db, "players"));
  const playerMap = {};
  playersSnap.forEach(d => {
    playerMap[d.data().playerName] = d.data().teamId;
  });

  const matchesSnap = await getDocs(query(collection(db, "matches"), where("isPreseason", "==", true)));
  let matchData = null;
  let matchId = null;
  
  if (matchesSnap.empty) {
    // If no preseason match found explicitly by isPreseason, just find one that has status completed and 0-0.
    const allm = await getDocs(collection(db, "matches"));
    allm.forEach(m => {
      const d = m.data();
      if (d.homeScore === 0 && d.awayScore === 0) {
        matchId = m.id;
        matchData = d;
      }
    });
  } else {
    matchId = matchesSnap.docs[0].id;
    matchData = matchesSnap.docs[0].data();
  }

  if (!matchData) {
    console.log("NO MATCH FOUND!");
    return;
  }

  console.log(`Injecting into match: ${matchId}`);

  let homeScore = 0;
  let awayScore = 0;
  
  const now = Date.now();

  for (let i = 0; i < orderedPlays.length; i++) {
    const play = orderedPlays[i];
    
    let pTeam = null;
    if (play.qbPlayerId && play.qbPlayerId !== 'TEAM') {
      pTeam = playerMap[play.qbPlayerId];
    } else if (play.receiverPlayerId && play.receiverPlayerId !== 'TEAM') {
      pTeam = playerMap[play.receiverPlayerId];
    }
    
    if (!pTeam) {
      console.log(`Warning: Could not resolve possession team for play: ${play.desc}`);
      pTeam = matchData.homeTeamId; // fallback
    }

    const dTeam = pTeam === matchData.homeTeamId ? matchData.awayTeamId : matchData.homeTeamId;
    
    play.possessionTeamId = pTeam;
    play.defendingTeamId = dTeam;
    play.matchId = matchId;
    play.timestamp = new Date(now + (i * 1000)); // increment by 1 sec
    play.pointsScored = 0;
    
    if (play.isTouchdown || play.isPick6) {
      let pts = 6;
      if (play.conversionSuccess && play.conversionAttempt) pts += play.conversionAttempt;
      play.pointsScored = pts;
      
      let sTeam = pTeam;
      if (play.isPick6) sTeam = dTeam;
      
      if (sTeam === matchData.homeTeamId) homeScore += pts;
      if (sTeam === matchData.awayTeamId) awayScore += pts;
    } else if (play.isSafety) {
      play.pointsScored = 2;
      let sTeam = dTeam;
      if (sTeam === matchData.homeTeamId) homeScore += 2;
      if (sTeam === matchData.awayTeamId) awayScore += 2;
    }

    const docRef = doc(collection(db, "plays"));
    await setDoc(docRef, play);
    console.log(`Inserted play ${i+1}/${orderedPlays.length}: ${play.desc}`);
  }

  console.log(`Updating Match Score: ${homeScore} - ${awayScore}`);
  await updateDoc(doc(db, "matches", matchId), {
    homeScore,
    awayScore,
    status: 'completed'
  });

  console.log("ALL RESTORED!");
}

run().catch(console.error);
