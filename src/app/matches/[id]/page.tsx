"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldAlert, Clock, MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";

export default function MatchDetails({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;

  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const docSnap = await getDoc(doc(db, "matches", matchId));
        if (docSnap.exists()) {
          setMatchData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching match:", error);
      }
      setLoading(false);
    };
    fetchMatch();
  }, [matchId]);

  const { isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Match Not Found</h2>
          <Link href="/calendar" className="text-[#E31837] hover:underline">Return to Calendar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#E31837]/40 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <Link href="/calendar" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Calendar
        </Link>

        {/* Match Header */}
        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-[#E31837] to-fuchsia-600"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <span className="text-xs font-bold tracking-widest text-[#E31837] uppercase">Week {matchData.week}</span>
              <h1 className="text-3xl md:text-4xl font-bold mt-2">{matchData.homeTeamName} vs. {matchData.awayTeamName}</h1>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Clock className="w-4 h-4" />
                  <span>{matchData.date} • {matchData.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <MapPin className="w-4 h-4" />
                  <span>{matchData.location}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8 bg-black/50 px-8 py-4 rounded-2xl border border-white/5">
              <div className="text-center w-24">
                <span className="text-sm text-neutral-400 block mb-1 truncate">{matchData.homeTeamName}</span>
                <span className="text-4xl font-bold">{matchData.homeScore || 0}</span>
              </div>
              <span className="text-neutral-600 font-light text-2xl">-</span>
              <div className="text-center w-24">
                <span className="text-sm text-neutral-400 block mb-1 truncate">{matchData.awayTeamName}</span>
                <span className="text-4xl font-bold">{matchData.awayScore || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin ? (
          <div className="bg-red-950/20 border border-[#E31837]/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-[#E31837] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg text-white">Admin Controls</h3>
                <p className="text-sm text-neutral-400">You have access to manage this game because you are an admin.</p>
              </div>
            </div>
            <Link 
              href={`/matches/${matchId}/play-by-play`}
              className="px-6 py-3 bg-[#E31837] hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-900/50 transition-all active:scale-95 whitespace-nowrap"
            >
              Play-by-Play Manager
            </Link>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg text-white">Live Play-by-Play</h3>
              <p className="text-sm text-neutral-400">Follow the game action in real-time.</p>
            </div>
            <Link 
              href={`/matches/${matchId}/play-by-play`}
              className="px-6 py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
              Watch Live
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
