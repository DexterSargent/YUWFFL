"use client";

import { useAuth } from "@/lib/authContext";
import { use } from "react";
import AdminView from "./AdminView";
import ViewerView from "./ViewerView";

export default function PlayByPlayWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminView params={params} />;
  }

  return <ViewerView params={params} />;
}
