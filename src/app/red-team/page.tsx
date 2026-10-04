import Link from "next/link";
import { Shield, CalendarDays, Users, Activity, Home, Settings } from "lucide-react";

export default function RedTeamHome() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#E31837]/40 overflow-hidden relative font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] bg-[#E31837] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute top-40 -right-40 w-[30rem] h-[30rem] bg-red-900 rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 md:p-24">

        <Link href="/" className="absolute top-8 left-8 flex items-center text-neutral-400 hover:text-white transition-colors bg-white/5 p-3 rounded-full border border-white/10 backdrop-blur-md">
          <Home className="w-6 h-6" />
        </Link>

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E31837]/20 border border-[#E31837]/30 backdrop-blur-md mb-4 shadow-2xl">
            <Shield className="w-4 h-4 text-[#E31837]" />
            <span className="text-sm font-semibold tracking-widest text-red-200 uppercase">Competitive Travel Team</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm uppercase">
            York Lions<br />
            <span className="text-[#E31837]">Red Team</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed mt-6">
            The official portal for the York Lions Competitive Travel Team. View rosters, upcoming schedules, and team stats.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
          <Link href="/red-team/schedule" className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/50 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-[#E31837]/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CalendarDays className="w-8 h-8 text-white mb-4 group-hover:text-[#E31837] transition-colors" />
            <h3 className="text-xl font-semibold mb-2">Schedule</h3>
            <p className="text-neutral-400 text-sm">View upcoming matchups and track live play-by-play.</p>
          </Link>

          <Link href="/red-team/roster" className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/50 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-[#E31837]/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Users className="w-8 h-8 text-white mb-4 group-hover:text-[#E31837] transition-colors" />
            <h3 className="text-xl font-semibold mb-2">Team</h3>
            <p className="text-neutral-400 text-sm">Browse the official travel team and view stats.</p>
          </Link>

          <Link href="/red-team/stats" className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/50 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-[#E31837]/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Activity className="w-8 h-8 text-white mb-4 group-hover:text-[#E31837] transition-colors" />
            <h3 className="text-xl font-semibold mb-2">Stat Leaders</h3>
            <p className="text-neutral-400 text-sm">Top 3 performers in each stat category.</p>
          </Link>
        </div>
        <div className="mt-16 flex items-center justify-center gap-6">
          <Link href="/login" className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Admin Login
          </Link>
        </div>
      </main>
    </div>
  );
}
