"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Map, 
  Code2, 
  Trophy, 
  User, 
  LogOut,
  Settings,
  LayoutDashboard,
  BookOpen,
  Database,
  MessageSquare,
  LogIn,
  Menu,
  LifeBuoy,
  Users
} from "lucide-react";
import { useAdmin, logout, useUser, useFirebase } from "@/firebase";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ref, onValue, off } from "firebase/database";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="15" fill="#1e40af"/>
    <path d="M30 40L15 50L30 60" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M70 40L85 50L70 60" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M40 70L60 30" stroke="white" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { db, rtdb } = useFirebase();
  const { isAdmin, isProblemSetter } = useAdmin();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!isAdmin || !db || !rtdb) return;

    const ticketsQ = query(collection(db, "support_tickets"), where("status", "==", "open"));
    const unsubTickets = onSnapshot(ticketsQ, (snap) => {
      const ticketsCount = snap.size;
      const forumRef = ref(rtdb, 'forum/topics');
      const unsubForum = onValue(forumRef, (snapshot) => {
        let reportedCount = 0;
        if (snapshot.exists()) {
          reportedCount = Object.values(snapshot.val()).filter((t: any) => t.reportsCount >= 5 && t.status !== 'deleted').length;
        }
        setAlertCount(ticketsCount + reportedCount);
      });
      return () => unsubForum();
    });
    return () => unsubTickets();
  }, [isAdmin, db, rtdb]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/");
  }, [router]);

  const navItems = useMemo(() => [
    { name: "خارطة الطريق", href: "/roadmap", icon: Map, private: true },
    { name: "بنك المسائل", href: "/problems", icon: Code2, private: false },
    { name: "منتدى النقاش", href: "/forum", icon: MessageSquare, private: false },
    { name: "لوحة الشرف", href: "/leaderboard", icon: Trophy, private: false },
    { name: "الملف الشخصي", href: "/profile", icon: User, private: true },
    { name: "إعدادات الحساب", href: "/settings", icon: Settings, private: true },
  ], []);

  const filteredNavItems = useMemo(() => navItems.filter(item => {
    if (!user && item.private) return false;
    return true;
  }), [user, navItems]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-right bg-[#fbf7ee] text-[#2c241b]" dir="rtl">
      <div className="mb-8 shrink-0 pb-4 border-b border-double border-[#8b2626]/30">
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setOpen(false)}>
          <Logo className="w-9 h-9 rounded-sm shadow-sm" />
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-[#8b2626] font-serif-ar">OptimalCP</span>
            <span className="text-[9px] font-bold text-[#8c7964] -mt-1 tracking-widest uppercase">منصة البرمجة التنافسية</span>
          </div>
        </Link>
      </div>

      <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            prefetch={true}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-bold transition-all border",
              pathname === item.href || (item.href !== "/roadmap" && pathname.startsWith(item.href)) 
                ? "bg-[#8b2626] text-[#fffdf8] border-[#731b1b] shadow-sm font-black" 
                : "text-[#5a4c3e] border-transparent hover:bg-[#efe6d5] hover:text-[#2c241b]"
            )}
          >
            <item.icon className="w-4.5 h-4.5 shrink-0" />
            {item.name}
          </Link>
        ))}

        {user && (isAdmin || isProblemSetter) && (
          <div className="mt-8 pt-5 border-t-2 border-dashed border-[#e2d6c3]">
            <p className="px-4 mb-3 text-[10px] font-bold text-[#8c7964] uppercase tracking-widest text-right font-serif-ar">الإدارة والأدوات</p>
            <div className="space-y-1">
              
              {isAdmin && (
                <Link href="/dashboard" prefetch={true} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-sm border transition-all", pathname === "/dashboard" ? "text-[#8b2626] bg-[#f2e6d5] border-[#c5a059]" : "text-[#5a4c3e] border-transparent hover:bg-[#efe6d5]")}>
                  <LayoutDashboard className="w-4 h-4" /> مركز العمليات
                </Link>
              )}
              
              {isAdmin && (
                <Link href="/admin/roadmap" prefetch={true} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-sm border transition-all", pathname === "/admin/roadmap" ? "text-[#8b2626] bg-[#f2e6d5] border-[#c5a059]" : "text-[#5a4c3e] border-transparent hover:bg-[#efe6d5]")}>
                  <BookOpen className="w-4 h-4" /> إدارة المنهج
                </Link>
              )}

              {(isAdmin || isProblemSetter) && (
                <Link href="/admin/problems" prefetch={true} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-sm border transition-all", pathname === "/admin/problems" ? "text-[#8b2626] bg-[#f2e6d5] border-[#c5a059]" : "text-[#5a4c3e] border-transparent hover:bg-[#efe6d5]")}>
                  <Database className="w-4 h-4" /> إدارة المسائل
                </Link>
              )}

              {(isAdmin || isProblemSetter) && (
                <Link href="/admin/support" prefetch={true} onClick={() => setOpen(false)} className={cn("relative flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-bold rounded-sm border transition-all", pathname === "/admin/support" ? "text-[#8b2626] bg-[#f2e6d5] border-[#c5a059]" : "text-[#5a4c3e] border-transparent hover:bg-[#efe6d5]")}>
                  <div className="flex items-center gap-3">
                    <LifeBuoy className="w-4 h-4" /> الدعم الفني
                  </div>
                  {alertCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-[#8b2626] text-[10px] font-bold text-[#fffdf8] px-1 shadow-none">
                      {alertCount}
                    </span>
                  )}
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin/users" prefetch={true} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-sm border transition-all", pathname === "/admin/users" ? "text-[#8b2626] bg-[#f2e6d5] border-[#c5a059]" : "text-[#5a4c3e] border-transparent hover:bg-[#efe6d5]")}>
                  <Users className="w-4 h-4" /> إدارة الأعضاء
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto pt-4 border-t-2 border-double border-[#8b2626]/30 shrink-0">
        {user ? (
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-sm text-xs font-bold text-[#8b2626] hover:bg-[#f4e4d4] border border-transparent hover:border-[#8b2626]/20 transition-all text-right"
          >
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        ) : (
          <Link 
            href="/login"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-sm text-xs font-bold text-[#8b2626] bg-[#f4ebe0] border-2 border-[#8b2626] hover:bg-[#8b2626] hover:text-[#fffdf8] transition-all"
          >
            <LogIn className="w-4 h-4" /> تسجيل الدخول
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden fixed top-3 right-3 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-[#fbf7ee] border-2 border-[#8b2626] rounded-sm shadow-none hover:bg-[#efe6d5]">
              <Menu className="w-5 h-5 text-[#8b2626]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-6 overflow-hidden rounded-none bg-[#fbf7ee] border-l-2 border-[#8b2626]" dir="rtl">
            <SheetHeader>
              <SheetTitle className="sr-only font-serif-ar">القائمة الرئيسية</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:flex w-64 border-l-2 border-[#e2d6c3] h-screen bg-[#fbf7ee] flex-col sticky top-0 z-40 shadow-none shrink-0" dir="rtl">
        <div className="p-6 flex flex-col h-full overflow-hidden">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
