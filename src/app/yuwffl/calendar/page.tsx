"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar as CalendarIcon, Clock, MapPin, Database, Plus, Edit2, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";

interface Match {
  id: string;
  week: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: string;
  awayTeamId?: string;
  date: string;
  time: string;
  location: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  matchdayIndex: number;
  isPreseason?: boolean;
}

export default function Calendar() {
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "matches"));
      const mData = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Match))
        .filter(m => !(m as any).isHidden);
      
      // Sort chronologically (by matchdayIndex and then time)
      mData.sort((a, b) => {
        if (a.matchdayIndex !== b.matchdayIndex) return a.matchdayIndex - b.matchdayIndex;
        return a.time.localeCompare(b.time);
      });
      setMatches(mData);

      const teamsSnap = await getDocs(collection(db, "teams"));
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    const homeT = teams.find(t => t.id === editingMatch.homeTeamId);
    const awayT = teams.find(t => t.id === editingMatch.awayTeamId);

    const matchDataToSave = {
      ...editingMatch,
      homeTeamName: homeT?.name || "",
      awayTeamName: awayT?.name || "",
      matchdayIndex: parseInt(editingMatch.week?.replace(/\D/g,'') || "0", 10),
      status: editingMatch.status || "upcoming"
    };

    try {
      if (editingMatch.id) {
        await updateDoc(doc(db, "matches", editingMatch.id), matchDataToSave);
      } else {
        await addDoc(collection(db, "matches"), matchDataToSave);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#E31837]/40 p-6 md:p-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-[#E31837] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <Link href="/" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-4">
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-4xl font-extrabold flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-[#E31837]" />
              League Calendar
            </h1>
            <p className="text-neutral-400 mt-2">Upcoming matchups and past results.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingMatch({ week: "", date: "", time: "", location: "", isPreseason: false });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#E31837] hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-900/20"
            >
              <Plus className="w-5 h-5" />
              Create Match
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Preseason Section */}
            {matches.filter(m => m.isPreseason).length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-amber-500 border-b border-amber-500/20 pb-2">Pre-season</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {matches.filter(m => m.isPreseason).map((match) => (
                    <div key={match.id} className="relative group">
                      <Link 
                        href={`/matches/${match.id}`} 
                        className="block bg-neutral-900/50 border border-white/5 rounded-3xl p-6 hover:bg-neutral-900 transition-all duration-300 relative overflow-hidden border-amber-500/20 hover:border-amber-500/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-amber-500/5 to-transparent"></div>
                        
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                          <span className="text-xs font-bold tracking-widest uppercase text-amber-500">
                            Week {match.week}
                          </span>
                          {match.status === "completed" ? (
                            <span className="text-xs font-semibold px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full">Final</span>
                          ) : (
                            <span className="text-xs font-semibold px-3 py-1 bg-[#E31837]/20 text-[#E31837] rounded-full border border-[#E31837]/20">Upcoming</span>
                          )}
                        </div>

                        <div className="flex justify-between items-center px-4">
                          <div className="text-center w-[40%]">
                            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-[#E31837] transition-colors">{match.homeTeamName}</h3>
                            {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.homeScore}</span>}
                          </div>
                          
                          <div className="text-neutral-500 font-light text-sm italic w-[20%] text-center">
                            VS
                          </div>

                          <div className="text-center w-[40%]">
                            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-[#E31837] transition-colors">{match.awayTeamName}</h3>
                            {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.awayScore}</span>}
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-2 text-sm text-neutral-400">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neutral-500" />
                            {match.date} • {match.time}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-neutral-500" />
                            {match.location}
                          </div>
                        </div>
                      </Link>
                      {isAdmin && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingMatch(match);
                            setIsModalOpen(true);
                          }}
                          className="absolute top-6 right-6 p-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors z-20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Season Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-2">Regular Season</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.filter(m => !m.isPreseason).map((match) => (
                  <div key={match.id} className="relative group">
                    <Link 
                      href={`/matches/${match.id}`} 
                      className="block bg-neutral-900/50 border border-white/5 rounded-3xl p-6 hover:bg-neutral-900 transition-all duration-300 relative overflow-hidden hover:border-[#E31837]/30"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-[#E31837]/5 to-transparent"></div>
                      
                      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <span className="text-xs font-bold tracking-widest uppercase text-[#E31837]">
                          {match.week === 'Playoffs' ? 'Playoffs' : `Week ${match.week}`}
                        </span>
                        {match.status === "completed" ? (
                          <span className="text-xs font-semibold px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full">Final</span>
                        ) : (
                          <span className="text-xs font-semibold px-3 py-1 bg-[#E31837]/20 text-[#E31837] rounded-full border border-[#E31837]/20">Upcoming</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center px-4">
                        <div className="text-center w-[40%]">
                          <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-[#E31837] transition-colors">{match.homeTeamName}</h3>
                          {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.homeScore}</span>}
                        </div>
                        
                        <div className="text-neutral-500 font-light text-sm italic w-[20%] text-center">
                          VS
                        </div>

                        <div className="text-center w-[40%]">
                          <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-[#E31837] transition-colors">{match.awayTeamName}</h3>
                          {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.awayScore}</span>}
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-2 text-sm text-neutral-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-neutral-500" />
                          {match.date} • {match.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-neutral-500" />
                          {match.location}
                        </div>
                      </div>
                    </Link>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingMatch(match);
                          setIsModalOpen(true);
                        }}
                        className="absolute top-6 right-6 p-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors z-20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                {matches.filter(m => !m.isPreseason).length === 0 && (
                  <div className="col-span-1 lg:col-span-2 py-24 text-center text-neutral-500 italic">
                    No regular season matches scheduled yet.
                  </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>

      {/* Admin Modal */}
      {isModalOpen && editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingMatch.id ? "Edit Match" : "Create Match"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-400 mb-1">Week Title</label>
                <input 
                  type="text"
                  required
                  value={editingMatch.week || ""}
                  onChange={e => setEditingMatch({...editingMatch, week: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#E31837] text-white"
                  placeholder="e.g. 'Week 1'"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Home Team</label>
                  <select 
                    required
                    value={editingMatch.homeTeamId || ""}
                    onChange={e => setEditingMatch({...editingMatch, homeTeamId: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#E31837] text-white"
                  >
                    <option value="" disabled>Select Home</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Away Team</label>
                  <select 
                    required
                    value={editingMatch.awayTeamId || ""}
                    onChange={e => setEditingMatch({...editingMatch, awayTeamId: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#E31837] text-white"
                  >
                    <option value="" disabled>Select Away</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Date</label>
                  <input 
                    type="text"
                    required
                    value={editingMatch.date || ""}
                    onChange={e => setEditingMatch({...editingMatch, date: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#E31837] text-white"
                    placeholder="e.g. 'Oct 15'"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Time</label>
                  <input 
                    type="text"
                    required
                    value={editingMatch.time || ""}
                    onChange={e => setEditingMatch({...editingMatch, time: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#E31837] text-white"
                    placeholder="e.g. '8:30 PM'"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-400 mb-1">Location</label>
                <input 
                  type="text"
                  required
                  value={editingMatch.location || ""}
                  onChange={e => setEditingMatch({...editingMatch, location: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#E31837] text-white"
                  placeholder="e.g. 'Field 1'"
                />
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                <input 
                  type="checkbox"
                  id="preseasonCheck"
                  checked={editingMatch.isPreseason || false}
                  onChange={e => setEditingMatch({...editingMatch, isPreseason: e.target.checked})}
                  className="w-5 h-5 accent-amber-500 rounded bg-black border-white/20"
                />
                <label htmlFor="preseasonCheck" className="text-white font-semibold cursor-pointer">
                  Mark as Preseason Game
                </label>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 font-semibold text-neutral-400 hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-[#E31837] hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-900/50">
                  {editingMatch.id ? "Save Changes" : "Create Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
