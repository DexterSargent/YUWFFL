import Link from "next/link";
import { Shield, Trophy } from "lucide-react";
import Image from "next/image";

export default function PortalHome() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#E31837]/40 overflow-hidden relative font-sans flex flex-col items-center justify-center p-6 md:p-24">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-[#E31837] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute top-40 -right-40 w-[40rem] h-[40rem] bg-red-900 rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 text-center space-y-6 max-w-4xl mb-16">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm uppercase">
          York Flag Football
        </h1>
        <p className="text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed mt-6">
          Select your portal to access schedules, rosters, and live game tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
        {/* Red Team Portal */}
        <Link href="/red-team" className="group relative flex flex-col items-center justify-center p-12 rounded-[3rem] bg-neutral-950/50 border border-[#E31837]/20 backdrop-blur-md hover:bg-[#E31837]/10 transition-all duration-500 hover:border-[#E31837]/50 overflow-hidden shadow-2xl hover:shadow-[0_0_50px_rgba(227,24,55,0.3)] hover:-translate-y-2">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <Shield className="w-16 h-16 text-[#E31837] mb-6 transform group-hover:scale-110 transition-transform duration-500" />
          <h2 className="text-3xl font-black mb-4 tracking-wider text-[#E31837]">RED TEAM</h2>
          <p className="text-neutral-400 text-center">York Lions Competitive Travel Team</p>
        </Link>

        {/* YUWFFL Portal */}
        <Link href="/yuwffl" className="group relative flex flex-col items-center justify-center p-12 rounded-[3rem] bg-neutral-950/50 border border-white/5 backdrop-blur-md hover:bg-neutral-900 transition-all duration-500 hover:border-white/20 overflow-hidden shadow-2xl hover:shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:-translate-y-2">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <UsersIcon className="w-16 h-16 text-white mb-6 transform group-hover:scale-110 transition-transform duration-500" />
          <h2 className="text-3xl font-black mb-4 tracking-wider">YUWFFL</h2>
          <p className="text-neutral-400 text-center">York University Women's Flag Football League (Intramural/Rec)</p>
        </Link>
      </div>
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
