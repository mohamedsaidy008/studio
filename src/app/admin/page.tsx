'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="font-bold text-muted-foreground">جاري الانتقال إلى لوحة التحكم الحديثة...</p>
      </div>
    </div>
  );
}