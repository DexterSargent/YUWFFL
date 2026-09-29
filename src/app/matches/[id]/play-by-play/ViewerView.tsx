"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";

export default function ViewerView({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  
  const [matchData, setMatchData] = useState<any>(null);
  const [plays, setPlays] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'play-by-play' | 'box-score'>('play-by-play');
  const [boxScoreTab, setBoxScoreTab] = useState<'home' | 'away'>('home');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "players"), (snap) => {
      setPlayers(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, []);

  const calculateBoxScore = () => {
    const statsMap: Record<string, any> = {};
    const initPlayer = (name: string) => {
      if (!statsMap[name]) {
        statsMap[name] = {
          name,
          passAtt: 0, passComp: 0, passTD: 0, passInt: 0,
          receptions: 0, recTD: 0,
          rushAtt: 0, rushTD: 0,
          convPass: 0, convRec: 0,
          flagPulls: 0, sacks: 0, ffl: 0, int: 0, defTD: 0, pbu: 0, safeties: 0,
        };
      }
    };

    plays.forEach(play => {
      // Passing
      if (play.playType === 'Pass' && play.qbPlayerId) {
        initPlayer(play.qbPlayerId);
        statsMap[play.qbPlayerId].passAtt += 1;
        if (play.passOutcome === 'Complete') statsMap[play.qbPlayerId].passComp += 1;
        if (play.isTouchdown) statsMap[play.qbPlayerId].passTD += 1;
        if (play.passOutcome === 'Interception') statsMap[play.qbPlayerId].passInt += 1;
      }
      // Receiving
      if (play.playType === 'Pass' && play.passOutcome === 'Complete' && play.receiverPlayerId) {
        initPlayer(play.receiverPlayerId);
        statsMap[play.receiverPlayerId].receptions += 1;
        if (play.isTouchdown) statsMap[play.receiverPlayerId].recTD += 1;
      }
      // Rushing
      if (play.playType === 'Run' && play.runnerPlayerId) {
        initPlayer(play.runnerPlayerId);
        statsMap[play.runnerPlayerId].rushAtt += 1;
        if (play.isTouchdown) statsMap[play.runnerPlayerId].rushTD += 1;
      }
      // Conversions
      if (play.conversionSuccess) {
        if (play.conversionPasser) {
          initPlayer(play.conversionPasser);
          statsMap[play.conversionPasser].convPass += 1;
        }
        if (play.conversionReceiver) {
          initPlayer(play.conversionReceiver);
          statsMap[play.conversionReceiver].convRec += 1;
        }
      }
      // Defense
      if (play.defenders && Array.isArray(play.defenders)) {
        play.defenders.forEach((defenderName: string) => {
          initPlayer(defenderName);
          if (play.passOutcome === 'Interception') {
            statsMap[defenderName].int += 1;
            if (play.isPick6) statsMap[defenderName].defTD += 1;
          } else if (play.passOutcome === 'PBU') {
            statsMap[defenderName].pbu += 1;
          } else if (play.passOutcome === 'Sack') {
            statsMap[defenderName].sacks += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety) statsMap[defenderName].safeties += 1;
          } else if (play.passOutcome === 'FFL') {
            statsMap[defenderName].ffl += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety) statsMap[defenderName].safeties += 1;
          } else {
            statsMap[defenderName].flagPulls += 1;
          }
        });
      }
    });

    const allStats = Object.values(statsMap);
    const filtered = allStats.filter(s => {
      const p = players.find(player => player.playerName === s.name);
      if (!p) return true; // Show if unknown
      const targetTeamId = boxScoreTab === 'home' ? matchData?.homeTeamId : matchData?.awayTeamId;
      return p.teamId === targetTeamId;
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
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

  const getOrdinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  const formatPlaySentence = (play: any) => {
    let sentence = "";
    
    if (play.playType === 'Pass') {
      const qb = play.qbPlayerId || "Unknown QB";
      const rec = play.receiverPlayerId;
      const defs = play.defenders?.length ? play.defenders.join(" and ") : "";

      if (play.passOutcome === 'Complete') {
        sentence = `${qb} pass complete to ${rec}`;
        if (defs) sentence += ` (Flagged by ${defs})`;
      } else if (play.passOutcome === 'Interception') {
        sentence = `${qb} pass intercepted by ${defs || "Unknown"}`;
      } else if (play.passOutcome === 'PBU') {
        sentence = `${qb} pass broken up by ${defs || "Unknown"}`;
      } else if (play.passOutcome === 'Missed') {
        sentence = `${qb} pass incomplete/missed`;
      } else if (play.passOutcome === 'Sack') {
        sentence = `${qb} sacked by ${defs || "Unknown"}`;
      } else {
        sentence = `${qb} pass (${play.passOutcome})`;
      }
    } else if (play.playType === 'Run') {
      const runner = play.runnerPlayerId || "Unknown Runner";
      const defs = play.defenders?.length ? play.defenders.join(" and ") : "";
      
      if (play.passOutcome === 'Gain') {
        sentence = `${runner} run`;
        if (defs) sentence += ` (Flagged by ${defs})`;
      } else if (play.passOutcome === 'FFL') {
        sentence = `${runner} flagged for loss by ${defs || "Unknown"}`;
      } else {
        sentence = `${runner} run (${play.passOutcome})`;
      }
    }

    if (play.isPick6) {
      sentence += " for a Pick 6!";
    } else if (play.isTouchdown) {
      sentence += " for a TOUCHDOWN!";
    } else if (play.isSafety) {
      sentence += " for a SAFETY!";
    } else if (play.firstDown) {
      sentence += " for a FIRST DOWN.";
    } else if (play.result) {
      sentence += ` (${play.result})`;
    }

    if (play.conversionAttempt) {
      sentence += "\n";
      const convType = play.conversionAttempt === 1 ? "1-PT" : "2-PT";
      if (play.conversionSuccess) {
        if (play.conversionReceiver) {
          sentence += `${convType} CONVERSION GOOD: ${play.conversionPasser} pass to ${play.conversionReceiver}`;
        } else {
          sentence += `${convType} CONVERSION GOOD: ${play.conversionPasser} run`;
        }
      } else {
        sentence += `${convType} CONVERSION FAILED`;
      }
    }

    return sentence;
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "matches", matchId), (docSnap) => {
      if (docSnap.exists()) {
        setMatchData(docSnap.data());
      }
    });
    return () => unsub();
  }, [matchId]);

  useEffect(() => {
    const q = query(
      collection(db, "plays"),
      where("matchId", "==", matchId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const p = snap.docs.map(d => d.data());
      p.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setPlays(p);
    });
    return () => unsub();
  }, [matchId]);

  if (!matchData) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const s = matchData.matchState || {
    homeScore: matchData.homeScore || 0,
    awayScore: matchData.awayScore || 0,
    half: 1,
    gameClock: 1200,
    currentDown: 1,
    possession: matchData.homeTeamName || "HOME",
    homeTimeouts: 1,
    awayTimeouts: 1,
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const sec = Math.max(0, seconds) % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-black text-white font-sans flex flex-col">
      <header className="bg-neutral-900 border-b border-[#E31837]/30 p-4 flex items-center shrink-0">
        <Link href={`/matches/${matchId}`} className="flex items-center text-neutral-400 hover:text-white transition-colors bg-black p-3 rounded-2xl border border-white/10">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <span className="ml-4 font-bold uppercase tracking-widest text-neutral-500">Live Game Viewer</span>
      </header>

      <div className="bg-neutral-950 p-8 border-b border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <FootballIcon active={s.possession === (matchData.homeTeamName || "HOME")} className={`w-8 h-8 ${s.possession === (matchData.homeTeamName || "HOME") ? 'text-[#E31837]' : 'text-neutral-500'}`} />
              <span className="text-2xl font-black text-white uppercase">{matchData.homeTeamName || "HOME"}</span>
            </div>
            <span className="text-[6rem] font-black text-[#E31837] leading-none">{s.homeScore}</span>
            <div className="flex gap-2">
              {s.homeTimeouts > 0 ? <div className="w-4 h-4 bg-white rounded-full"></div> : <div className="w-4 h-4 bg-neutral-800 rounded-full"></div>}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <span className="text-xl font-bold uppercase tracking-widest text-[#E31837]">{getOrdinal(s.half)} Half</span>
            <span className="text-[5rem] font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(s.gameClock)}</span>
            <div className="mt-4 bg-black border border-white/10 rounded-full px-6 py-2 flex gap-4 text-lg font-bold">
              <span className="text-neutral-500">{getOrdinal(s.currentDown)} Down</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-white uppercase">{matchData.awayTeamName || "AWAY"}</span>
              <FootballIcon active={s.possession === (matchData.awayTeamName || "AWAY")} className={`w-8 h-8 ${s.possession === (matchData.awayTeamName || "AWAY") ? 'text-blue-500' : 'text-neutral-500'}`} />
            </div>
            <span className="text-[6rem] font-black text-blue-500 leading-none">{s.awayScore}</span>
            <div className="flex gap-2">
              {s.awayTimeouts > 0 ? <div className="w-4 h-4 bg-white rounded-full"></div> : <div className="w-4 h-4 bg-neutral-800 rounded-full"></div>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border-b border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto flex">
          <button 
            onClick={() => setActiveTab('play-by-play')}
            className={`flex-1 py-4 font-bold tracking-widest uppercase text-sm transition-colors ${activeTab === 'play-by-play' ? 'text-[#E31837] border-b-2 border-[#E31837]' : 'text-neutral-500 hover:text-white'}`}
          >
            Play-by-Play
          </button>
          <button 
            onClick={() => setActiveTab('box-score')}
            className={`flex-1 py-4 font-bold tracking-widest uppercase text-sm transition-colors ${activeTab === 'box-score' ? 'text-[#E31837] border-b-2 border-[#E31837]' : 'text-neutral-500 hover:text-white'}`}
          >
            Live Box Score
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-black">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {activeTab === 'play-by-play' && (
            <>
              {plays.length === 0 && (
                <div className="text-neutral-600 text-center font-bold">No plays logged yet.</div>
              )}
              {plays.map((play, idx) => (
                <div key={idx} className="bg-neutral-900 border border-white/5 p-6 rounded-2xl flex flex-col gap-2 shadow-lg">
                  <div className="flex justify-between items-center text-sm font-bold tracking-widest text-neutral-500 uppercase">
                    <span>{play.possession} - {getOrdinal(play.down)} Down</span>
                    <span>{play.points > 0 ? `+${play.points} PTS` : ''}</span>
                  </div>
                  <p className="text-xl text-white font-medium whitespace-pre-wrap">
                    {formatPlaySentence(play)}
                  </p>
                </div>
              ))}
            </>
          )}

          {activeTab === 'box-score' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => setBoxScoreTab('home')}
                  className={`py-2 px-6 rounded-full font-bold uppercase tracking-widest text-sm transition-all ${boxScoreTab === 'home' ? 'bg-[#E31837] text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
                >
                  {matchData.homeTeamName || "HOME"}
                </button>
                <button 
                  onClick={() => setBoxScoreTab('away')}
                  className={`py-2 px-6 rounded-full font-bold uppercase tracking-widest text-sm transition-all ${boxScoreTab === 'away' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
                >
                  {matchData.awayTeamName || "AWAY"}
                </button>
              </div>
              <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 shadow-lg overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-500 font-bold uppercase tracking-widest">
                    <th className="pb-4 pr-4">Player</th>
                    <th className="pb-4 px-4 text-center">C/ATT</th>
                    <th className="pb-4 px-4 text-center">PASS TD</th>
                    <th className="pb-4 px-4 text-center">INT</th>
                    <th className="pb-4 px-4 text-center">REC</th>
                    <th className="pb-4 px-4 text-center">REC TD</th>
                    <th className="pb-4 px-4 text-center">RUSH</th>
                    <th className="pb-4 px-4 text-center">RUSH TD</th>
                    <th className="pb-4 px-4 text-center">FLAGS</th>
                    <th className="pb-4 px-4 text-center">SACKS</th>
                    <th className="pb-4 px-4 text-center">DEF INT</th>
                    <th className="pb-4 pl-4 text-center">DEF TD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calculateBoxScore().map((stat: any, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4 font-bold text-white">{stat.name}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.passComp}/{stat.passAtt}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.passTD}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.passInt}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.receptions}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.recTD}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.rushAtt}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.rushTD}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.flagPulls}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.sacks}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{stat.int}</td>
                      <td className="py-3 pl-4 text-center text-neutral-300">{stat.defTD}</td>
                    </tr>
                  ))}
                  {calculateBoxScore().length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-neutral-600 font-bold">No stats logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
