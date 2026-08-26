'use client';

import { useUser, useFirebase } from "@/firebase";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const { db } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // الصفحات التي لا تتطلب إكمال الإعداد
  const PUBLIC_PATHS = ['/', '/login', '/setup', '/privacy', '/terms', '/licenses'];

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.push("/login");
      } else {
        setIsReady(true);
      }
      return;
    }

    const checkStatus = async () => {
      if (PUBLIC_PATHS.includes(pathname) && pathname !== '/') {
        setIsReady(true);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db!, `users/${user.uid}`));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // الأدمن مستثنى
          if (data.role === 'admin') {
            setIsReady(true);
            return;
          }

          const hasUsername = data.username && data.username !== 'مبرمج_طموح';
          const hasCountry = !!data.country;

          // لم يعد التوثيق (isCfVerified) شرطاً للدخول
          if (!hasUsername || !hasCountry) {
            if (!PUBLIC_PATHS.includes(pathname)) {
              router.push("/setup");
            } else {
              setIsReady(true);
            }
          } else {
            setIsReady(true);
          }
        } else {
          router.push("/setup");
        }
      } catch (e) {
        console.error('Error in SetupGuard checkStatus:', e);
        setIsReady(true);
      }
    };

    checkStatus();
  }, [user, authLoading, pathname, router, db]);

  if (authLoading || (!isReady && !PUBLIC_PATHS.includes(pathname))) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-white">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <p className="text-xs font-black text-slate-400">جاري التحقق من حالة الحساب...</p>
      </div>
    );
  }

  return <>{children}</>;
}
