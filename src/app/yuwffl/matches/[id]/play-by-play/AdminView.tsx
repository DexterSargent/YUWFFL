"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Zap, RotateCcw, Flag, Maximize, Minimize, Play, Pause, AlertCircle, Timer, Save, Plus, Minus, X, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDoc, getDocs, doc, serverTimestamp, updateDoc, deleteDoc, query, where } from "firebase/firestore";

export default function PlayByPlayManager({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeStateData, setResumeStateData] = useState<any>(null);
  // Match Info
  const [homeTeamName, setHomeTeamName] = useState("HOME");
  const [awayTeamName, setAwayTeamName] = useState("AWAY");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [homePlayers, setHomePlayers] = useState<string[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<string[]>([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalTeam, setSubModalTeam] = useState<"HOME" | "AWAY" | null>(null);

  const handleAddSub = async (subName: string, teamToAdd: "HOME" | "AWAY") => {
    if (subName && subName.trim()) {
      const name = subName.trim();
      const newSubs = [...subs, name];
      setSubs(newSubs);
      if (teamToAdd === "HOME") {
        setHomePlayers(prev => [...prev, name].sort());
      } else {
        setAwayPlayers(prev => [...prev, name].sort());
      }
      setIsSubModalOpen(false);
      await import('firebase/firestore').then(({ updateDoc, doc }) => updateDoc(doc(db, "matches", matchId), { subs: newSubs }));
    }
  };


  // Game State
  const [currentDown, setCurrentDown] = useState(1);
  const [possession, setPossession] = useState("HOME");
  const [firstHalfStartPossession, setFirstHalfStartPossession] = useState<string>("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Timing State
  const [half, setHalf] = useState(1);
  const [gameClock, setGameClock] = useState(1200);
  const [isGameClockRunning, setIsGameClockRunning] = useState(false);
  const [homeTimeouts, setHomeTimeouts] = useState(1);
  const [awayTimeouts, setAwayTimeouts] = useState(1);

  // Timeout Modal State
  const [isTimeoutActive, setIsTimeoutActive] = useState(false);
  const [timeoutClock, setTimeoutClock] = useState(60);

  // Play Clock State
  const [isFirstPlayOfHalf, setIsFirstPlayOfHalf] = useState(true);
  const [isBallSpotted, setIsBallSpotted] = useState(false);
  const [playClock, setPlayClock] = useState(30);
  const [isPlayClockRunning, setIsPlayClockRunning] = useState(false);

  const [isScoreboardFullscreen, setIsScoreboardFullscreen] = useState(false);

  // Wizard State
  const [step, setStep] = useState<'PLAY_TYPE' | 'DETAILS' | 'CONVERSION' | 'HALFTIME' | 'GAME_OVER'>('PLAY_TYPE');
  const [halftimeClock, setHalftimeClock] = useState(300);
  const [playType, setPlayType] = useState<"Pass" | "Run" | "Penalty" | null>(null);
  const [outcome, setOutcome] = useState<"Complete" | "Incomplete_Menu" | "PBU" | "Missed" | "Interception" | "Sack" | "Gain" | "FFL" | null>(null);

  const [qbRunner, setQbRunner] = useState<string>("");
  const [receiver, setReceiver] = useState<string>("");
  const [defenders, setDefenders] = useState<string[]>([]);
  const [flaggers, setFlaggers] = useState<string[]>([]);

  // QB Autofill Memory
  const [lastHomeQB, setLastHomeQB] = useState<string>("");
  const [lastAwayQB, setLastAwayQB] = useState<string>("");

  // Conversion State
  const [convPts, setConvPts] = useState<1 | 2 | null>(null);
  const [convIsGood, setConvIsGood] = useState<boolean | null>(null);
  const [convPasser, setConvPasser] = useState<string>("");
  const [convReceiver, setConvReceiver] = useState<string>("");

  // Game Over State
  const [didNotPlay, setDidNotPlay] = useState<string[]>([]);

  // OOB Result State
  const [isOobPrompt, setIsOobPrompt] = useState(false);

  // Play Result Memory for Conversion
  const [playResult, setPlayResult] = useState<string>("");

  const getOrdinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  const FootballIcon = ({ className, active }: { className?: string, active: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className} ${active ? 'opacity-100 drop-shadow-[0_0_15px_currentColor]' : 'opacity-30 grayscale'} transition-all duration-500`}
    >
      <path 
        d="M6 3c-5 12 7 24 19 19-5-12-7-24-19-19z" 
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
      <path 
        d="M13.5 10.5l-3 3M11 8l-3 3M16 13l-3 3" 
        fill="none"
        stroke={active ? "#000" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  useEffect(() => {
    const loadMatchData = async () => {
      try {
        const matchDoc = await getDoc(doc(db, "matches", matchId));
        if (!matchDoc.exists()) return;
        const mData = matchDoc.data() as any;

        setHomeTeamName(mData.homeTeamName || "HOME");
        setAwayTeamName(mData.awayTeamName || "AWAY");
        setHomeTeamId(mData.homeTeamId);
        setAwayTeamId(mData.awayTeamId);

        if (mData.status === 'in_progress' && mData.matchState) {
          setResumeStateData(mData.matchState);
          setShowResumePrompt(true);
        } else {
          setPossession(mData.homeTeamName || "HOME");
          setFirstHalfStartPossession(mData.homeTeamName || "HOME");
        }

        const matchSubs = mData.subs || [];
        setSubs(matchSubs);

        const playersSnap = await getDocs(collection(db, "players"));
        const allP = playersSnap.docs.map(d => d.data());
        setAllPlayers(allP);

        const homeP = allP.filter(p => p.teamId === mData.homeTeamId).map(p => p.playerName);
        const awayP = allP.filter(p => p.teamId === mData.awayTeamId).map(p => p.playerName);

        setHomePlayers([...homeP, ...matchSubs].sort());
        setAwayPlayers([...awayP, ...matchSubs].sort());
      } catch (e) {
        console.error(e);
      }
      setLoadingData(false);
    };
    loadMatchData();
  }, [matchId]);

  // Game Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGameClockRunning && gameClock > 0) {
      interval = setInterval(() => setGameClock(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [isGameClockRunning, gameClock]);

  // Play Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayClockRunning && isGameClockRunning) {
      interval = setInterval(() => setPlayClock(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayClockRunning, isGameClockRunning]);

  // Timeout Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimeoutActive && timeoutClock > 0) {
      interval = setInterval(() => setTimeoutClock(c => Math.max(0, c - 1)), 1000);
    } else if (isTimeoutActive && timeoutClock === 0) {
      setIsTimeoutActive(false);
      setPlayClock(30);
      setIsBallSpotted(false);
      setIsGameClockRunning(false);
      setIsFirstPlayOfHalf(true);
    }
    return () => clearInterval(interval);
  }, [isTimeoutActive, timeoutClock]);

  // Halftime Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'HALFTIME' && halftimeClock > 0) {
      interval = setInterval(() => setHalftimeClock(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [step, halftimeClock]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAdjustingClock = (amount: number) => {
    setGameClock(c => Math.max(0, c + amount));
    clockIntervalRef.current = setInterval(() => {
      setGameClock(c => Math.max(0, c + amount));
    }, 150);
  };

  const stopAdjustingClock = () => {
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
  };

  // Autosave
  useEffect(() => {
    if (loadingData || showResumePrompt) return;
    const saveState = setTimeout(() => {
      updateDoc(doc(db, "matches", matchId), {
        status: 'in_progress',
        homeScore,
        awayScore,
        matchState: {
          currentDown, possession, homeScore, awayScore, half, gameClock, homeTimeouts, awayTimeouts, firstHalfStartPossession
        }
      }).catch(console.error);
    }, 1000);
    return () => clearTimeout(saveState);
  }, [currentDown, possession, homeScore, awayScore, half, gameClock, homeTimeouts, awayTimeouts, firstHalfStartPossession, loadingData, showResumePrompt]);

  const finalizeGame = async () => {
    try {
      await updateDoc(doc(db, "matches", matchId), {
        status: 'completed',
        homeScore,
        awayScore,
        completedAt: serverTimestamp(),
        didNotPlay,
        roster: {
          home: homePlayers,
          away: awayPlayers
        }
      });
      router.push(`/matches/${matchId}`);
    } catch (e) {
      console.error(e);
    }
  };

  const startSecondHalf = () => {
    setHalf(2);
    setGameClock(1200); // 20 mins
    setHomeTimeouts(1);
    setAwayTimeouts(1);
    setPossession(firstHalfStartPossession === homeTeamName ? awayTeamName : homeTeamName);
    setCurrentDown(1);
    setStep('PLAY_TYPE');
    setIsBallSpotted(false);
    setIsFirstPlayOfHalf(true);
    setIsGameClockRunning(false);
    setIsPlayClockRunning(false);
  };

  const callTimeout = (team: 'home' | 'away') => {
    if (team === 'home') setHomeTimeouts(0);
    else setAwayTimeouts(0);
    setIsGameClockRunning(false);
    setIsPlayClockRunning(false);
    setTimeoutClock(60);
    setIsTimeoutActive(true);
  };

  const handleSpotBall = () => {
    setIsBallSpotted(true);
    setPlayClock(30);
    setIsPlayClockRunning(true);
    if (gameClock > 120 && !isGameClockRunning) setIsGameClockRunning(true);
  };

  const resetPlay = () => {
    setIsPlayClockRunning(false);
    setPlayClock(30);
    setStep('PLAY_TYPE');
    setPlayType(null);
    setOutcome(null);
    setQbRunner("");
    setReceiver("");
    setDefenders([]);
    setFlaggers([]);
    setConvPts(null);
    setConvIsGood(null);
    setConvPasser("");
    setConvReceiver("");
    setIsOobPrompt(false);
    setPlayResult("");
  };

  const endPlay = () => {
    if (gameClock <= 0) {
      if (half === 1) {
        setStep('HALFTIME');
      } else if (half === 2) {
        setStep('GAME_OVER');
      }
    } else {
      setIsBallSpotted(false);
      resetPlay();
    }
  };

  const handlePlayTypeSelect = (type: "Pass" | "Run") => {
    setPlayType(type);
    setOutcome(type === "Pass" ? "Complete" : "Gain");
    if (type === "Pass") {
      setQbRunner(possession === homeTeamName ? lastHomeQB : lastAwayQB);
    } else {
      setQbRunner("");
    }
    setStep('DETAILS');
  };

  const handleDefenders = (player: string, max: number = 2) => {
    if (player === 'TEAM') {
      setDefenders(defenders.includes('TEAM') ? [] : ['TEAM']);
      return;
    }
    if (defenders.includes('TEAM')) {
      setDefenders([player]);
      return;
    }
    if (defenders.includes(player)) {
      setDefenders(defenders.filter(d => d !== player));
    } else {
      if (defenders.length < max) {
        setDefenders([...defenders, player]);
      } else if (max === 1) {
        setDefenders([player]);
      }
    }
  };

  const handleFlaggers = (player: string) => {
    if (player === 'TEAM') {
      setFlaggers(flaggers.includes('TEAM') ? [] : ['TEAM']);
      return;
    }
    if (flaggers.includes('TEAM')) {
      setFlaggers([player]);
      return;
    }
    if (flaggers.includes(player)) {
      setFlaggers(flaggers.filter(d => d !== player));
    } else {
      if (flaggers.length < 2) {
        setFlaggers([...flaggers, player]);
      }
    }
  };

  const hasOffenseSelected = () => {
    if (!qbRunner) return false;
    if (outcome === 'Complete' && !receiver) return false;
    return true;
  };

  const isPlayReadyToSave = () => {
    if (!qbRunner) return false;
    if (outcome === 'Complete' && !receiver) return false;
    if (outcome === 'Interception' && defenders.length !== 1) return false;
    if ((outcome === 'Sack' || outcome === 'FFL' || outcome === 'PBU') && defenders.length === 0) return false;
    if ((outcome === 'Complete' || outcome === 'Gain') && defenders.length === 0) return false;
    return true;
  };

  const buildPlayData = (result: string) => {
    return {
      matchId,
      possessionTeamId: possession === homeTeamName ? homeTeamId : awayTeamId,
      down: currentDown,
      playType,
      firstDown: result === 'First Down' || result === 'Touchdown',
      qbPlayerId: playType === 'Pass' ? qbRunner : null,
      runnerPlayerId: playType === 'Run' ? qbRunner : null,
      receiverPlayerId: receiver || null,
      defenders: defenders,
      flaggers: flaggers,
      passOutcome: outcome,
      isTouchdown: result === 'Touchdown',
      isPick6: result === 'Pick 6',
      isSafety: result === 'Safety',
      turnover: result === 'Turnover' || result === 'Pick 6' || (currentDown === 4 && result !== 'First Down' && result !== 'Repeat Down'),
      result: result,
      gameClock: gameClock,
      half: half
    };
  };

  const logPlayToFirestore = async (playData: any) => {
    try {
      await addDoc(collection(db, "plays"), {
        ...playData,
        timestamp: serverTimestamp()
      });
      console.log("Play saved to Firestore!");
    } catch (e) {
      console.error("Error saving play:", e);
    }
  };

  const handleSavePlay = (result: "Touchdown" | "First Down" | "Short" | "Safety" | "Turnover" | "Next Down" | "Pick 6" | "Repeat Down" | "Loss of Down") => {
    setIsPlayClockRunning(false);
    setPlayResult(result);

    if (playType === 'Pass') {
      if (possession === homeTeamName) setLastHomeQB(qbRunner);
      else setLastAwayQB(qbRunner);
    }

    if (result === 'Touchdown') {
      if (possession === homeTeamName) setHomeScore(s => s + 6);
      else setAwayScore(s => s + 6);
      setStep('CONVERSION');
      return;
    }

    if (result === 'Pick 6') {
      const newPoss = possession === homeTeamName ? awayTeamName : homeTeamName;
      if (newPoss === homeTeamName) setHomeScore(s => s + 6);
      else setAwayScore(s => s + 6);
      setPossession(newPoss);
      setStep('CONVERSION');
      return;
    }

    // Not a touchdown/pick 6, log the play immediately
    logPlayToFirestore(buildPlayData(result));

    if (result === 'Safety') {
      if (possession === homeTeamName) setAwayScore(s => s + 2);
      else setHomeScore(s => s + 2);
    }

    // Auto pause under 2 mins for incomplete or turnover
    if (gameClock <= 120 && (outcome === 'PBU' || outcome === 'Missed' || result === 'Turnover')) {
      setIsGameClockRunning(false);
    }
    if (gameClock <= 120 && isOobPrompt) {
      setIsGameClockRunning(false);
    }

    if (result === 'Safety' || outcome === 'Interception' || result === 'Turnover' || (currentDown === 4 && result !== 'First Down' && result !== 'Repeat Down')) {
      setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
      setCurrentDown(1);
    } else if (result === 'First Down') {
      setCurrentDown(1);
    } else if (result === 'Repeat Down') {
      // keep current down
    } else {
      if (currentDown < 4) setCurrentDown(currentDown + 1);
    }

    endPlay();
  };

  const finalizeConversion = () => {
    if (convIsGood && convPts) {
      if (possession === homeTeamName) setHomeScore(s => s + convPts);
      else setAwayScore(s => s + convPts);
    }

    // Log Touchdown + PAT to Firestore
    const finalPlay = {
      ...buildPlayData(playResult),
      conversionAttempt: convPts,
      conversionSuccess: convIsGood,
      conversionPasser: convPasser,
      conversionReceiver: convReceiver,
      pointsScored: 6 + (convIsGood ? convPts! : 0)
    };
    logPlayToFirestore(finalPlay);

    setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
    setCurrentDown(1);
    endPlay();
  };

  const getOffensiveRoster = () => {
    const roster = possession === homeTeamName ? homePlayers : awayPlayers;
    return [...roster, 'TEAM'];
  };

  const getDefensiveRoster = () => {
    const roster = possession === homeTeamName ? awayPlayers : homePlayers;
    return [...roster, 'TEAM'];
  };

  if (loadingData) {
    return (
      <div className="h-[100dvh] bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showResumePrompt && resumeStateData) {
    return (
      <div className="h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-col justify-center gap-12 p-12 blur-sm">
          <div className="flex justify-between items-center px-24">
            <span className="text-[15rem] font-black text-[#E31837] leading-none">{resumeStateData.homeScore}</span>
            <span className="text-[15rem] font-black text-blue-500 leading-none">{resumeStateData.awayScore}</span>
          </div>
        </div>
        <div className="relative z-10 bg-neutral-900 border border-white/10 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center max-w-2xl">
          <Save className="w-24 h-24 text-emerald-500 mb-8" />
          <h2 className="text-4xl font-black mb-4 uppercase tracking-widest text-white">Resume Game?</h2>
          <p className="text-xl text-neutral-400 mb-12">A game was already in progress. Would you like to resume from the last autosave, or start fresh?</p>
          <div className="flex gap-6 w-full">
            <button
              onClick={() => {
                const s = resumeStateData;
                setCurrentDown(s.currentDown);
                setPossession(s.possession);
                setHomeScore(s.homeScore);
                setAwayScore(s.awayScore);
                setHalf(s.half);
                setGameClock(s.gameClock);
                setHomeTimeouts(s.homeTimeouts);
                setAwayTimeouts(s.awayTimeouts);
                setFirstHalfStartPossession(s.firstHalfStartPossession || (homeTeamName || "HOME"));
                setShowResumePrompt(false);
              }}
              className="flex-1 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-2xl rounded-2xl transition-transform active:scale-95"
            >
              RESUME
            </button>
            <button
              onClick={async () => {
                setPossession(homeTeamName || "HOME");
                setFirstHalfStartPossession(homeTeamName || "HOME");
                setShowResumePrompt(false);
                
                try {
                  // Fetch original match data
                  const matchDoc = await getDoc(doc(db, "matches", matchId));
                  if (matchDoc.exists()) {
                    const mData = matchDoc.data();
                    
                    // Mark old match as hidden and finalized to preserve stats but remove from UI
                    await updateDoc(doc(db, "matches", matchId), { 
                      isHidden: true,
                      status: 'completed'
                    });
                    
                    // Create new identical match
                    const newMatch = await addDoc(collection(db, "matches"), {
                      week: mData.week,
                      homeTeamId: mData.homeTeamId,
                      homeTeamName: mData.homeTeamName,
                      awayTeamId: mData.awayTeamId,
                      awayTeamName: mData.awayTeamName,
                      date: mData.date,
                      time: mData.time,
                      isPreseason: mData.isPreseason || false,
                      status: 'in_progress',
                      homeScore: 0,
                      awayScore: 0,
                    });
                    
                    // Redirect to the new match
                    router.push(`/matches/${newMatch.id}/play-by-play`);
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
              className="flex-1 py-6 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-2xl border border-white/10 rounded-2xl transition-transform active:scale-95"
            >
              START FRESH
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isScoreboardFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col p-12 overflow-hidden">
        <button onClick={() => setIsScoreboardFullscreen(false)} className="absolute top-8 right-8 text-neutral-400 hover:text-white bg-white/10 p-4 rounded-full">
          <Minimize className="w-8 h-8" />
        </button>
        <div className="flex-1 flex flex-col justify-center gap-12">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold uppercase tracking-widest text-[#E31837] mb-4">{getOrdinal(half)} Half</span>
            <span className="text-[12rem] font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(gameClock)}</span>
          </div>
          <div className="flex justify-between items-center px-24">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-6">
                <FootballIcon active={possession === (homeTeamName || "HOME")} className={`w-12 h-12 ${possession === (homeTeamName || "HOME") ? 'text-[#E31837]' : 'text-neutral-500'}`} />
                <span className="text-6xl font-black text-white uppercase">{homeTeamName}</span>
              </div>
              <span className="text-[15rem] font-black text-[#E31837] leading-none">{homeScore}</span>
              <div className="flex gap-2">
                {homeTimeouts > 0 ? <div className="w-8 h-8 bg-white rounded-full"></div> : <div className="w-8 h-8 bg-neutral-800 rounded-full"></div>}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center pt-24">
              <span className="text-4xl font-bold text-neutral-600 uppercase tracking-widest mb-8">Play Clock</span>
              <span className={`text-9xl font-black tabular-nums leading-none ${playClock <= 0 ? 'text-red-600 animate-pulse' : playClock <= 10 ? 'text-amber-500' : 'text-neutral-300'}`}>
                {playClock}
              </span>
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-6">
                <span className="text-6xl font-black text-white uppercase">{awayTeamName}</span>
                <FootballIcon active={possession === (awayTeamName || "AWAY")} className={`w-12 h-12 ${possession === (awayTeamName || "AWAY") ? 'text-blue-500' : 'text-neutral-500'}`} />
              </div>
              <span className="text-[15rem] font-black text-blue-500 leading-none">{awayScore}</span>
              <div className="flex gap-2">
                {awayTimeouts > 0 ? <div className="w-8 h-8 bg-white rounded-full"></div> : <div className="w-8 h-8 bg-neutral-800 rounded-full"></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black text-white font-sans overflow-hidden flex flex-col relative">

      {/* TIMEOUT MODAL */}
      {isTimeoutActive && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center">
          <Timer className="w-32 h-32 text-white mb-8 animate-pulse" />
          <h2 className="text-5xl font-black mb-12 uppercase tracking-widest text-neutral-300">Timeout</h2>
          <span className="text-[12rem] font-black leading-none text-white tabular-nums mb-12">{timeoutClock}</span>
          <button
            onClick={() => setTimeoutClock(0)}
            className="py-6 px-12 bg-white/10 hover:bg-white/20 text-white font-bold text-2xl rounded-full transition-colors"
          >
            END TIMEOUT EARLY
          </button>
        </div>
      )}

      {/* SUB MODAL */}
      {isSubModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
          <div className="bg-neutral-900 border border-white/10 rounded-[3rem] p-8 max-w-xl w-full flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-3xl font-black uppercase tracking-widest">Add Sub</h2>
              <button onClick={() => { setIsSubModalOpen(false); setSubModalTeam(null); }} className="text-neutral-500 hover:text-white p-2 bg-white/5 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {!subModalTeam ? (
              <div className="flex flex-col gap-4">
                <h3 className="text-neutral-400 font-bold mb-2">Select team to add sub to:</h3>
                <button onClick={() => setSubModalTeam("HOME")} className="py-6 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-2xl font-black hover:bg-neutral-800 transition-colors uppercase flex items-center justify-between">
                  {homeTeamName}
                  <ChevronRight className="w-6 h-6 text-neutral-600" />
                </button>
                <button onClick={() => setSubModalTeam("AWAY")} className="py-6 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-2xl font-black hover:bg-neutral-800 transition-colors uppercase flex items-center justify-between">
                  {awayTeamName}
                  <ChevronRight className="w-6 h-6 text-neutral-600" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-hidden h-full">
                <button onClick={() => setSubModalTeam(null)} className="flex items-center text-amber-500 mb-2 hover:text-amber-400 w-fit shrink-0">
                  <ChevronLeft className="w-5 h-5 mr-1" /> Back
                </button>
                <h3 className="text-neutral-400 font-bold mb-2 shrink-0">Select player to join {subModalTeam === "HOME" ? homeTeamName : awayTeamName}:</h3>
                <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-4">
                  {allPlayers
                    .filter(p => {
                      const teamPlayers = subModalTeam === "HOME" ? homePlayers : awayPlayers;
                      return !teamPlayers.includes(p.playerName);
                    })
                    .sort((a, b) => a.playerName.localeCompare(b.playerName))
                    .map(p => {
                      const opposingTeamId = subModalTeam === "HOME" ? awayTeamId : homeTeamId;
                      const isOpponent = p.teamId === opposingTeamId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleAddSub(p.playerName, subModalTeam)}
                          className="py-4 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-lg font-bold hover:bg-white/10 transition-colors text-left flex justify-between items-center"
                        >
                          <span>{p.playerName} {isOpponent && <span className="text-amber-500 ml-1" title="Currently on opposing team">*</span>}</span>
                          <Plus className="w-5 h-5 text-neutral-600" />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-neutral-900 border-b border-[#E31837]/30 p-4 flex flex-col md:flex-row items-center justify-between shrink-0 z-50 gap-4 md:gap-0">
        <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-1/4">
          <div className="flex items-center gap-4">
            <Link href={`/matches/${matchId}`} className="flex items-center text-neutral-400 hover:text-white transition-colors bg-black p-3 rounded-2xl border border-white/10">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <button onClick={resetPlay} className="flex items-center text-neutral-400 hover:text-white bg-black p-3 rounded-2xl border border-white/10" title="Reset Current Play">
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
          <button onClick={() => setIsSubModalOpen(true)} className="flex items-center text-amber-500 hover:text-amber-400 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20" title="Add Temporary Sub">
            <Plus className="w-6 h-6 mr-1" /> Sub
          </button>
        </div>

        <div className="flex-1 flex flex-row items-center justify-center gap-2 md:gap-6 w-full md:w-auto mt-2 md:mt-0">
          <div className="flex flex-row items-center justify-end gap-1 md:gap-2 w-1/4">
            <button
              disabled={homeTimeouts === 0}
              onClick={() => callTimeout('home')}
              className="px-2 py-1 bg-neutral-950 border border-white/10 rounded-lg text-[10px] font-bold disabled:opacity-30 disabled:line-through hover:bg-white/10 shrink-0"
            >
              TO
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase truncate w-full text-right">{homeTeamName}</span>
              <span className="text-2xl md:text-3xl font-black text-[#E31837] leading-none">{homeScore}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 bg-black px-2 md:px-4 py-1 md:py-2 rounded-3xl border border-white/10 group">
            <button
              onPointerDown={() => startAdjustingClock(-10)}
              onPointerUp={stopAdjustingClock}
              onPointerLeave={stopAdjustingClock}
              className="p-1 md:p-2 text-neutral-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 select-none hidden md:block"
              title="Remove Time"
            >
              <Minus className="w-5 h-5 pointer-events-none" />
            </button>
            <span className="text-2xl md:text-3xl font-black tabular-nums text-white w-16 md:w-24 text-center">{formatTime(gameClock)}</span>
            <button
              onPointerDown={() => startAdjustingClock(10)}
              onPointerUp={stopAdjustingClock}
              onPointerLeave={stopAdjustingClock}
              className="p-1 md:p-2 text-neutral-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 select-none hidden md:block"
              title="Add Time"
            >
              <Plus className="w-5 h-5 pointer-events-none" />
            </button>
            <button onClick={() => setIsGameClockRunning(!isGameClockRunning)} className={`p-2 md:p-3 ml-1 md:ml-2 rounded-full ${isGameClockRunning ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
              {isGameClockRunning ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />}
            </button>
          </div>
          <div className="flex flex-row items-center justify-start gap-1 md:gap-2 w-1/4">
            <div className="flex flex-col items-start">
              <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase truncate w-full text-left">{awayTeamName}</span>
              <span className="text-2xl md:text-3xl font-black text-blue-500 leading-none">{awayScore}</span>
            </div>
            <button
              disabled={awayTimeouts === 0}
              onClick={() => callTimeout('away')}
              className="px-2 py-1 bg-neutral-950 border border-white/10 rounded-lg text-[10px] font-bold disabled:opacity-30 disabled:line-through hover:bg-white/10 shrink-0"
            >
              TO
            </button>
          </div>
          <button onClick={() => setIsScoreboardFullscreen(true)} className="ml-1 md:ml-4 bg-white/10 p-2 md:p-3 rounded-xl hover:bg-white/20 text-neutral-300 hidden sm:block">
            <Maximize className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      {/* GAME STATE BAR */}
      <div className="bg-neutral-950 border-b border-white/10 p-2 md:p-4 flex flex-row items-center justify-between shrink-0 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 md:gap-8 px-2 md:px-8 w-auto">
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest leading-none">Offense</span>
            <span className={`text-lg md:text-2xl font-black leading-tight ${possession === homeTeamName ? 'text-[#E31837]' : 'text-blue-500'}`}>{possession}</span>
          </div>
          <div className="h-6 md:h-8 w-px bg-white/10 shrink-0"></div>
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1 leading-none">Down</span>
            <div className="flex gap-1 md:gap-2">
              {[1, 2, 3, 4].map(d => (
                <button
                  key={d}
                  onClick={() => setCurrentDown(d)}
                  className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-xs md:text-lg transition-all shrink-0 ${currentDown === d ? 'bg-white text-black' : 'bg-neutral-900 border border-white/10 text-neutral-500 hover:text-white hover:border-white/30'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 px-2 md:px-8 shrink-0">
          <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest leading-none hidden sm:block">Play Clock</span>
          <span className={`text-2xl md:text-3xl font-black tabular-nums leading-none ${playClock <= 0 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>{playClock}</span>
        </div>
      </div>

      <main className="flex-1 p-6 flex flex-col overflow-hidden relative">

        {/* SPOT BALL OVERLAY */}
        {!isBallSpotted && step !== 'CONVERSION' && step !== 'HALFTIME' && step !== 'GAME_OVER' && !isTimeoutActive && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <div className="flex flex-col md:flex-row w-full max-w-7xl justify-between items-center px-4 sm:px-12 gap-8 md:gap-12 py-12 md:py-0">

              {/* Home Score (Left) */}
              <div className="hidden md:flex flex-col items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <FootballIcon active={possession === (homeTeamName || "HOME")} className={`w-10 h-10 ${possession === (homeTeamName || "HOME") ? 'text-[#E31837]' : 'text-neutral-500'}`} />
                  <span className="text-4xl font-black text-white uppercase">{homeTeamName}</span>
                </div>
                <span className="text-[8rem] font-black text-[#E31837] leading-none">{homeScore}</span>
                <div className="flex gap-2 mt-2">
                  {homeTimeouts > 0 ? <div className="w-5 h-5 bg-white rounded-full"></div> : <div className="w-5 h-5 bg-neutral-800 rounded-full"></div>}
                </div>
              </div>

              {/* Center Column (Time + Alert) */}
              <div className="flex flex-col items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xl font-bold uppercase tracking-widest text-[#E31837]">{getOrdinal(half)} Half</span>
                  <span className="text-[5rem] font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(gameClock)}</span>
                </div>

                {isFirstPlayOfHalf ? (
                  <div className="bg-neutral-900 border border-[#E31837]/30 p-12 rounded-[3rem] flex flex-col items-center shadow-[0_0_100px_rgba(227,24,55,0.2)] max-w-xl text-center">
                    <AlertCircle className="w-20 h-20 text-emerald-500 mb-6" />
                    <h2 className="text-3xl font-black mb-6 uppercase tracking-widest leading-tight">THE CLOCK WILL BEGIN ON THE SNAP</h2>
                    <button
                      onClick={() => { handleSpotBall(); setIsFirstPlayOfHalf(false); }}
                      className="py-6 px-10 bg-white hover:bg-neutral-200 text-black font-black text-xl md:text-2xl rounded-full shadow-2xl active:scale-95 transition-transform"
                    >
                      CLICK WHEN SNAPPED
                    </button>
                  </div>
                ) : (
                  <div className="bg-neutral-900 border border-amber-500/30 p-12 rounded-[3rem] flex flex-col items-center shadow-[0_0_100px_rgba(245,158,11,0.1)] max-w-xl text-center">
                    <AlertCircle className="w-20 h-20 text-amber-500 mb-6" />
                    <h2 className="text-3xl font-black mb-6 uppercase tracking-widest">Awaiting Spot</h2>
                    <button
                      onClick={handleSpotBall}
                      className="py-6 px-10 bg-white hover:bg-neutral-200 text-black font-black text-xl md:text-2xl rounded-full shadow-2xl active:scale-95 transition-transform"
                    >
                      CLICK WHEN SPOTTED
                    </button>
                  </div>
                )}
              </div>

              {/* Away Score (Right) */}
              <div className="hidden md:flex flex-col items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-white uppercase">{awayTeamName}</span>
                  <FootballIcon active={possession === (awayTeamName || "AWAY")} className={`w-10 h-10 ${possession === (awayTeamName || "AWAY") ? 'text-blue-500' : 'text-neutral-500'}`} />
                </div>
                <span className="text-[8rem] font-black text-blue-500 leading-none">{awayScore}</span>
                <div className="flex gap-2 mt-2">
                  {awayTimeouts > 0 ? <div className="w-5 h-5 bg-white rounded-full"></div> : <div className="w-5 h-5 bg-neutral-800 rounded-full"></div>}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* HALFTIME OVERLAY */}
        {step === 'HALFTIME' && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8">
            <h2 className="text-5xl font-black mb-8 uppercase tracking-widest text-[#E31837]">Halftime</h2>
            <span className="text-[12rem] font-black leading-none text-white tabular-nums mb-12">{formatTime(halftimeClock)}</span>
            {halftimeClock <= 0 ? (
              <button onClick={startSecondHalf} className="py-6 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-3xl rounded-full transition-transform active:scale-95 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                BEGIN SECOND HALF
              </button>
            ) : (
              <button onClick={startSecondHalf} className="py-4 px-8 bg-white/10 hover:bg-white/20 text-white font-bold text-xl rounded-full transition-colors">
                SKIP HALFTIME
              </button>
            )}
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {step === 'GAME_OVER' && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center p-8 overflow-y-auto">
            <h2 className="text-5xl font-black mb-8 uppercase tracking-widest text-emerald-500 mt-12">Game Over</h2>
            <div className="flex flex-col md:flex-row w-full max-w-4xl justify-between items-center mb-16 gap-8 md:gap-0">
              <div className="flex flex-col items-center gap-4">
                <span className="text-3xl font-black text-white uppercase">{homeTeamName}</span>
                <span className="text-[6rem] font-black text-[#E31837] leading-none">{homeScore}</span>
              </div>
              <div className="text-neutral-500 font-bold text-2xl tracking-widest">FINAL</div>
              <div className="flex flex-col items-center gap-4">
                <span className="text-3xl font-black text-white uppercase">{awayTeamName}</span>
                <span className="text-[6rem] font-black text-blue-500 leading-none">{awayScore}</span>
              </div>
            </div>

            <div className="w-full max-w-5xl bg-neutral-900 border border-white/10 rounded-3xl p-8 mb-12 flex flex-col items-center shadow-2xl">
              <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Did Not Participate</h3>
              <p className="text-neutral-400 mb-8 text-center max-w-2xl">Select any players who were absent or did not play in this game. This ensures they do not receive a "Game Played" stat for attendance purposes.</p>
              
              <div className="flex w-full gap-12">
                <div className="flex-1">
                  <h4 className="text-xl font-bold uppercase tracking-widest text-[#E31837] mb-4 border-b border-white/10 pb-2">{homeTeamName}</h4>
                  <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-4 hide-scrollbar">
                    {homePlayers.map(p => (
                      <button 
                        key={p} 
                        onClick={() => setDidNotPlay(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`p-3 rounded-xl font-bold text-left transition-colors flex justify-between items-center ${didNotPlay.includes(p) ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/5'}`}
                      >
                        {p}
                        {didNotPlay.includes(p) && <span className="text-xs uppercase tracking-widest">Absent</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold uppercase tracking-widest text-blue-500 mb-4 border-b border-white/10 pb-2">{awayTeamName}</h4>
                  <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-4 hide-scrollbar">
                    {awayPlayers.map(p => (
                      <button 
                        key={p} 
                        onClick={() => setDidNotPlay(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`p-3 rounded-xl font-bold text-left transition-colors flex justify-between items-center ${didNotPlay.includes(p) ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/5'}`}
                      >
                        {p}
                        {didNotPlay.includes(p) && <span className="text-xs uppercase tracking-widest">Absent</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={finalizeGame} className="py-6 px-12 bg-white hover:bg-neutral-200 text-black font-black text-3xl rounded-full transition-transform active:scale-95">
              FINALIZE GAME & SAVE STATS
            </button>
          </div>
        )}

        {/* WIZARD: PLAY TYPE */}
        {step === 'PLAY_TYPE' && (
          <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6 h-full max-w-6xl mx-auto w-full overflow-y-auto md:overflow-visible pb-12 md:pb-0">
            <button onClick={() => handlePlayTypeSelect("Pass")} className="bg-neutral-900 border-2 border-white/5 hover:border-blue-500 hover:bg-blue-900/20 rounded-3xl p-6 md:p-8 flex flex-row md:flex-col items-center justify-start md:justify-center gap-6 md:gap-6 transition-all group shadow-xl shrink-0">
              <span className="text-6xl md:text-8xl group-hover:scale-110 transition-transform">🏈</span>
              <span className="font-black text-3xl md:text-4xl">PASS</span>
            </button>
            <button onClick={() => handlePlayTypeSelect("Run")} className="bg-neutral-900 border-2 border-white/5 hover:border-emerald-500 hover:bg-emerald-900/20 rounded-3xl p-6 md:p-8 flex flex-row md:flex-col items-center justify-start md:justify-center gap-6 md:gap-6 transition-all group shadow-xl shrink-0">
              <span className="text-6xl md:text-8xl group-hover:scale-110 transition-transform">🏃‍♀️</span>
              <span className="font-black text-3xl md:text-4xl">RUN</span>
            </button>
            <button onClick={() => { setPlayType("Penalty"); setStep('DETAILS'); }} className="bg-neutral-900 border-2 border-white/5 hover:border-amber-500 hover:bg-amber-900/20 rounded-3xl p-6 md:p-8 flex flex-row md:flex-col items-center justify-start md:justify-center gap-6 md:gap-6 transition-all group shadow-xl shrink-0">
              <span className="text-6xl md:text-8xl group-hover:scale-110 transition-transform">🚩</span>
              <span className="font-black text-3xl md:text-4xl">PENALTY</span>
            </button>
          </div>
        )}

        {/* WIZARD: DETAILS */}
        {step === 'DETAILS' && (
          <div className="flex flex-col h-full gap-4 max-w-7xl mx-auto w-full animate-in slide-in-from-right-8 duration-200">
            <button
              onClick={() => { setStep('PLAY_TYPE'); setPlayType(null); setOutcome(null); }}
              className="self-start flex items-center gap-2 text-neutral-400 hover:text-white text-sm font-bold uppercase tracking-widest mb-[-0.5rem] mt-[-0.5rem] z-10"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Play Type
            </button>
            {playType === 'Penalty' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in zoom-in-95">
                <h3 className="text-3xl font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-4">
                  <Flag className="w-8 h-8" /> Penalty Outcome
                </h3>
                <button onClick={() => handleSavePlay('First Down')} className="w-full max-w-2xl py-8 rounded-3xl bg-blue-600 text-white font-black text-2xl hover:bg-blue-500 transition-colors">
                  FIRST DOWN (Due to Yards Gained)
                </button>
                <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
                  <button onClick={() => handleSavePlay('Repeat Down')} className="py-8 rounded-3xl bg-neutral-800 text-white font-black text-2xl border border-white/10 hover:bg-neutral-700 transition-colors">
                    REPEAT DOWN
                  </button>
                  <button onClick={() => handleSavePlay('Loss of Down')} className="py-8 rounded-3xl bg-neutral-800 text-white font-black text-2xl border border-white/10 hover:bg-neutral-700 transition-colors">
                    LOSS OF DOWN
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:flex gap-2 p-2 bg-neutral-900 border border-white/10 rounded-2xl shrink-0 relative z-10 w-full">
                  {playType === 'Pass' && ['Complete', 'Incomplete', 'Interception', 'Sack'].map((res) => {
                    const isActive = (res === 'Incomplete' && (outcome === 'Incomplete_Menu' || outcome === 'PBU' || outcome === 'Missed')) || outcome === res;
                    return (
                      <button
                        key={res} onClick={() => {
                          setOutcome(res === 'Incomplete' ? 'Incomplete_Menu' : res as any);
                          setDefenders([]);
                          setFlaggers([]);
                          setReceiver("");
                          setIsOobPrompt(false);
                        }}
                        className={`flex-1 py-3 md:py-4 text-xs md:text-xl font-bold uppercase tracking-wider rounded-xl transition-all ${isActive ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                      >
                        {res}
                      </button>
                    );
                  })}
                  {playType === 'Run' && ['Gain', 'FFL'].map((res) => (
                    <button
                      key={res} onClick={() => { setOutcome(res as any); setDefenders([]); setFlaggers([]); setIsOobPrompt(false); }}
                      className={`flex-1 py-3 md:py-4 text-xs md:text-xl font-bold uppercase tracking-wider rounded-xl transition-all ${outcome === res ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {res === 'FFL' ? 'Flag For Loss (FFL)' : 'Positive / No Gain'}
                    </button>
                  ))}
                </div>

                {outcome === 'Incomplete_Menu' ? (
                  <div className="flex-1 flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-8 animate-in zoom-in-95 overflow-y-auto pb-12 md:pb-0">
                    <button onClick={() => setOutcome('PBU')} className="flex-1 py-12 md:py-16 px-12 bg-neutral-900 border-2 border-white/10 hover:border-blue-500 rounded-3xl text-3xl font-black transition-all shadow-xl shrink-0 min-h-[200px]">
                      PASS BREAK UP
                    </button>
                    <button onClick={() => setOutcome('Missed')} className="flex-1 py-12 md:py-16 px-12 bg-neutral-900 border-2 border-white/10 hover:border-amber-500 rounded-3xl text-3xl font-black transition-all shadow-xl shrink-0 min-h-[200px]">
                      MISSED THROW
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-y-auto md:overflow-visible pb-24 md:pb-0">
                    {/* COL 1: Offense (QB) */}
                    <div className="flex-1 bg-neutral-900 rounded-3xl p-6 border border-white/5 flex flex-col shadow-lg relative min-h-[250px] md:min-h-0 shrink-0">
                      {!qbRunner && <div className="absolute top-4 right-4 w-3 h-3 bg-[#E31837] rounded-full animate-pulse"></div>}
                      <label className="text-neutral-400 font-bold uppercase tracking-widest mb-4">
                        {playType === 'Run' ? 'Runner' : 'Quarterback'}
                      </label>
                      <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar flex-1">
                        {getOffensiveRoster().map(p => (
                          <button key={p} onClick={() => { setQbRunner(p); if (receiver === p) setReceiver(""); }} className={`p-4 rounded-2xl font-bold text-left text-lg transition-all shrink-0 ${qbRunner === p ? 'bg-[#E31837] text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* COL 2: Offense (Receiver) */}
                    {outcome === 'Complete' && (
                      <div className="flex-1 bg-neutral-900 rounded-3xl p-6 border border-white/5 flex flex-col shadow-lg relative animate-in fade-in min-h-[250px] md:min-h-0 shrink-0">
                        {!receiver && outcome === 'Complete' && <div className="absolute top-4 right-4 w-3 h-3 bg-[#E31837] rounded-full animate-pulse"></div>}
                        <label className="text-neutral-400 font-bold uppercase tracking-widest mb-4">Receiver</label>
                        <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar flex-1">
                          {getOffensiveRoster().filter(p => p !== qbRunner || p === 'TEAM').map(p => (
                            <button key={p} onClick={() => setReceiver(p)} className={`p-4 rounded-2xl font-bold text-left text-lg transition-all shrink-0 ${receiver === p ? 'bg-[#E31837] text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COL 3: Defense */}
                    {(outcome === 'Complete' || outcome === 'Gain' || outcome === 'Sack' || outcome === 'FFL' || outcome === 'PBU' || outcome === 'Interception') && (
                      <div className="flex-1 bg-neutral-900 rounded-3xl p-6 border border-white/5 flex flex-col shadow-lg relative animate-in fade-in min-h-[250px] md:min-h-0 shrink-0">
                        {defenders.length === 0 && <div className="absolute top-4 right-4 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>}
                        <label className="text-neutral-400 font-bold uppercase tracking-widest mb-2 flex justify-between">
                          {outcome === 'Interception' ? 'Interceptor' : outcome === 'PBU' ? 'Pass Break Up' : 'Flagger(s)'}
                        </label>
                        {outcome !== 'Interception' && outcome !== 'PBU' && (
                          <span className="text-xs text-amber-500/80 mb-4">Select up to 2</span>
                        )}
                        <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar flex-1 mt-2">
                          {getDefensiveRoster().map(p => (
                            <button
                              key={p}
                              onClick={() => handleDefenders(p, (outcome === 'Interception' || outcome === 'PBU') ? 1 : 2)}
                              className={`p-4 rounded-2xl font-bold text-left text-lg transition-all shrink-0 ${defenders.includes(p) ? 'bg-amber-500 text-black' : 'bg-black border border-white/5 text-neutral-400'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COL 4: Interception Flaggers (Offense acting as Defense) */}
                    {outcome === 'Interception' && (
                      <div className="flex-1 bg-neutral-900 rounded-3xl p-6 border border-white/5 flex flex-col shadow-lg relative animate-in fade-in min-h-[250px] md:min-h-0 shrink-0">
                        <label className="text-neutral-400 font-bold uppercase tracking-widest mb-2 flex justify-between">
                          Flagger(s) (Offense)
                        </label>
                        <span className="text-xs text-amber-500/80 mb-4">Select up to 2 (Optional)</span>
                        <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar flex-1 mt-2">
                          {getOffensiveRoster().map(p => (
                            <button
                              key={p}
                              onClick={() => handleFlaggers(p)}
                              className={`p-4 rounded-2xl font-bold text-left text-lg transition-all shrink-0 ${flaggers.includes(p) ? 'bg-[#E31837] text-white' : 'bg-black border border-white/5 text-neutral-400'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* RESULTS ROW */}
                {outcome !== 'Incomplete_Menu' && (
                  <div className="shrink-0 pt-2 min-h-[90px]">

                    {/* OOB Prompt Logic */}
                    {isOobPrompt && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2">
                        <button onClick={() => handleSavePlay('First Down')} className="py-6 rounded-3xl bg-blue-600 text-white font-black text-xl">OOB - FIRST DOWN</button>
                        <button onClick={() => handleSavePlay('Short')} className="py-6 rounded-3xl bg-neutral-800 text-white font-black text-xl border border-white/10">OOB - SHORT</button>
                      </div>
                    )}

                    {/* Normal Results */}
                    {!isOobPrompt && (
                      <>
                        {/* Immediate Touchdown & OOB for Complete/Gain */}
                        {hasOffenseSelected() && (outcome === 'Complete' || outcome === 'Gain') && defenders.length === 0 && (
                          <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                            <button onClick={() => handleSavePlay('Touchdown')} className="py-6 rounded-3xl bg-emerald-600 text-white font-black text-xl">TOUCHDOWN</button>
                            <button onClick={() => setIsOobPrompt(true)} className="py-6 rounded-3xl bg-neutral-800 text-neutral-300 font-bold text-xl border border-white/10 hover:text-white">OUT OF BOUNDS</button>
                          </div>
                        )}

                        {/* Normal Complete/Gain with Flagger */}
                        {isPlayReadyToSave() && (outcome === 'Complete' || outcome === 'Gain') && defenders.length > 0 && (
                          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2">
                            <button onClick={() => handleSavePlay('First Down')} className="py-6 rounded-3xl bg-blue-600 text-white font-black text-xl">FIRST DOWN</button>
                            <button onClick={() => handleSavePlay('Short')} className="py-6 rounded-3xl bg-neutral-800 text-white font-black text-xl border border-white/10">SHORT OF THE LINE TO GAIN</button>
                          </div>
                        )}

                        {/* Interception Results */}
                        {hasOffenseSelected() && outcome === 'Interception' && defenders.length === 1 && (
                          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2">
                            {flaggers.length === 0 ? (
                              <>
                                <button onClick={() => handleSavePlay('Pick 6')} className="py-6 rounded-3xl bg-emerald-600 text-white font-black text-xl">PICK 6</button>
                                <button onClick={() => handleSavePlay('Turnover')} className="py-6 rounded-3xl bg-amber-600 text-white font-black text-xl border border-white/10">OOB / DOWNED</button>
                              </>
                            ) : (
                              <button onClick={() => handleSavePlay('Turnover')} className="col-span-2 py-6 rounded-3xl bg-amber-600 text-white font-black text-xl">FLAGGED (Save Turnover)</button>
                            )}
                          </div>
                        )}

                        {/* Other Outcomes (PBU, Missed, Sack, FFL) */}
                        <div className={`transition-all duration-300 ${hasOffenseSelected() && (outcome === 'PBU' || outcome === 'Missed' || outcome === 'Sack' || outcome === 'FFL') && isPlayReadyToSave() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
                          {(outcome === 'PBU' || outcome === 'Missed') && (
                            <button onClick={() => handleSavePlay('Next Down')} className="w-full py-6 rounded-3xl bg-neutral-800 text-white font-black text-2xl border border-white/10">SAVE & NEXT DOWN</button>
                          )}
                          {(outcome === 'Sack' || outcome === 'FFL') && (
                            <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => handleSavePlay('Short')} className="py-6 rounded-3xl bg-neutral-800 text-white font-black text-xl border border-white/10">Loss Of Yards</button>
                              <button onClick={() => handleSavePlay('Safety')} className="py-6 rounded-3xl bg-red-600 text-white font-black text-xl">Safety</button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* WIZARD: CONVERSION */}
        {step === 'CONVERSION' && (
          <div className="flex flex-col h-full gap-4 max-w-7xl mx-auto w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-emerald-400 flex items-center justify-center gap-4 bg-emerald-950/30 py-4 rounded-3xl border border-emerald-500/30 shrink-0">
              <Flag className="w-6 h-6" /> POINT AFTER ATTEMPT
            </h3>

            {!convPts && (
              <div className="flex-1 flex items-center justify-center gap-8">
                <button onClick={() => setConvPts(1)} className="w-64 h-64 bg-neutral-900 border border-white/10 hover:border-emerald-500 rounded-3xl flex flex-col items-center justify-center gap-4 group">
                  <span className="text-8xl font-black text-white group-hover:text-emerald-400">1</span>
                  <span className="text-xl font-bold uppercase tracking-widest text-neutral-500">From 5 Yd</span>
                </button>
                <button onClick={() => setConvPts(2)} className="w-64 h-64 bg-neutral-900 border border-white/10 hover:border-emerald-500 rounded-3xl flex flex-col items-center justify-center gap-4 group">
                  <span className="text-8xl font-black text-white group-hover:text-emerald-400">2</span>
                  <span className="text-xl font-bold uppercase tracking-widest text-neutral-500">From 10 Yd</span>
                </button>
              </div>
            )}

            {convPts && convIsGood === null && (
              <div className="flex-1 flex items-center justify-center gap-8 animate-in slide-in-from-right-4">
                <button onClick={() => setConvIsGood(true)} className="flex-1 max-w-sm py-16 bg-emerald-600 rounded-3xl font-black text-5xl text-white">GOOD</button>
                <button onClick={() => { setConvIsGood(false); finalizeConversion(); }} className="flex-1 max-w-sm py-16 bg-neutral-800 rounded-3xl font-black text-5xl text-white border border-white/10">NO GOOD</button>
              </div>
            )}

            {convPts && convIsGood && (
              <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center bg-neutral-900 border border-white/10 px-8 py-4 rounded-2xl shrink-0">
                  <span className="text-xl font-bold uppercase">Success: {convPts} Point(s)</span>
                  <span className="text-sm text-neutral-400">Select players to award stats</span>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="bg-neutral-900 rounded-3xl p-6 border border-white/5 flex flex-col shadow-lg relative">
                    {!convPasser && <div className="absolute top-4 right-4 w-3 h-3 bg-[#E31837] rounded-full animate-pulse"></div>}
                    <label className="text-neutral-400 font-bold uppercase tracking-widest mb-4">Passer / Runner</label>
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-64 hide-scrollbar">
                      {getOffensiveRoster().map(p => (
                        <button key={p} onClick={() => { setConvPasser(p); if (convReceiver === p) setConvReceiver(""); }} className={`p-4 rounded-xl font-bold text-left transition-all ${convPasser === p ? 'bg-[#E31837] text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-neutral-900 rounded-3xl p-6 border border-white/5 flex flex-col shadow-lg">
                    <label className="text-neutral-400 font-bold uppercase tracking-widest mb-4">Receiver (Optional)</label>
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-64 hide-scrollbar">
                      {getOffensiveRoster().filter(p => p !== convPasser || p === 'TEAM').map(p => (
                        <button key={p} onClick={() => setConvReceiver(convReceiver === p ? '' : p)} className={`p-4 rounded-xl font-bold text-left transition-all ${convReceiver === p ? 'bg-[#E31837] text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`transition-all duration-300 ${convPasser ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                  <button onClick={finalizeConversion} className="w-full py-6 rounded-3xl bg-[#E31837] text-white font-black text-2xl">
                    SAVE CONVERSION STATS
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
