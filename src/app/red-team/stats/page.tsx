"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Trophy, Crosshair, Shield } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { TeamLogo, getTeamColor } from "@/components/TeamAssets";

export default function RedTeamStatLeaders() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [playersSnap, matchesSnap, playsSnap] = await Promise.all([
          getDocs(collection(db, "red_players")),
          getDocs(collection(db, "red_matches")),
          getDocs(collection(db, "red_plays")),
        ]);

        const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        const plays = playsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        const statsMap: Record<string, any> = {};
        players.forEach(p => {
          statsMap[p.playerName] = {
            name: p.playerName,
            number: p.number,
            gamesPlayed: 0,
            passComp: 0,
            passTD: 0,
            receptions: 0,
            recTD: 0,
            rushAtt: 0,
            rushTD: 0,
            flagPulls: 0,
            sacks: 0,
            int: 0,
            pbu: 0,
            totalTDs: 0
          };
        });

        // Games Played
        matches.forEach(m => {
          if (m.status === 'Final' || m.status === 'completed') {
            const dnp = m.didNotPlay || [];
            players.forEach(p => {
              if (statsMap[p.playerName] && !dnp.includes(p.playerName)) {
                statsMap[p.playerName].gamesPlayed += 1;
              }
            });
          }
        });

        plays.forEach(play => {
          const isEligible = (name: string) => name && statsMap[name];

          // Passing
          if (play.playType === 'Pass' && isEligible(play.qbPlayerId)) {
            if (play.passOutcome === 'Complete') {
              statsMap[play.qbPlayerId].passComp += 1;
            }
            if (play.isTouchdown) {
              statsMap[play.qbPlayerId].passTD += 1;
              statsMap[play.qbPlayerId].totalTDs += 1;
            }
          }

          // Receiving
          if (play.playType === 'Pass' && play.passOutcome === 'Complete' && isEligible(play.receiverPlayerId)) {
            statsMap[play.receiverPlayerId].receptions += 1;
            if (play.isTouchdown) {
              statsMap[play.receiverPlayerId].recTD += 1;
              statsMap[play.receiverPlayerId].totalTDs += 1;
            }
          }

          // Rushing
          if (play.playType === 'Run' && isEligible(play.runnerPlayerId)) {
            statsMap[play.runnerPlayerId].rushAtt += 1;
            if (play.isTouchdown) {
              statsMap[play.runnerPlayerId].rushTD += 1;
              statsMap[play.runnerPlayerId].totalTDs += 1;
            }
          }

          // Defense
          if (play.defenders && Array.isArray(play.defenders)) {
            play.defenders.forEach((defenderName: string) => {
              if (!isEligible(defenderName)) return;
              
              if (play.passOutcome === 'Interception') {
                statsMap[defenderName].int += 1;
              } else if (play.passOutcome === 'PBU') {
                statsMap[defenderName].pbu += 1;
              } else if (play.passOutcome === 'Sack') {
                statsMap[defenderName].sacks += 1;
                statsMap[defenderName].flagPulls += 1; 
              } else if (play.passOutcome === 'FFL') {
                statsMap[defenderName].flagPulls += 1;
              } else {
                statsMap[defenderName].flagPulls += 1;
              }
            });
          }

          // Flaggers (offense tackling interceptor)
          if (play.passOutcome === 'Interception' && play.flaggers && Array.isArray(play.flaggers)) {
            play.flaggers.forEach((flaggerName: string) => {
              if (isEligible(flaggerName)) {
                statsMap[flaggerName].flagPulls += 1; 
              }
            });
          }
        });

        setStats(Object.values(statsMap));
      } catch (error) {
        console.error("Error fetching red team stats:", error);
      }
      setLoading(false);
    };

    fetchAllData();
  }, []);

  const getTop3 = (key: string) => {
    const sorted = [...stats].sort((a, b) => b[key] - a[key]).filter(p => p[key] > 0);
    return sorted.slice(0, 3);
  };

  const statCategories = [
    { title: "Total Touchdowns", key: "totalTDs", icon: Trophy, color: "text-yellow-500" },
    { title: "Passing TDs", key: "passTD", icon: Crosshair, color: "text-[#E31837]" },
    { title: "Completions", key: "passComp", icon: Crosshair, color: "text-[#E31837]" },
    { title: "Receptions", key: "receptions", icon: Activity, color: "text-blue-400" },
    { title: "Receiving TDs", key: "recTD", icon: Activity, color: "text-blue-400" },
    { title: "Rushing TDs", key: "rushTD", icon: Activity, color: "text-emerald-400" },
    { title: "Flag Pulls", key: "flagPulls", icon: Shield, color: "text-neutral-400" },
    { title: "Sacks", key: "sacks", icon: Shield, color: "text-orange-500" },
    { title: "Interceptions", key: "int", icon: Shield, color: "text-purple-500" },
    { title: "Pass Breakups", key: "pbu", icon: Shield, color: "text-cyan-400" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-[#E31837]/40">
      <Link href="/red-team" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-8 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Red Team Portal
      </Link>

      <div className="max-w-6xl mx-auto space-y-8 mb-16">
        <div className="flex flex-col items-center text-center gap-4 mb-12">

          <h1 className="text-5xl font-black uppercase tracking-tighter text-[#E31837]">
            Stat Leaders
          </h1>
          <p className="text-xl text-neutral-400 font-light">Top Performers of the York Lions Red Team</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCategories.map((cat, idx) => {
            const top3 = getTop3(cat.key);
            
            return (
              <div key={idx} className="bg-neutral-900 border border-white/5 rounded-3xl p-6 flex flex-col hover:border-white/10 transition-colors shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                  <div className={`p-2 bg-white/5 rounded-lg ${cat.color}`}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-white">{cat.title}</h3>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  {top3.length > 0 ? (
                    top3.map((player, rank) => (
                      <div key={player.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 text-center font-black ${rank === 0 ? 'text-[#E31837] text-lg' : 'text-neutral-500'}`}>
                            #{rank + 1}
                          </span>
                          <span className="font-bold text-neutral-300 group-hover:text-white transition-colors">
                            {player.name} <span className="text-neutral-600 font-normal ml-1">#{player.number || "-"}</span>
                          </span>
                        </div>
                        <span className={`font-black text-2xl tabular-nums ${rank === 0 ? 'text-white' : 'text-neutral-400'}`}>
                          {player[cat.key]}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-500 font-bold uppercase tracking-widest text-sm text-center py-4">No data yet</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
