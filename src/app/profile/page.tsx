
'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

export default function MyProfileRedirect() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push(`/profile/${user.uid}`);
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="font-bold text-xs text-slate-400">جاري تحميل ملفك الشخصي...</p>
      </div>
    </div>
  );
}
