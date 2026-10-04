"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, CalendarDays, Plus, Edit2, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { OUA_TEAMS } from "@/components/TeamAssets";

export default function RedTeamSchedule() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    awayTeamId: "",
    date: "",
    time: "",
    location: "Millenium Sports Park (Ottawa)"
  });

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);
    const q = query(collection(db, "red_matches"), orderBy("time"));
    const snap = await getDocs(q);
    
    snap.docs.forEach(async (d) => {
      const data = d.data();
      if (data.awayTeamId === "McMaster Marauders" && data.status === "Final") {
        await updateDoc(doc(db, "red_matches", d.id), { status: "Scheduled" });
      }
    });

    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .map(d => {
        if (d.awayTeamId === "McMaster Marauders" && d.status === "Final") return { ...d, status: "Scheduled" };
        return d;
      })
      .filter((d: any) => !d.isHidden); // hide matches marked as isHidden
    setMatches(data);
    setLoading(false);
  }

  const handleOpenAdd = () => {
    setFormData({
      awayTeamId: "",
      date: new Date().toISOString().split('T')[0],
      time: "10:00 AM",
      location: "Millenium Sports Park (Ottawa)"
    });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, match: any) => {
    e.preventDefault();
    setFormData({
      awayTeamId: match.awayTeamId,
      date: match.date,
      time: match.time,
      location: match.location
    });
    setEditingId(match.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this match?")) {
      await deleteDoc(doc(db, "red_matches", id));
      loadMatches();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.awayTeamId) return;

    if (editingId) {
      await updateDoc(doc(db, "red_matches", editingId), {
        ...formData
      });
    } else {
      await addDoc(collection(db, "red_matches"), {
        ...formData,
        homeTeamId: "York Lions",
        homeTeamName: "York Lions",
        awayTeamName: formData.awayTeamId,
        status: "Scheduled",
        homeScore: 0,
        awayScore: 0,
        createdAt: serverTimestamp()
      });
    }
    
    setIsFormOpen(false);
    loadMatches();
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-[#E31837]/40 relative">
      <Link href="/red-team" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-8 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Red Team Portal
      </Link>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col items-start gap-2">
            <h1 className="text-5xl font-black uppercase tracking-tighter text-[#E31837]">
              Red Team Schedule
            </h1>
            <p className="text-xl text-neutral-400 font-light">Competitive Travel Team Matchups</p>
          </div>
          {isAdmin && (
            <button onClick={handleOpenAdd} className="bg-[#E31837] hover:bg-red-700 text-white font-bold px-6 py-3 rounded-full flex items-center gap-2 transition-transform active:scale-95 shadow-lg">
              <Plus className="w-5 h-5" /> Add Match
            </button>
          )}
        </div>

        {isFormOpen && isAdmin && (
          <form onSubmit={handleSave} className="bg-neutral-900 border border-white/10 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
            <div className="col-span-1 md:col-span-2 flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-widest">{editingId ? 'Edit Match' : 'Add New Match'}</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Opponent Name</label>
              <select required value={formData.awayTeamId} onChange={e => setFormData({...formData, awayTeamId: e.target.value})} className="bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#E31837] outline-none transition-colors appearance-none">
                <option value="" disabled>Select OUA Team</option>
                {OUA_TEAMS.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Location</label>
              <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} type="text" className="bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#E31837] outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Date</label>
              <input required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} type="date" className="bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#E31837] outline-none transition-colors" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Time</label>
              <input required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} type="text" placeholder="e.g. 10:00 AM" className="bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#E31837] outline-none transition-colors" />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 font-bold text-neutral-400 hover:text-white">Cancel</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-xl shadow-lg transition-transform active:scale-95">Save Match</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4">
          {matches.map((match) => (
            <div key={match.id} className="relative group">
              <Link href={`/red-team/matches/${match.id}`} className="flex flex-col md:flex-row bg-neutral-900 border border-white/5 rounded-3xl p-6 md:p-8 hover:border-[#E31837]/50 transition-all hover:-translate-y-1 shadow-lg h-full">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-4 text-sm text-neutral-400 mb-4 uppercase font-bold tracking-widest">
                    <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4"/> {match.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {match.time}</span>
                    <span className="flex items-center gap-1 text-emerald-400"><MapPin className="w-4 h-4"/> {match.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-black">York Lions</span>
                    <span className="text-2xl font-bold text-neutral-600 px-4">VS</span>
                    <span className="text-4xl font-black text-neutral-300">{match.awayTeamId}</span>
                  </div>
                </div>

                <div className="mt-6 md:mt-0 md:ml-8 flex flex-col justify-center items-end border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                  <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-2">Final Score</div>
                  <div className="flex items-center gap-4 text-4xl font-black tabular-nums">
                    <span className={match.homeScore > match.awayScore ? "text-[#E31837]" : "text-white"}>{match.homeScore}</span>
                    <span className="text-neutral-600">-</span>
                    <span className={match.awayScore > match.homeScore ? "text-blue-400" : "text-white"}>{match.awayScore}</span>
                  </div>
                  {match.status === "Final" && <span className="mt-2 text-xs font-black uppercase bg-neutral-800 px-2 py-1 rounded-md">Final</span>}
                </div>
              </Link>

              {isAdmin && (
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => handleOpenEdit(e, match)} className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full shadow-lg transition-transform hover:scale-110" title="Edit Match">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDelete(e, match.id)} className="p-2 bg-red-900/50 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-110" title="Delete Match">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!loading && matches.length === 0 && (
            <div className="text-center py-20 bg-neutral-900 border border-white/5 rounded-3xl">
              <span className="text-neutral-500 font-bold uppercase tracking-widest">No matches scheduled</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
