'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, useAdmin, useFirebase } from '@/firebase';
import { LayoutDashboard, Code2, Trophy, Map, Database, MessageSquare, LogIn, Loader2, Users, Activity, ScrollText, Award } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="15" fill="#1e40af"/>
    <path d="M30 40L15 50L30 60" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M70 40L85 50L70 60" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M40 70L60 30" stroke="white" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

const DEFAULT_GOV_HERO_BG = "https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=2070&auto=format&fit=crop";

export default function Home() {
  const { user } = useUser();
  const { isAdmin, isProblemSetter } = useAdmin();
  const { db, rtdb } = useFirebase();

  const [heroBgUrl, setHeroBgUrl] = useState<string>(DEFAULT_GOV_HERO_BG);
  const [stats, setStats] = useState({
    problems: 0,
    trainees: 0,
    setters: 0,
    activeTrainees: 0,
    loading: true
  });

  useEffect(() => {
    if (!rtdb) return;
    const heroBgRef = ref(rtdb, 'settings/heroBgUrl');
    const unsub = onValue(heroBgRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val()) {
        setHeroBgUrl(snapshot.val());
      } else {
        setHeroBgUrl(DEFAULT_GOV_HERO_BG);
      }
    });
    return () => unsub();
  }, [rtdb]);

  useEffect(() => {
    async function fetchOptimizedStats() {
      if (!db) return;
      try {
        const problemsSnap = await getCountFromServer(collection(db, "problems"));
        const settersSnap = await getCountFromServer(
          query(collection(db, "users"), where("role", "in", ["admin", "problem_setter"]))
        );
        const traineesSnap = await getCountFromServer(
          query(collection(db, "users"), where("role", "==", "trainee"))
        );
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const activeSnap = await getCountFromServer(
          query(collection(db, "users"), where("lastActivity", ">=", oneWeekAgo.toISOString()))
        );

        setStats({
          problems: problemsSnap.data().count,
          trainees: traineesSnap.data().count,
          setters: settersSnap.data().count,
          activeTrainees: activeSnap.data().count,
          loading: false
        });
      } catch (e) {
        console.error("Stats fetch error:", e);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }
    fetchOptimizedStats();
  }, [db]);

  return (
    <div className="flex flex-col min-h-screen bg-[#fcf9f2] text-[#2c241b]" dir="rtl">
      <header className="border-b-2 border-double border-[#8b2626]/30 bg-[#fbf7ee] sticky top-0 z-50 w-full shadow-sm">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 lg:gap-8 flex-1 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <Logo className="transition-transform group-hover:scale-105 shadow-sm" />
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-bold font-serif-ar text-[#8b2626] tracking-tight whitespace-nowrap">OptimalCP</span>
                <span className="text-[9px] font-bold text-[#8c7964] -mt-1 tracking-widest uppercase font-serif-ar">منصة البرمجة التنافسية</span>
              </div>
            </Link>
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6 font-serif-ar">
              {user && <Link href="/roadmap" className="text-xs font-bold text-[#5a4c3e] hover:text-[#8b2626] transition-colors whitespace-nowrap">خارطة الطريق</Link>}
              <Link href="/problems" className="text-xs font-bold text-[#5a4c3e] hover:text-[#8b2626] transition-colors whitespace-nowrap">بنك المسائل</Link>
              <Link href="/forum" className="text-xs font-bold text-[#5a4c3e] hover:text-[#8b2626] transition-colors whitespace-nowrap">منتدى النقاش</Link>
              <Link href="/leaderboard" className="text-xs font-bold text-[#5a4c3e] hover:text-[#8b2626] transition-colors whitespace-nowrap">لوحة الشرف</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!user ? (
              <Link href="/login">
                <Button className="font-bold rounded-sm h-10 px-5 text-xs bg-[#8b2626] hover:bg-[#731b1b] text-[#fffdf8] border border-[#731b1b] gap-2 font-serif-ar whitespace-nowrap shadow-sm">
                  <LogIn className="w-3.5 h-3.5" /> تسجيل الدخول
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {(isAdmin || isProblemSetter) && (
                  <Link href="/dashboard" className="hidden sm:block">
                    <Button variant="outline" className="font-bold h-10 rounded-sm gap-2 text-xs border-2 border-[#8b2626]/40 text-[#8b2626] bg-[#f4ebe0] hover:bg-[#8b2626] hover:text-[#fffdf8] font-serif-ar whitespace-nowrap">
                      <LayoutDashboard className="w-3.5 h-3.5" /> مركز العمليات
                    </Button>
                  </Link>
                )}
                <Link href="/roadmap">
                  <Button className="font-bold h-10 rounded-sm px-6 text-xs bg-[#8b2626] text-[#fffdf8] hover:bg-[#731b1b] font-serif-ar whitespace-nowrap shadow-sm">لوحتي التعليمية</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Official Government Style Hero Section with Customizable Background */}
        <section className="relative py-24 md:py-32 border-b-2 border-double border-[#8b2626]/30 overflow-hidden min-h-[500px] flex items-center">
          {/* Background Image Layer */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{ backgroundImage: `url('${heroBgUrl}')` }}
          />
          {/* Official Dark Overlay Gradient for Perfect Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1b1510]/95 via-[#231b14]/90 to-[#1b1510]/95 backdrop-blur-[1px]" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl space-y-6 text-right">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm bg-[#3a2f24]/80 border border-[#c5a059]/60 text-[#f4ebe0] text-xs font-bold font-serif-ar backdrop-blur-sm">
                <span>المنصة الأولى لتدريب المبرمجين على الخوارزميات</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-[#fffdf8] font-serif-ar leading-tight drop-shadow-sm">
                منصة OptimalCP <br />
                <span className="text-[#e2b874] border-b-4 border-double border-[#c5a059] pb-1">لإتقان البرمجة التنافسية</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[#f0e6d6] font-serif-ar leading-relaxed max-w-2xl drop-shadow-sm">
                مسار تعليمي مدروس ومحكم لتدريب المبرمجين. ادرس مفاهيم الخوارزميات، حل مسائل Codeforces الرسمية، وارتقِ بمستواك التنافسي بثبات وثقة.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href={user ? "/roadmap" : "/login"}>
                  <Button size="lg" className="font-bold rounded-sm px-10 h-14 text-lg bg-[#8b2626] hover:bg-[#731b1b] text-[#fffdf8] border-2 border-[#a83232] shadow-lg gap-2 w-full sm:w-auto font-serif-ar">
                    ابدأ مسار التعلم
                  </Button>
                </Link>
                <Link href="/problems">
                  <Button size="lg" variant="outline" className="font-bold rounded-sm px-10 h-14 text-lg bg-[#2b221a]/80 text-[#f4ebe0] border-2 border-[#c5a059]/60 hover:bg-[#8b2626] hover:text-[#fffdf8] hover:border-[#8b2626] w-full sm:w-auto font-serif-ar backdrop-blur-sm transition-all">
                    تصفح بنك المسائل
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Cards Grid */}
        <section className="py-20 container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="p-8 border-2 border-[#e2d6c3] bg-[#fffdf8] rounded-sm space-y-4 hover:border-[#8b2626] transition-all shadow-sm">
                <div className="w-14 h-14 bg-[#f4ebe0] border border-[#c5a059] rounded-sm flex items-center justify-center text-[#8b2626]">
                  <ScrollText className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold font-serif-ar text-[#2c241b]">خارطة طريق محكمة</h3>
                <p className="text-base text-[#5a4c3e] font-serif-ar leading-relaxed">تدرج في وحدات المنهج من الأساسيات إلى أعقد الخوارزميات وفق تسلسل مدروس.</p>
             </div>
             
             <div className="p-8 border-2 border-[#e2d6c3] bg-[#fffdf8] rounded-sm space-y-4 hover:border-[#8b2626] transition-all shadow-sm">
                <div className="w-14 h-14 bg-[#f4ebe0] border border-[#c5a059] rounded-sm flex items-center justify-center text-[#8b2626]">
                  <Code2 className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold font-serif-ar text-[#2c241b]">تحكيم Codeforces</h3>
                <p className="text-base text-[#5a4c3e] font-serif-ar leading-relaxed">ربط مباشر مع منصة Codeforces العالمية لضمان صحة ومصداقية الحلول المقدمة.</p>
             </div>
             
             <div className="p-8 border-2 border-[#e2d6c3] bg-[#fffdf8] rounded-sm space-y-4 hover:border-[#8b2626] transition-all shadow-sm">
                <div className="w-14 h-14 bg-[#f4ebe0] border border-[#c5a059] rounded-sm flex items-center justify-center text-[#8b2626]">
                  <Award className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold font-serif-ar text-[#2c241b]">سجل المتصدرين</h3>
                <p className="text-base text-[#5a4c3e] font-serif-ar leading-relaxed">تنافس في مجلس الشرف واستعرض ترتيبك بين نخبة المبرمجين.</p>
             </div>
          </div>
        </section>

        {/* Real-time Ledger */}
        <section className="py-20 bg-[#2b231a] text-[#f4ebe0] border-y-4 border-double border-[#8b2626]">
          <div className="container mx-auto px-6 text-center space-y-10">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#c5a059] tracking-widest uppercase font-serif-ar">سجل المنصة التراكمي</span>
              <h2 className="text-3xl md:text-4xl font-bold font-serif-ar text-[#fffdf8]">إحصائيات المنصة الحية</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="p-6 border border-[#524434] bg-[#231c15] rounded-sm space-y-2">
                {stats.loading ? (
                  <div className="h-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#c5a059]" /></div>
                ) : (
                  <div className="text-3xl md:text-4xl font-bold font-serif-ar text-[#c5a059]">{stats.setters}</div>
                )}
                <p className="text-xs font-bold text-[#b5a38f] font-serif-ar">واضع مسائل</p>
              </div>
              
              <div className="p-6 border border-[#524434] bg-[#231c15] rounded-sm space-y-2">
                {stats.loading ? (
                  <div className="h-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#c5a059]" /></div>
                ) : (
                  <div className="text-3xl md:text-4xl font-bold font-serif-ar text-[#fffdf8]">{stats.trainees}</div>
                )}
                <p className="text-xs font-bold text-[#b5a38f] font-serif-ar">متدرب</p>
              </div>
              
              <div className="p-6 border border-[#524434] bg-[#231c15] rounded-sm space-y-2">
                {stats.loading ? (
                  <div className="h-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#c5a059]" /></div>
                ) : (
                  <div className="text-3xl md:text-4xl font-bold font-serif-ar text-[#c5a059]">{stats.problems}</div>
                )}
                <p className="text-xs font-bold text-[#b5a38f] font-serif-ar">مسألة مسجلة</p>
              </div>
              
              <div className="p-6 border border-[#524434] bg-[#231c15] rounded-sm space-y-2">
                {stats.loading ? (
                  <div className="h-10 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#c5a059]" /></div>
                ) : (
                  <div className="text-3xl md:text-4xl font-bold font-serif-ar text-emerald-400">{stats.activeTrainees}</div>
                )}
                <p className="text-xs font-bold text-[#b5a38f] font-serif-ar">نشط هذا الأسبوع</p>
              </div>
            </div>
          </div>
        </section>

        {!user && (
          <section className="py-20 bg-[#f7f1e5]">
            <div className="container mx-auto px-6">
              <div className="p-8 md:p-14 bg-[#fffdf8] border-2 border-dashed border-[#8b2626]/40 rounded-sm max-w-4xl mx-auto flex flex-col items-center text-center gap-6 shadow-sm">
                 <div className="space-y-3">
                   <h2 className="text-3xl md:text-4xl font-bold font-serif-ar text-[#2c241b]">انضم إلينا</h2>
                   <p className="text-base text-[#5a4c3e] font-serif-ar max-w-xl mx-auto leading-relaxed">
                     سواء كنت طالباً أو مبرمجاً طموحاً، نتيح لك بيئة تعليمية جادة ومجانية بالكامل لتطوير مهاراتك الخوارزمية.
                   </p>
                 </div>
                 <Link href="/login" className="w-full sm:w-auto">
                   <Button size="lg" className="w-full sm:w-auto font-bold rounded-sm h-14 px-12 bg-[#8b2626] hover:bg-[#731b1b] text-[#fffdf8] border-2 border-[#631414] text-lg font-serif-ar shadow-md">
                     أنشئ حساب
                   </Button>
                 </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

