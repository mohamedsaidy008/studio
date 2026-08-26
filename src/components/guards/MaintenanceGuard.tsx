'use client';

import { useMaintenanceMode, useAdmin } from "@/firebase";
import { Loader2, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { isMaintenance, loading: mLoading } = useMaintenanceMode();
  const { isAdmin, loading: aLoading } = useAdmin();
  const pathname = usePathname();

  // السماح بالوصول لصفحات المعلومات الأساسية والتهيئة حتى في وضع الصيانة
  const PUBLIC_PATHS = ['/login', '/privacy', '/terms', '/licenses', '/setup'];

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  if (mLoading || aLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-2 bg-white">
        <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
        <p className="text-xs font-bold text-slate-400">جاري تحميل المنصة...</p>
      </div>
    );
  }

  // إذا كان وضع الصيانة مفعل، والداخل ليس مديراً
  if (isMaintenance && !isAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 border-t-4 border-primary" dir="rtl">
        <div className="max-w-xl space-y-6">
          <div className="p-5 bg-white rounded-full shadow-sm w-fit mx-auto border-2">
            <Wrench className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">الموقع تحت الصيانة الأكاديمية</h1>
          <p className="text-slate-600 font-bold leading-relaxed">نحن نقوم بتحديث النظام حالياً لضمان أفضل تجربة برمجية محكمة ومستقرة. سنعود قريباً جداً.</p>
          
          <div className="pt-8 border-t flex flex-col items-center gap-4">
            <Link href="/login">
              <button className="text-sm font-black text-primary hover:underline border-2 border-primary/20 px-6 py-2 rounded-sm hover:bg-primary/5 transition-all">دخول الإدارة (Admins Only)</button>
            </Link>
            <div className="flex gap-4 text-[10px] font-bold text-slate-400">
               <Link href="/terms" className="hover:text-slate-900">شروط الاستخدام</Link>
               <span>•</span>
               <Link href="/privacy" className="hover:text-slate-900">سياسة الخصوصية</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
