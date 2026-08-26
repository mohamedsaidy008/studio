'use client';

import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  History, 
  CheckCircle2, 
  User as UserIcon, 
  Trophy,
  Loader2,
  Award,
  CalendarDays,
  MapPin,
  Code2,
  BarChart3,
  BookOpen,
  RefreshCcw,
  Eye,
  Calendar
} from "lucide-react";
import { useUser, useFirebase } from "@/firebase";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ref, onValue, off, update as updateRtdb } from "firebase/database";
import { collection, onSnapshot, doc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { getCountryDisplayName } from "@/lib/countries";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import Link from "next/link";
import { getUserInfo, getUserRating } from "@/app/actions/codeforces";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const calculateLevel = (xp: number) => {
  const level = Math.floor(xp / 200) + 1;
  const currentLevelXp = xp % 200;
  const progress = (currentLevelXp / 200) * 100;
  const remainingXp = 200 - currentLevelXp;

  let rank = "مستجد";
  let color = "bg-slate-500";
  
  if (xp >= 10000) { rank = "أستاذ دولي"; color = "bg-red-600"; }
  else if (xp >= 7000) { rank = "أستاذ"; color = "bg-orange-600"; }
  else if (xp >= 4000) { rank = "مرشح أستاذ"; color = "bg-purple-600"; }
  else if (xp >= 2000) { rank = "خبير"; color = "bg-blue-600"; }
  else if (xp >= 1000) { rank = "متخصص"; color = "bg-cyan-600"; }
  else if (xp >= 400) { rank = "تلميذ"; color = "bg-emerald-600"; }
  
  return { level, rank, color, progress, remainingXp };
};

const BADGE_DEFINITIONS: Record<string, any> = {
  'first_solve': { title: 'البداية القوية', description: 'يُمنح عند حل أول مسألة برمجية بنجاح.', icon: Trophy, color: 'text-orange-500' },
  'exp_500': { title: 'جامع الـ XP', description: 'يُمنح عند الوصول لـ 500 نقطة خبرة.', icon: Award, color: 'text-blue-500' },
  'learner': { title: 'متعلم شغوف', description: 'يُمنح عند إكمال 5 دروس تعليمية.', icon: CalendarDays, color: 'text-emerald-500' }
};

export default function PublicProfilePage() {
  const { uid } = useParams();
  const { user: currentUser } = useUser();
  const { rtdb, db } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [solvedList, setSolvedList] = useState<any[]>([]);
  const [skillsData, setSkillsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progressStats, setProgressStats] = useState({ completed: 0, total: 0 });

  const targetUid = uid as string;
  const isOwner = currentUser?.uid === targetUid;

  useEffect(() => {
    if (profile?.username) document.title = profile.username;
  }, [profile]);

  useEffect(() => {
    if (!targetUid || !db || !rtdb) return;
    
    const unsubProfile = onSnapshot(doc(db, `users/${targetUid}`), (snapshot) => {
      if (snapshot.exists()) setProfile(snapshot.data());
      else router.push("/leaderboard");
    });

    const solvedRef = ref(rtdb, `users/${targetUid}/solvedProblems`);
    onValue(solvedRef, async (snapshot) => {
      if (snapshot.exists()) {
        const ids = Object.keys(snapshot.val());
        const recentIds = ids.slice(-5).reverse();
        if (recentIds.length > 0) {
          const probsQ = query(collection(db, "problems"), where("id", "in", recentIds));
          const pSnap = await getDocs(probsQ);
          setSolvedList(pSnap.docs.map(d => d.data()));

          const categories: Record<string, number> = {};
          pSnap.docs.forEach(d => {
            const cat = d.data().category || "General";
            categories[cat] = (categories[cat] || 0) + 1;
          });
          setSkillsData(Object.entries(categories).map(([name, value]) => ({ name, value })));
        }
      }
    });

    onValue(ref(rtdb, "roadmap"), (snap) => {
      if (snap.exists()) {
        let total = 0;
        Object.values(snap.val()).forEach((stage: any) => {
          total += stage.lessons ? Object.keys(stage.lessons).length : 0;
        });
        setProgressStats(prev => ({ ...prev, total }));
      }
    });

    onValue(ref(rtdb, `users/${targetUid}/progress/lessons`), (snap) => {
      if (snap.exists()) setProgressStats(prev => ({ ...prev, completed: Object.keys(snap.val()).length }));
      setLoading(false);
    });

    return () => {
      unsubProfile();
      off(solvedRef);
    };
  }, [targetUid, db, rtdb, router]);

  const handleRefreshCFData = async () => {
    if (!profile?.cfHandle || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [infoRes, ratingRes] = await Promise.all([
        getUserInfo(profile.cfHandle),
        getUserRating(profile.cfHandle)
      ]);

      if (infoRes.status === 'OK') {
        const info = infoRes.result[0];
        const updates = {
          cfData: {
            rating: info.rating || 0,
            maxRating: info.maxRating || 0,
            rank: info.rank || "Newbie",
            maxRank: info.maxRank || "Newbie",
            contribution: info.contribution || 0,
            photo: info.titlePhoto || info.avatar || null,
            friendOfCount: info.friendOfCount || 0,
            registrationTime: info.registrationTimeSeconds || 0,
            lastOnlineTime: info.lastOnlineTimeSeconds || 0,
            contestCount: ratingRes.status === 'OK' ? ratingRes.result.length : 0,
            lastUpdate: Date.now()
          }
        };
        await updateDoc(doc(db!, `users/${targetUid}`), updates);
        await updateRtdb(ref(rtdb!, `users/${targetUid}`), updates);
        toast({ title: "تم تحديث إحصائيات كودفورسز ✨" });
      }
    } catch (e) {
      console.error("Error refreshing CF stats:", e);
      toast({ variant: "destructive", title: "فشل الاتصال" });
    }
    finally { setIsRefreshing(false); }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-400" /></div>;

  const { level, rank, color: rankColor, progress, remainingXp } = calculateLevel(profile?.xp || 0);
  const userAvatar = profile?.cfData?.photo || profile?.photoURL;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        
        <div className="bg-white p-8 lg:p-10 border rounded-sm shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-primary" />
          <div className="w-28 h-28 lg:w-32 lg:h-32 bg-slate-100 rounded-sm border-2 border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" alt="avatar" /> : <UserIcon className="w-16 h-16 text-slate-300" />}
          </div>
          <div className="flex-1 space-y-4 text-center md:text-right">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl font-black text-slate-900">{profile?.username}</h1>
              <Badge className={cn("text-[10px] font-black rounded-sm px-4 py-1", rankColor)}>{rank}</Badge>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-bold text-slate-400">
               <span dir="ltr">{profile?.email}</span>
               <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {getCountryDisplayName(profile?.country || "LY")}</span>
            </div>
            <div className="max-w-md mx-auto md:mx-0 space-y-2">
               <div className="flex justify-between items-end"><span className="text-[10px] font-black text-primary uppercase">المستوى {level}</span><span className="text-[9px] font-bold text-slate-400">باقي {remainingXp} XP للمستوى التالي</span></div>
               <Progress value={progress} className="h-2 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="flex gap-8 border-r pr-8 hidden lg:flex">
             <div className="text-center"><div className="text-3xl font-black text-primary">{profile?.xp || 0}</div><div className="text-[10px] text-slate-400 font-black uppercase">XP Score</div></div>
             <div className="text-center"><div className="text-3xl font-black text-slate-800">{profile?.solved || 0}</div><div className="text-[10px] text-slate-400 font-black uppercase">Solved</div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
             {profile?.cfHandle && (
               <Card className="rounded-sm border-2 border-slate-100 bg-white shadow-none overflow-hidden">
                  <div className="bg-slate-50/50 p-4 border-b flex items-center justify-between">
                     <div className="flex items-center gap-2"><Code2 className="w-5 h-5 text-blue-600" /><h3 className="font-black text-sm">إحصائيات كودفورسز</h3></div>
                     <div className="flex items-center gap-3">
                        {isOwner && (
                          <Button variant="ghost" size="sm" onClick={handleRefreshCFData} disabled={isRefreshing} className="h-8 text-[9px] font-black gap-2 border bg-white">
                             {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />} تحديث
                          </Button>
                        )}
                        <Badge variant="outline" className="font-mono text-xs border-blue-200 text-blue-700 bg-blue-50">{profile.cfHandle}</Badge>
                     </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x border-b">
                       <div className="p-6">
                          <span className="text-[8px] font-black text-slate-400 uppercase">التقييم</span>
                          <div className="text-xl font-black text-blue-600">{profile.cfData?.rating || "N/A"}</div>
                       </div>
                       <div className="p-6">
                          <span className="text-[8px] font-black text-slate-400 uppercase">المساهمات</span>
                          <div className="text-xl font-black text-slate-800">{profile.cfData?.contribution || 0}</div>
                       </div>
                       <div className="p-6">
                          <span className="text-[8px] font-black text-slate-400 uppercase">المسابقات</span>
                          <div className="text-xl font-black text-orange-600">{profile.cfData?.contestCount || 0}</div>
                       </div>
                       <div className="p-6">
                          <span className="text-[8px] font-black text-slate-400 uppercase">المتابعون</span>
                          <div className="text-xl font-black text-slate-800">{profile.cfData?.friendOfCount || 0}</div>
                       </div>
                    </div>
                  </CardContent>
               </Card>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-sm border bg-white shadow-none">
                   <CardHeader className="bg-slate-50/50 border-b py-3"><CardTitle className="text-xs font-black flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> توزيع المهارات</CardTitle></CardHeader>
                   <CardContent className="p-6 h-[250px]">
                      {skillsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                           <RadarChart data={skillsData}><PolarGrid stroke="#f1f5f9" /><PolarAngleAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} /><Radar name="Solved" dataKey="value" stroke="#1e40af" fill="#1e40af" fillOpacity={0.5} /></RadarChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-bold italic">لا توجد بيانات.</div>}
                   </CardContent>
                </Card>

                <Card className="rounded-sm border bg-white shadow-none">
                   <CardHeader className="bg-slate-50/50 border-b py-3"><CardTitle className="text-xs font-black flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600" /> إنجاز المنهج</CardTitle></CardHeader>
                   <CardContent className="p-8 flex flex-col items-center justify-center gap-4">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                         <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * (progressStats.completed / (progressStats.total || 1)))} className="text-emerald-500 transition-all duration-1000" strokeLinecap="round" />
                         </svg>
                         <div className="absolute flex flex-col items-center"><span className="text-2xl font-black text-slate-800">{Math.round((progressStats.completed / (progressStats.total || 1)) * 100)}%</span></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500">تم إكمال {progressStats.completed} من أصل {progressStats.total} درساً</p>
                   </CardContent>
                </Card>
             </div>

             <Card className="rounded-sm border bg-white shadow-none">
                <CardHeader className="bg-slate-50/50 border-b py-3"><CardTitle className="text-xs font-black flex items-center gap-2"><History className="w-4 h-4 text-primary" /> آخر الحلول</CardTitle></CardHeader>
                <CardContent className="p-0">
                   <div className="divide-y">
                      {solvedList.map((prob) => (
                        <Link key={prob.id} href={`/problems/${prob.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                           <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-sm bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><CheckCircle2 className="w-4 h-4" /></div><div className="flex flex-col"><span className="text-sm font-black text-slate-800">{prob.title}</span><span className="text-[10px] font-bold text-slate-400">{prob.category}</span></div></div>
                           <Badge variant="outline" className="text-[10px] font-mono bg-white">#{prob.rating || 0}</Badge>
                        </Link>
                      ))}
                      {solvedList.length === 0 && <div className="p-10 text-center text-slate-400 font-bold italic text-xs">لا يوجد نشاط مسجل.</div>}
                   </div>
                </CardContent>
             </Card>
          </div>

          <div className="lg:col-span-4 space-y-8">
             <Card className="rounded-sm border bg-white shadow-none">
                <CardHeader className="border-b bg-slate-50 py-3"><CardTitle className="text-xs font-black">أوسمة الإنجاز</CardTitle></CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 gap-3">
                   {profile?.badges?.map((badgeId: string) => {
                     const b = BADGE_DEFINITIONS[badgeId];
                     if (!b) return null;
                     return (
                       <div key={badgeId} className="flex items-start gap-3 p-3 border rounded-sm bg-slate-50 animate-in fade-in">
                          <div className={cn("p-2 rounded-sm bg-white border shrink-0", b.color)}><b.icon className="w-4 h-4" /></div>
                          <div className="flex flex-col gap-1"><span className="text-[11px] font-black text-slate-700">{b.title}</span><span className="text-[9px] text-slate-400 font-bold leading-tight">{b.description}</span></div>
                       </div>
                     );
                   })}
                   {(!profile?.badges || profile.badges.length === 0) && <div className="text-center py-6 text-slate-300 text-[10px] font-black italic">لا توجد أوسمة محققة.</div>}
                </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
