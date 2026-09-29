import Link from "next/link";
import { Trophy, CalendarDays, Users, Activity, Settings, UserPlus } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#E31837]/40 overflow-hidden relative font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] bg-[#E31837] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute top-40 -right-40 w-[30rem] h-[30rem] bg-red-900 rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 md:p-24">

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4 shadow-2xl">
            <Trophy className="w-4 h-4 text-[#E31837]" />
            <span className="text-sm font-semibold tracking-widest text-neutral-200 uppercase">York Lions</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm">
            York University<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-red-200 to-[#E31837]">Women's Flag Football League</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed mt-6">
            The official portal for the YUWFFL. View rosters, game stats, and stay updated with the latest schedule.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">

          <Link href="/calendar" className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/50 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CalendarDays className="w-8 h-8 text-white mb-4" />
            <h3 className="text-xl font-semibold mb-2">Scores & Schedule</h3>
            <p className="text-neutral-400 text-sm">View upcoming matchups and past results.</p>
          </Link>

          <Link href="/rosters" className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/50 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Users className="w-8 h-8 text-[#E31837] mb-4" />
            <h3 className="text-xl font-semibold mb-2">Teams</h3>
            <p className="text-neutral-400 text-sm">Browse teams and individual player details.</p>
          </Link>

          <Link href="/stats" className="group relative flex flex-col p-6 rounded-3xl bg-neutral-950/50 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-300 hover:border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Activity className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Stats & Standings</h3>
            <p className="text-neutral-400 text-sm">Check standings and individual player statistics.</p>
          </Link>

        </div>

        <div className="mt-16 flex items-center justify-center gap-6">
          <Link href="/join" className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-[#E31837] text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(227,24,55,0.3)] hover:shadow-[0_0_30px_rgba(227,24,55,0.5)] hover:-translate-y-1">
            <UserPlus className="w-5 h-5" />
            <span>Join League</span>
          </Link>

          <Link href="/login" className="text-neutral-600 hover:text-neutral-400 text-sm transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Admin Login
          </Link>
        </div>
      </main>
    </div>
  );
}
