"use client";

import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, isAdmin, loading, login, logout, bypassLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAdmin) {
      router.push("/");
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 relative">
      
      {/* Back Button */}
      <div className="absolute top-8 left-8">
        <button 
          onClick={() => router.push('/')}
          className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Dashboard
        </button>
      </div>

      <div className="bg-neutral-900 border border-white/10 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center max-w-md w-full">
        <h1 className="text-4xl font-black mb-8 uppercase tracking-widest text-[#E31837]">Admin Access</h1>
        {user ? (
          <div className="flex flex-col items-center gap-6 text-center w-full">
             <p className="text-xl">Signed in as <span className="text-emerald-500 font-bold">{user.email}</span></p>
             <p className="text-neutral-400">You do not have admin privileges. Contact an existing admin to be added.</p>
             {typeof window !== "undefined" && window.location.hostname === "localhost" && (
                <button onClick={bypassLogin} className="w-full py-4 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 font-bold rounded-2xl transition-colors mt-2 border border-amber-500/50">
                  Bypass as Dev Admin (Localhost)
                </button>
             )}
            <button onClick={logout} className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl transition-colors mt-2">
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full">
            <p className="text-neutral-400 text-center mb-4">Sign in with your Google account to access admin tools.</p>
            <button onClick={login} className="w-full py-6 bg-white hover:bg-neutral-200 text-black font-black text-xl rounded-2xl transition-transform active:scale-95 shadow-xl">
              SIGN IN WITH GOOGLE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
