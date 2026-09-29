"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { Check, Search, Shield, UserPlus, ArrowRight } from "lucide-react";

interface Player {
  id: string;
  playerName: string;
  teamId: string;
}

export default function JoinLeague() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [experience, setExperience] = useState("Beginner");
  const [willingToPlayQB, setWillingToPlayQB] = useState(false);
  
  // Teammate Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Player[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const snap = await getDocs(collection(db, "players"));
        const pData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
        // Sort alphabetically and exclude current free agents from the search list
        const filtered = pData.filter(p => p.teamId !== "Free Agent");
        filtered.sort((a, b) => a.playerName.localeCompare(b.playerName));
        setPlayers(filtered);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchPlayers();
  }, []);

  const handleToggleFriend = (player: Player) => {
    if (selectedFriends.find(p => p.id === player.id)) {
      setSelectedFriends(selectedFriends.filter(p => p.id !== player.id));
    } else {
      if (selectedFriends.length < 5) {
        setSelectedFriends([...selectedFriends, player]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      // Find or create "Free Agent" team
      const teamsSnap = await getDocs(query(collection(db, "teams"), where("name", "==", "Free Agent")));
      let freeAgentTeamId = "";
      
      if (teamsSnap.empty) {
        const newTeamRef = await addDoc(collection(db, "teams"), { name: "Free Agent" });
        freeAgentTeamId = newTeamRef.id;
      } else {
        freeAgentTeamId = teamsSnap.docs[0].id;
      }

      // Add the player
      await addDoc(collection(db, "players"), {
        playerName: name.trim(),
        teamId: freeAgentTeamId,
        email: email.trim(),
        experience,
        preferredTeammates: selectedFriends.map(f => f.id),
        preferredTeammateNames: selectedFriends.map(f => f.playerName),
        willingToPlayQB,
        status: "Free Agent",
        joinedAt: new Date().toISOString()
      });

      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const filteredPlayers = players.filter(p => p.playerName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#E31837]/40 flex flex-col items-center justify-center p-6 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-[#E31837] rounded-full mix-blend-screen filter blur-[200px] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        <div className="bg-[#E31837]/10 border-b border-white/5 p-8 flex items-center justify-center flex-col text-center">
          <div className="w-16 h-16 bg-[#E31837] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 mb-6">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-white">Join the League</h1>
          <p className="text-neutral-400 mt-2">Fill out the form below to enter the Free Agent pool.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Full Name</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-lg font-semibold focus:outline-none focus:border-[#E31837] transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-[#E31837] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Experience Level</label>
                <select 
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-[#E31837] transition-colors appearance-none"
                >
                  <option>Beginner (0-1 years)</option>
                  <option>Intermediate (2-4 years)</option>
                  <option>Advanced (5+ years)</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <input 
                type="checkbox" 
                id="qb" 
                checked={willingToPlayQB}
                onChange={(e) => setWillingToPlayQB(e.target.checked)}
                className="w-5 h-5 accent-[#E31837]"
              />
              <label htmlFor="qb" className="text-sm font-semibold text-neutral-300">I would be willing to try playing Quarterback</label>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Preferred Teammates</label>
              <span className="text-xs font-bold text-[#E31837] bg-[#E31837]/10 px-3 py-1 rounded-full">
                {selectedFriends.length} / 5 Selected
              </span>
            </div>
            <p className="text-sm text-neutral-500 mb-4">Select up to 5 current players in the league you would like to play with.</p>
            
            <div className="bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col h-72">
              <div className="flex items-center px-4 border-b border-white/10 bg-neutral-900/50">
                <Search className="w-5 h-5 text-neutral-500" />
                <input 
                  type="text" 
                  placeholder="Search for players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none px-4 py-4 text-sm focus:outline-none text-white"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-neutral-500 text-sm">Loading players...</div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-neutral-500 text-sm">No players found.</div>
                ) : (
                  filteredPlayers.map(player => {
                    const isSelected = selectedFriends.find(p => p.id === player.id);
                    const isDisabled = !isSelected && selectedFriends.length >= 5;
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handleToggleFriend(player)}
                        disabled={isDisabled}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                          isSelected 
                            ? "bg-[#E31837] text-white" 
                            : isDisabled 
                              ? "opacity-40 cursor-not-allowed text-neutral-500" 
                              : "hover:bg-white/5 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-white/5'}`}>
                            <Shield className="w-4 h-4" />
                          </div>
                          <span className="font-semibold">{player.playerName}</span>
                        </div>
                        {isSelected && <Check className="w-5 h-5" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button 
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-[#E31837] hover:bg-red-700 text-white font-black text-xl uppercase tracking-wider transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {submitting ? "Submitting..." : "Submit Registration"}
              {!submitting && <ArrowRight className="w-6 h-6" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
