"use client";

import { useAuth } from "@/lib/authContext";
import { use, useEffect, useState } from "react";
import RedAdminView from "./RedAdminView";
import RedViewerView from "./RedViewerView";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function PlayByPlayWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, loading } = useAuth();
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const [matchData, setMatchData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const loadMatch = async () => {
      try {
        const snap = await getDoc(doc(db, "red_matches", matchId));
        if (snap.exists()) {
          setMatchData(snap.data());
        }
      } catch (error) {
        console.error("Failed to load match:", error);
      } finally {
        setIsFetching(false);
      }
    };
    loadMatch();
  }, [matchId]);
  
  if (loading || isFetching) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAdmin && matchData?.status !== "completed") {
    return <RedAdminView params={params} />;
  }

  return <RedViewerView params={params} />;
}
