"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Activity, Trophy, Users, Crosshair, Shield, MoveRight, ChevronUp, ChevronDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function StatsAndStandings() {
  const [activeTab, setActiveTab] = useState<"team" | "individual">("team");
  const [individualTab, setIndividualTab] = useState<"passing" | "receiving" | "defense">("passing");

  const [sortTeam, setSortTeam] = useState<{ key: string, direction: 'asc'|'desc' }>({ key: 'pts', direction: 'desc' });
  const [sortIndiv, setSortIndiv] = useState<{ key: string, direction: 'asc'|'desc' }>({ key: '', direction: 'desc' });

  const [standings, setStandings] = useState<any[]>([]);
  const [individualStats, setIndividualStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [teamsSnap, playersSnap, matchesSnap, playsSnap] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "players")),
          getDocs(collection(db, "matches")),
          getDocs(collection(db, "plays")),
        ]);

        const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        const plays = playsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        // === TEAM STANDINGS ===
        const teamsMap: Record<string, any> = {};
        teams.forEach(t => {
          teamsMap[t.id] = {
            id: t.id,
            name: t.name,
            played: 0, won: 0, lost: 0, tied: 0, pf: 0, pa: 0, diff: 0, pts: 0
          };
        });

        // === INDIVIDUAL STATS ===
        const statsMap: Record<string, any> = {};
        players.forEach(p => {
          statsMap[p.playerName] = {
            name: p.playerName,
            teamId: p.teamId,
            teamName: teamsMap[p.teamId]?.name || "Unknown",
            gamesPlayed: 0,
            passAtt: 0,
            passComp: 0,
            passTD: 0,
            passInt: 0,
            receptions: 0,
            recTD: 0,
            rushAtt: 0,
            rushTD: 0,
            flagPulls: 0,
            sacks: 0,
            int: 0,
            defTD: 0,
            convPass: 0,
            convRec: 0,
            pbu: 0,
            safeties: 0,
            ffl: 0
          };
        });

        matches.forEach(m => {
          if (m.status === 'completed' && typeof m.homeScore === 'number' && typeof m.awayScore === 'number' && !m.isHidden) {
            const h = teamsMap[m.homeTeamId];
            const a = teamsMap[m.awayTeamId];
            if (h && a) {
              if (!m.isPreseason) {
                h.played += 1;
                a.played += 1;
                h.pf += m.homeScore;
                h.pa += m.awayScore;
                a.pf += m.awayScore;
                a.pa += m.homeScore;
                
                
                if (m.homeScore > m.awayScore) {
                  h.won += 1; h.pts += 2;
                  a.lost += 1;
                } else if (m.homeScore < m.awayScore) {
                  a.won += 1; a.pts += 2;
                  h.lost += 1;
                } else {
                  h.tied += 1; h.pts += 1;
                  a.tied += 1; a.pts += 1;
                }
                
                // Increment games played for players not in didNotPlay
                const dnp = m.didNotPlay || [];
                
                let matchPlayerNames: string[] = [];
                if (m.roster && m.roster.home && m.roster.away) {
                  matchPlayerNames = [...m.roster.home, ...m.roster.away];
                } else {
                  const homeP = players.filter(p => p.teamId === m.homeTeamId);
                  const awayP = players.filter(p => p.teamId === m.awayTeamId);
                  matchPlayerNames = [...homeP, ...awayP].map(p => p.playerName);
                }

                matchPlayerNames.forEach(playerName => {
                  if (statsMap[playerName] && !dnp.includes(playerName)) {
                    statsMap[playerName].gamesPlayed += 1;
                  }
                });
              }
            }
          }
        });

        const computedStandings = Object.values(teamsMap).filter(t => t.name !== 'Free Agent').map(t => {
          t.diff = t.pf - t.pa;
          return t;
        });

        const sortedForRank = [...computedStandings].sort((a, b) => {
          if (a.pts !== b.pts) return b.pts - a.pts;
          
          const h2hMatches = matches.filter(m => m.status === 'completed' && 
            ((m.homeTeamId === a.id && m.awayTeamId === b.id) || (m.homeTeamId === b.id && m.awayTeamId === a.id)));
          
          if (h2hMatches.length > 0) {
            let aWins = 0;
            let bWins = 0;
            h2hMatches.forEach(m => {
              const aIsHome = m.homeTeamId === a.id;
              const aScore = aIsHome ? m.homeScore : m.awayScore;
              const bScore = aIsHome ? m.awayScore : m.homeScore;
              if (aScore > bScore) aWins++;
              else if (bScore > aScore) bWins++;
            });
            if (aWins !== bWins) return bWins - aWins;
          }
          return b.diff - a.diff;
        });

        sortedForRank.forEach((team, idx) => {
          const originalTeam = computedStandings.find(t => t.id === team.id);
          if (originalTeam) (originalTeam as any).rank = idx + 1;
        });

        plays.forEach(play => {
          const m = matches.find(match => match.id === play.matchId);
          if (m?.isPreseason || m?.isHidden) return;
          const dnp = m?.didNotPlay || [];
          const isEligible = (name: string) => name && !dnp.includes(name);

          // Passing
          if (play.playType === 'Pass' && isEligible(play.qbPlayerId) && statsMap[play.qbPlayerId]) {
            statsMap[play.qbPlayerId].passAtt += 1;
            if (play.passOutcome === 'Complete') {
              statsMap[play.qbPlayerId].passComp += 1;
            }
            if (play.isTouchdown) {
              statsMap[play.qbPlayerId].passTD += 1;
            }
            if (play.passOutcome === 'Interception') {
              statsMap[play.qbPlayerId].passInt += 1;
            }
          }

          // Receiving
          if (play.playType === 'Pass' && play.passOutcome === 'Complete' && isEligible(play.receiverPlayerId) && statsMap[play.receiverPlayerId]) {
            statsMap[play.receiverPlayerId].receptions += 1;
            if (play.isTouchdown) {
              statsMap[play.receiverPlayerId].recTD += 1;
            }
          }

          // Rushing
          if (play.playType === 'Run' && isEligible(play.runnerPlayerId) && statsMap[play.runnerPlayerId]) {
            statsMap[play.runnerPlayerId].rushAtt += 1;
            if (play.isTouchdown) {
              statsMap[play.runnerPlayerId].rushTD += 1;
            }
          }

          // Conversions
          if (play.conversionSuccess) {
            if (isEligible(play.conversionPasser) && statsMap[play.conversionPasser]) {
              statsMap[play.conversionPasser].convPass += 1;
            }
            if (isEligible(play.conversionReceiver) && statsMap[play.conversionReceiver]) {
              statsMap[play.conversionReceiver].convRec += 1;
            }
          }

          // Defense
          if (play.defenders && Array.isArray(play.defenders)) {
            play.defenders.forEach((defenderName: string) => {
              if (!isEligible(defenderName) || !statsMap[defenderName]) return;
              
              if (play.passOutcome === 'Interception') {
                statsMap[defenderName].int += 1;
                if (play.isPick6) {
                  statsMap[defenderName].defTD += 1;
                }
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
                if (play.isSafety) statsMap[defenderName].safeties += 1;
              }
            });
          }

          // Interception Flaggers (offensive players tackling interceptor)
          if (play.passOutcome === 'Interception' && play.flaggers && Array.isArray(play.flaggers)) {
            play.flaggers.forEach((flaggerName: string) => {
              if (isEligible(flaggerName) && statsMap[flaggerName]) {
                statsMap[flaggerName].flagPulls += 1; 
              }
            });
          }
        });

        setStandings(computedStandings);
        setIndividualStats(Object.values(statsMap));
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
      setLoading(false);
    };

    fetchAllData();
  }, []);

  const getSortedStandings = () => {
    return [...standings].sort((a, b) => {
      const valA = a[sortTeam.key];
      const valB = b[sortTeam.key];
      if (valA < valB) return sortTeam.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortTeam.direction === 'asc' ? 1 : -1;
      
      // Secondary sort if tied: fallback to true league rank
      return sortTeam.direction === 'asc' ? (b as any).rank - (a as any).rank : (a as any).rank - (b as any).rank;
    });
  };

  const getSortedIndividualStats = () => {
    let sorted = [...individualStats];
    
    // Default sort if none selected
    let key = sortIndiv.key;
    if (!key) {
      if (individualTab === 'passing') key = 'passTD';
      else if (individualTab === 'receiving') key = 'receptions';
      else key = 'flagPulls';
    }

    sorted.sort((a, b) => {
      // Special case for comp %
      if (key === 'compPct') {
        const pctA = a.passAtt > 0 ? (a.passComp / a.passAtt) : 0;
        const pctB = b.passAtt > 0 ? (b.passComp / b.passAtt) : 0;
        return sortIndiv.direction === 'asc' ? pctA - pctB : pctB - pctA;
      }

      const valA = a[key];
      const valB = b[key];
      if (valA < valB) return sortIndiv.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortIndiv.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // Filter out players with zero stats in the active category to keep it clean
    if (individualTab === 'passing') {
      sorted = sorted.filter(p => p.passAtt > 0);
    } else if (individualTab === 'receiving') {
      sorted = sorted.filter(p => p.receptions > 0 || p.rushAtt > 0);
    } else {
      sorted = sorted.filter(p => p.flagPulls > 0 || p.int > 0 || p.pbu > 0 || p.safeties > 0);
    }
    return sorted;
  };

  const sortedStandings = getSortedStandings();
  const sortedIndividualStats = getSortedIndividualStats();

  const handleSortTeam = (key: string) => {
    setSortTeam(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSortIndiv = (key: string) => {
    setSortIndiv(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const ThTeam = ({ label, sortKey, className = "" }: { label: string, sortKey: string, className?: string }) => (
    <th className={`py-4 px-6 cursor-pointer hover:bg-white/5 transition-colors ${className}`} onClick={() => handleSortTeam(sortKey)}>
      <div className="flex items-center justify-center gap-1">
        {label}
        {sortTeam.key === sortKey && (sortTeam.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </div>
    </th>
  );

  const ThIndiv = ({ label, sortKey, className = "" }: { label: string, sortKey: string, className?: string }) => (
    <th className={`py-4 px-6 cursor-pointer hover:bg-white/5 transition-colors ${className}`} onClick={() => handleSortIndiv(sortKey)}>
      <div className="flex items-center justify-center gap-1">
        {label}
        {(sortIndiv.key === sortKey || (!sortIndiv.key && ((individualTab === 'passing' && sortKey === 'passTD') || (individualTab === 'receiving' && sortKey === 'receptions') || (individualTab === 'defense' && sortKey === 'flagPulls')))) && (
          sortIndiv.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#E31837]/40 p-6 md:p-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-[#E31837] rounded-full mix-blend-screen filter blur-[200px] opacity-10 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Link href="/" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-4">
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-4xl font-extrabold flex items-center gap-3">
              <Activity className="w-8 h-8 text-[#E31837]" />
              Stats & Standings
            </h1>
            <p className="text-neutral-400 mt-2">Track team performance and comprehensive player leaderboards.</p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1 bg-white/5 rounded-2xl w-full max-w-md mx-auto backdrop-blur-md border border-white/10">
          <button
            onClick={() => setActiveTab("team")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all ${
              activeTab === "team" ? "bg-[#E31837] text-white shadow-lg" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" /> Team Standings
          </button>
          <button
            onClick={() => setActiveTab("individual")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all ${
              activeTab === "individual" ? "bg-[#E31837] text-white shadow-lg" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" /> Individual Stats
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {activeTab === "team" && (
            <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl mt-8">
              <div className="bg-neutral-900 px-8 py-6 border-b border-white/5 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h2 className="text-2xl font-bold">Team Standings</h2>
              </div>
              
              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Rank</th>
                      <th className="py-4 px-6 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSortTeam('name')}>
                        <div className="flex items-center gap-1">Team {sortTeam.key === 'name' && (sortTeam.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                      </th>
                      <ThTeam label="Played" sortKey="played" />
                      <ThTeam label="W" sortKey="won" className="text-emerald-500" />
                      <ThTeam label="L" sortKey="lost" className="text-red-500" />
                      <ThTeam label="T" sortKey="tied" />
                      <ThTeam label="PF" sortKey="pf" />
                      <ThTeam label="PA" sortKey="pa" />
                      <ThTeam label="DIFF" sortKey="diff" />
                      <ThTeam label="PTS" sortKey="pts" className="text-white" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedStandings.map((row, index) => (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-6">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${(row as any).rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-neutral-400'}`}>
                            {(row as any).rank || index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-lg">{row.name}</td>
                        <td className="py-4 px-6 text-center text-neutral-400">{row.played}</td>
                        <td className="py-4 px-6 text-center font-medium text-emerald-400">{row.won}</td>
                        <td className="py-4 px-6 text-center font-medium text-red-400">{row.lost}</td>
                        <td className="py-4 px-6 text-center text-neutral-500">{row.tied}</td>
                        <td className="py-4 px-6 text-center text-neutral-300">{row.pf}</td>
                        <td className="py-4 px-6 text-center text-neutral-300">{row.pa}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${row.diff > 0 ? 'bg-emerald-500/10 text-emerald-400' : row.diff < 0 ? 'bg-red-500/10 text-red-400' : 'text-neutral-500'}`}>
                            {row.diff > 0 ? '+' : ''}{row.diff}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center font-black text-xl text-white">{row.pts}</td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-neutral-500">No completed matches found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "individual" && (
            <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl mt-8">
              <div className="bg-neutral-900 px-8 py-6 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold">Player Leaderboards</h2>
                </div>
                
                {/* Sub-Tabs for Stats Categories */}
                <div className="flex bg-black rounded-lg border border-white/10 p-1">
                  <button onClick={() => setIndividualTab("passing")} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${individualTab === 'passing' ? 'bg-[#E31837] text-white' : 'text-neutral-500 hover:text-white'}`}>
                    Passing
                  </button>
                  <button onClick={() => setIndividualTab("receiving")} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${individualTab === 'receiving' ? 'bg-[#E31837] text-white' : 'text-neutral-500 hover:text-white'}`}>
                    Receiving / Rushing
                  </button>
                  <button onClick={() => setIndividualTab("defense")} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${individualTab === 'defense' ? 'bg-[#E31837] text-white' : 'text-neutral-500 hover:text-white'}`}>
                    Defense
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    {individualTab === "passing" && (
                      <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Rank</th>
                        <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv('name')}>
                          <div className="flex items-center gap-1">Player {sortIndiv.key === 'name' && (sortIndiv.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                        </th>
                        <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv('teamName')}>
                          <div className="flex items-center gap-1">Team {sortIndiv.key === 'teamName' && (sortIndiv.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                        </th>
                        <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                        <ThIndiv label="Comp" sortKey="passComp" className="text-blue-400" />
                        <ThIndiv label="Comp %" sortKey="compPct" />
                        <ThIndiv label="Pass TD" sortKey="passTD" className="text-emerald-400" />
                        <ThIndiv label="INT" sortKey="passInt" className="text-red-400" />
                        <ThIndiv label="PAT Conv" sortKey="convPass" className="text-purple-400" />
                      </tr>
                    )}
                    {individualTab === "receiving" && (
                      <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Rank</th>
                        <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv('name')}>
                          <div className="flex items-center gap-1">Player {sortIndiv.key === 'name' && (sortIndiv.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                        </th>
                        <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv('teamName')}>
                          <div className="flex items-center gap-1">Team {sortIndiv.key === 'teamName' && (sortIndiv.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                        </th>
                        <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                        <ThIndiv label="Receptions" sortKey="receptions" className="text-blue-400" />
                        <ThIndiv label="Rec TD" sortKey="recTD" className="text-emerald-400" />
                        <ThIndiv label="Rush Att" sortKey="rushAtt" className="text-amber-400" />
                        <ThIndiv label="Rush TD" sortKey="rushTD" className="text-emerald-400" />
                        <ThIndiv label="PAT Conv" sortKey="convRec" className="text-purple-400" />
                      </tr>
                    )}
                    {individualTab === "defense" && (
                      <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Rank</th>
                        <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv('name')}>
                          <div className="flex items-center gap-1">Player {sortIndiv.key === 'name' && (sortIndiv.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                        </th>
                        <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv('teamName')}>
                          <div className="flex items-center gap-1">Team {sortIndiv.key === 'teamName' && (sortIndiv.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                        </th>
                        <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                        <ThIndiv label="Flag Pulls" sortKey="flagPulls" className="text-amber-400" />
                        <ThIndiv label="INT" sortKey="int" className="text-blue-400" />
                        <ThIndiv label="Def TD" sortKey="defTD" className="text-emerald-400" />
                        <ThIndiv label="Sacks" sortKey="sacks" className="text-red-400" />
                        <ThIndiv label="FFL" sortKey="ffl" className="text-orange-400" />
                        <ThIndiv label="PBU" sortKey="pbu" className="text-neutral-400" />
                        <ThIndiv label="Safeties" sortKey="safeties" className="text-red-600" />
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedIndividualStats.map((row, index) => (
                      <tr key={row.name} className="hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-6">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-neutral-400'}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-lg">{row.name}</td>
                        <td className="py-4 px-6 text-neutral-400">{row.teamName}</td>
                        <td className="py-4 px-6 text-center text-neutral-300 font-medium">{row.gamesPlayed}</td>
                        
                        {individualTab === "passing" && (
                          <>
                            <td className="py-4 px-6 text-center font-medium text-blue-200">{row.passComp} / {row.passAtt}</td>
                            <td className="py-4 px-6 text-center font-medium text-neutral-300">{row.passAtt > 0 ? Math.round((row.passComp / row.passAtt) * 100) : 0}%</td>
                            <td className="py-4 px-6 text-center font-black text-emerald-400 text-lg">{row.passTD}</td>
                            <td className="py-4 px-6 text-center font-medium text-red-400">{row.passInt}</td>
                            <td className="py-4 px-6 text-center font-medium text-purple-400">{row.convPass}</td>
                          </>
                        )}
                        
                        {individualTab === "receiving" && (
                          <>
                            <td className="py-4 px-6 text-center font-black text-blue-400 text-lg">{row.receptions}</td>
                            <td className="py-4 px-6 text-center font-bold text-emerald-400">{row.recTD}</td>
                            <td className="py-4 px-6 text-center font-medium text-amber-400">{row.rushAtt}</td>
                            <td className="py-4 px-6 text-center font-medium text-emerald-400">{row.rushTD}</td>
                            <td className="py-4 px-6 text-center font-medium text-purple-400">{row.convRec}</td>
                          </>
                        )}

                        {individualTab === "defense" && (
                          <>
                            <td className="py-4 px-6 text-center font-black text-amber-400 text-lg">{row.flagPulls}</td>
                            <td className="py-4 px-6 text-center font-bold text-blue-400">{row.int}</td>
                            <td className="py-4 px-6 text-center font-bold text-emerald-400">{row.defTD}</td>
                            <td className="py-4 px-6 text-center font-medium text-red-400">{row.sacks}</td>
                            <td className="py-4 px-6 text-center font-medium text-orange-400">{row.ffl}</td>
                            <td className="py-4 px-6 text-center font-medium text-neutral-400">{row.pbu}</td>
                            <td className="py-4 px-6 text-center font-medium text-red-600">{row.safeties}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {sortedIndividualStats.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-neutral-500">No players found with these stats yet.</td>
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
