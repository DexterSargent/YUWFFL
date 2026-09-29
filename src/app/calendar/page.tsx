"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar as CalendarIcon, Clock, MapPin, Database } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

interface Match {
  id: string;
  week: string;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  time: string;
  location: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  matchdayIndex: number;
}

export default function Calendar() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "matches"));
      const mData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
      
      // Sort chronologically (by matchdayIndex and then time)
      mData.sort((a, b) => {
        if (a.matchdayIndex !== b.matchdayIndex) return a.matchdayIndex - b.matchdayIndex;
        return a.time.localeCompare(b.time);
      });
      
      setMatches(mData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

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
          
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {matches.map((match) => (
              <Link 
                href={`/matches/${match.id}`} 
                key={match.id}
                className={`group bg-neutral-900/50 border border-white/5 rounded-3xl p-6 hover:bg-neutral-900 transition-all duration-300 relative overflow-hidden ${
                  match.matchdayIndex >= 10 ? 'border-amber-500/20 hover:border-amber-500/50' : 'hover:border-[#E31837]/30'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${
                  match.matchdayIndex >= 10 ? 'from-amber-500/5' : 'from-[#E31837]/5'
                } to-transparent`}></div>
                
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <span className={`text-xs font-bold tracking-widest uppercase ${match.matchdayIndex >= 10 ? 'text-amber-500' : 'text-[#E31837]'}`}>
                    {match.week}
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
            ))}
            
            {matches.length === 0 && (
              <div className="col-span-1 lg:col-span-2 py-24 text-center text-neutral-500 italic">
                No matches found in the schedule.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
