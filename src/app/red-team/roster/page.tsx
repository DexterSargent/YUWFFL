"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, User, UserPlus, Star } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { doc, updateDoc } from "firebase/firestore";

export default function RedTeamRoster() {
  const [players, setPlayers] = useState<any[]>([]);
  const { user, isAdmin } = useAuth();
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const [teamStats, setTeamStats] = useState({
    thirdDowns: { att: 0, conv: 0 },
    fourthDowns: { att: 0, conv: 0 },
    totalTDs: 0,
    sacks: 0,
    ints: 0,
    safeties: 0,
    gamesPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    firstDowns: 0
  });

  async function loadPlayers() {
    const q = query(collection(db, "red_players"), orderBy("playerName"));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setPlayers(data);

    try {
      const playsSnap = await getDocs(collection(db, "red_plays"));
      const plays = playsSnap.docs.map(d => d.data() as any);
      
      const matchesSnap = await getDocs(collection(db, "red_matches"));
      const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      let thirdAtt = 0, thirdConv = 0, fourthAtt = 0, fourthConv = 0;
      let totalTDs = 0, sacks = 0, ints = 0, safeties = 0, firstDowns = 0;
      let gamesPlayed = 0, pointsFor = 0, pointsAgainst = 0;

      matches.forEach(m => {
        if (m.status === 'Final' || m.status === 'completed') {
          gamesPlayed++;
          pointsFor += (m.homeScore || 0);
          pointsAgainst += (m.awayScore || 0);
        }
      });

      plays.forEach(play => {
        const match = matches.find(m => m.id === play.matchId);
        if (!match) return;
        const isOffense = play.possessionTeamId === match.homeTeamId;

        if (isOffense) {
          if (play.firstDown || play.isTouchdown) firstDowns++;
          if (play.down === 3) {
            thirdAtt++;
            if (play.firstDown || play.isTouchdown) thirdConv++;
          }
          if (play.down === 4) {
            fourthAtt++;
            if (play.firstDown || play.isTouchdown) fourthConv++;
          }
          if (play.isTouchdown) totalTDs++;
        } else {
          if (play.isPick6) totalTDs++;
          if (play.passOutcome === 'Interception') ints++;
          if (play.passOutcome === 'Sack') sacks++;
          if (play.isSafety) safeties++;
        }
      });

      setTeamStats({
        thirdDowns: { att: thirdAtt, conv: thirdConv },
        fourthDowns: { att: fourthAtt, conv: fourthConv },
        totalTDs,
        sacks,
        ints,
        safeties,
        gamesPlayed,
        pointsFor,
        pointsAgainst,
        firstDowns
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayerName) return;
    
    setIsAdding(true);
    await addDoc(collection(db, "red_players"), {
      playerName: newPlayerName,
      number: newPlayerNumber || "",
      teamId: "York Lions"
    });
    
    setNewPlayerName("");
    setNewPlayerNumber("");
    setIsAdding(false);
    loadPlayers();
  }

  async function toggleReserve(playerId: string, currentStatus: boolean) {
    if (!currentStatus) {
      const currentReservesCount = players.filter(p => p.isReserve).length;
      if (currentReservesCount >= 5) {
        alert("You can only set up to 5 reserves.");
        return;
      }
    }
    
    await updateDoc(doc(db, "red_players", playerId), {
      isReserve: !currentStatus
    });
    
    setPlayers(players.map(p => p.id === playerId ? { ...p, isReserve: !currentStatus } : p));
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-[#E31837]/40">
      <Link href="/red-team" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-8 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Red Team Portal
      </Link>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-5xl font-black uppercase tracking-tighter text-[#E31837]">
            Red Team

          </h1>
          <p className="text-xl text-neutral-400 font-light">Official York Lions Competitive Travel Team</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">PPG</div>
            <div className="text-3xl font-black text-white">{teamStats.gamesPlayed > 0 ? (teamStats.pointsFor / teamStats.gamesPlayed).toFixed(1) : "0.0"}</div>
          </div>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">PA/G</div>
            <div className="text-3xl font-black text-neutral-400">{teamStats.gamesPlayed > 0 ? (teamStats.pointsAgainst / teamStats.gamesPlayed).toFixed(1) : "0.0"}</div>
          </div>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">1st Downs / G</div>
            <div className="text-3xl font-black text-emerald-400">{teamStats.gamesPlayed > 0 ? (teamStats.firstDowns / teamStats.gamesPlayed).toFixed(1) : "0.0"}</div>
          </div>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">Total TDs</div>
            <div className="text-3xl font-black text-[#E31837]">{teamStats.totalTDs}</div>
          </div>
          
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">3rd Down %</div>
            <div className="text-3xl font-black text-white">{teamStats.thirdDowns.att > 0 ? Math.round((teamStats.thirdDowns.conv / teamStats.thirdDowns.att) * 100) : 0}%</div>
            <div className="text-xs text-neutral-600 mt-1">{teamStats.thirdDowns.conv} / {teamStats.thirdDowns.att}</div>
          </div>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">4th Down %</div>
            <div className="text-3xl font-black text-white">{teamStats.fourthDowns.att > 0 ? Math.round((teamStats.fourthDowns.conv / teamStats.fourthDowns.att) * 100) : 0}%</div>
            <div className="text-xs text-neutral-600 mt-1">{teamStats.fourthDowns.conv} / {teamStats.fourthDowns.att}</div>
          </div>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">Turnovers Forced</div>
            <div className="text-3xl font-black text-blue-400">{teamStats.ints}</div>
          </div>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">Sacks</div>
            <div className="text-3xl font-black text-orange-500">{teamStats.sacks}</div>
          </div>
        </div>

        {user && (
          <form onSubmit={handleAddPlayer} className="bg-neutral-900 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2">Player Name</label>
              <input 
                type="text" 
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E31837] transition-colors"
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2">Number</label>
              <input 
                type="text" 
                value={newPlayerNumber}
                onChange={(e) => setNewPlayerNumber(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E31837] transition-colors"
                placeholder="e.g. 10"
              />
            </div>
            <button 
              type="submit" 
              disabled={isAdding || !newPlayerName}
              className="w-full md:w-auto px-8 py-3 bg-[#E31837] hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 h-[50px]"
            >
              <UserPlus className="w-5 h-5" />
              Add Player
            </button>
          </form>
        )}

        <div className="bg-neutral-900 border border-white/5 rounded-3xl overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-sm uppercase tracking-widest text-neutral-400 border-b border-white/5">
                <th className="p-6 font-bold w-24 text-center">#</th>
                <th className="p-6 font-bold flex-1">Player Name</th>
                {isAdmin && <th className="p-6 font-bold w-32 text-center">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {players.map((player) => (
                <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6 text-center font-black text-2xl text-neutral-500 group-hover:text-white transition-colors">{player.number || "-"}</td>
                  <td className="p-6 font-bold text-lg flex flex-1 items-center gap-4">
                    <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center border border-white/10">
                      <User className="w-5 h-5 text-neutral-400" />
                    </div>
                    {player.playerName}
                    {isAdmin && player.isReserve && <Star className="w-4 h-4 text-amber-500 fill-amber-500" title="Reserve" />}
                  </td>
                  {isAdmin && (
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => toggleReserve(player.id, player.isReserve)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-colors ${player.isReserve ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                      >
                        {player.isReserve ? 'Reserve' : 'Active'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-12 text-center text-neutral-500 font-bold uppercase tracking-widest">
                    No players on the team yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
