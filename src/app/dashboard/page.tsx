'use client';

import { useEffect, useState } from "react";
import { useAdmin, useFirebase, useMaintenanceMode } from "@/firebase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Loader2, 
  LayoutDashboard,
  ShieldCheck,
  Wrench,
  Activity,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Database,
  PieChart,
  Settings2,
  Image as ImageIcon,
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ref, get, update as updateRtdb, set as setRtdb } from "firebase/database";
import { collection, getDocs, updateDoc, getCountFromServer, query, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { isAdmin, isProblemSetter, loading } = useAdmin();
  const { isMaintenance, loading: mLoading } = useMaintenanceMode();
  const { db, rtdb } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    totalProblems: 0, 
    usersByCountry: [] as any[],
    healthPercent: 0,
    totalGlobalSolved: 0,
    avgSolvedPerUser: 0,
    engagedUsersCount: 0
  });
  
  const [isFixing, setIsFixing] = useState(false);
  const [fixReport, setFixReport] = useState<string[] | null>(null);
  
  const [heroBgUrlInput, setHeroBgUrlInput] = useState<string>("");
  const [savingHeroBg, setSavingHeroBg] = useState<boolean>(false);

  useEffect(() => {
    if (!rtdb) return;
    get(ref(rtdb, 'settings/heroBgUrl')).then((snap) => {
      if (snap.exists() && snap.val()) {
        setHeroBgUrlInput(snap.val());
      } else {
        setHeroBgUrlInput("https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=2070&auto=format&fit=crop");
      }
    });
  }, [rtdb]);

  const handleSaveHeroBg = async () => {
    if (!rtdb || !isAdmin) return;
    setSavingHeroBg(true);
    try {
      await setRtdb(ref(rtdb, 'settings/heroBgUrl'), heroBgUrlInput);
      toast({ title: "تم تحديث صورة خلفية الواجهة الرئيسية بنجاح" });
    } catch (e) {
      console.error("Error saving hero bg:", e);
      toast({ variant: "destructive", title: "فشل حفظ رابط الصورة" });
    } finally {
      setSavingHeroBg(false);
    }
  };

  useEffect(() => {
    if (!loading && !isAdmin && !isProblemSetter) {
      router.push("/");
    }
  }, [isAdmin, isProblemSetter, loading, router]);

  const fetchData = async () => {
    if (!db) return;
    try {
      const usersCount = await getCountFromServer(collection(db, 'users'));
      const problemsCount = await getCountFromServer(collection(db, 'problems'));
      const totalUsers = usersCount.data().count;
      const totalProblems = problemsCount.data().count;

      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
      
      let totalSolved = 0;
      let engagedUsers = 0;
      const countryData: Record<string, number> = {};

      usersSnap.docs.forEach(d => {
        const data = d.data();
        totalSolved += (data.solved || 0);
        if ((data.xp || 0) > 0) engagedUsers++;
        const c = data.country || "Unknown";
        countryData[c] = (countryData[c] || 0) + 1;
      });

      setStats({
        totalUsers,
        totalProblems,
        usersByCountry: Object.entries(countryData).map(([name, value]) => ({ name, value })),
        healthPercent: totalUsers > 0 ? Math.round((engagedUsers / usersSnap.docs.length) * 100) : 0,
        totalGlobalSolved: totalSolved,
        avgSolvedPerUser: totalUsers > 0 ? parseFloat((totalSolved / totalUsers).toFixed(1)) : 0,
        engagedUsersCount: engagedUsers
      });
    } catch (e) { console.error("Fetch Error:", e); }
  };

  const handleToggleMaintenance = async (checked: boolean) => {
    if (!rtdb || !isAdmin) return;
    try {
      await setRtdb(ref(rtdb, 'settings/maintenanceMode'), checked);
      toast({ title: checked ? "تم تفعيل وضع الصيانة 🛠️" : "تم إيقاف وضع الصيانة" });
    } catch (e) {
      console.error("Error toggling maintenance mode:", e);
      toast({ variant: "destructive", title: "فشل تحديث الحالة" });
    }
  };

  const handleGeneralFix = async () => {
    if (!db || !rtdb) return;
    setIsFixing(true);
    setFixReport(null);
    const report: string[] = [];

    try {
      report.push("[1/3] فحص هيكلية المنهج ومعالجة التداخل...");
      const roadmapSnap = await get(ref(rtdb, 'roadmap'));
      const stages = roadmapSnap.val() || {};
      
      report.push("[2/3] هجرة بيانات تقدم الطلاب للمفتاح المركب...");
      const usersRtdbSnap = await get(ref(rtdb, 'users'));
      const allUsers = usersRtdbSnap.val() || {};
      
      for (const [uUid, uData] of Object.entries(allUsers) as any) {
        const progress = uData.progress?.lessons || {};
        const updates: any = {};
        let migratedCount = 0;

        for (const [lId, val] of Object.entries(progress)) {
          if (!lId.includes('_')) {
            for (const [sId, sData] of Object.entries(stages) as any) {
              if (sData.lessons && sData.lessons[lId]) {
                updates[`users/${uUid}/progress/lessons/${sId}_${lId}`] = true;
                migratedCount++;
              }
            }
          }
        }
        if (migratedCount > 0) {
          await updateRtdb(ref(rtdb), updates);
          report.push(`- المبرمج ${uData.username}: تمت هجرة ${migratedCount} دروس للنمط الجديد.`);
        }
      }

      report.push("[3/3] فحص ملفات Firestore...");
      const usersFirestore = await getDocs(query(collection(db, 'users'), limit(50)));
      for (const uDoc of usersFirestore.docs) {
        const d = uDoc.data();
        if (d.xp === undefined || d.solved === undefined) {
          await updateDoc(uDoc.ref, { xp: d.xp || 0, solved: d.solved || 0 });
        }
      }

      report.push("✅ اكتمل التدقيق: تم فصل معرفات الدروس وتأمين التقدم من التداخل.");
      setFixReport(report);
      toast({ title: "اكتمل التدقيق العام بنجاح ✨" });
      fetchData();
    } catch (e) {
      console.error("General fix error:", e);
      toast({ variant: "destructive", title: "فشل محرك الإصلاح" });
    }
    finally { setIsFixing(false); }
  };

  useEffect(() => { fetchData(); }, [db]);

  const COLORS = ['#1e40af', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
  const pieData = [{ name: 'Engaged', value: stats.healthPercent }, { name: 'Inactive', value: 100 - stats.healthPercent }];

  if (loading || mLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 p-4 max-w-7xl mx-auto text-right" dir="rtl">
      {/* Main Header / Maintenance Bar */}
      <div className="bg-white p-8 border rounded-sm shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-black flex items-center gap-3">مركز العمليات <LayoutDashboard className="w-6 h-6 text-primary" /></h1>
            <p className="text-slate-400 text-xs font-bold">إدارة النظام ومتابعة هجرة البيانات وحماية الدروس من التداخل.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-50 p-3 px-4 rounded-sm border border-slate-100">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase">وضع الصيانة</span>
                  <span className={cn("text-[9px] font-bold", isMaintenance ? "text-orange-600" : "text-emerald-600")}>{isMaintenance ? "مفعل (الموقع مقفل للعامة)" : "غير مفعل (الموقع مفتوح)"}</span>
               </div>
               <Switch checked={isMaintenance} onCheckedChange={handleToggleMaintenance} />
            </div>
            
            <Button onClick={handleGeneralFix} disabled={isFixing} variant="outline" className="h-12 px-8 font-black border-2 gap-2 hover:bg-slate-50">
               {isFixing ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />} إصلاح وهجرة البيانات
            </Button>
          </div>
        </div>
      </div>

      {fixReport && (
        <Card className="border-2 border-emerald-100 bg-emerald-50/30 overflow-hidden">
           <CardHeader className="bg-emerald-50 border-b py-3 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-emerald-700 flex items-center gap-2"><Activity className="w-4 h-4" /> تقرير التدقيق والهجرة</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setFixReport(null)} className="h-6 w-6 p-0"><CheckCircle2 className="w-4 h-4" /></Button>
           </CardHeader>
           <CardContent className="p-6">
              <div className="font-code text-[10px] text-emerald-800 space-y-1.5">{fixReport.map((line, i) => <div key={i}>{line}</div>)}</div>
           </CardContent>
        </Card>
      )}

      {/* Main Page Background Settings Card */}
      <Card className="rounded-sm bg-white border">
        <CardHeader className="border-b py-4 bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-slate-700">
            <ImageIcon className="w-4 h-4 text-[#8b2626]" /> خلفية الواجهة الرئيسية (الطابع الرسمي)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            يمكنك تغيير رابط الصورة الخلفية للواجهة الرئيسية لتظهر بطابع حكومي ورسمي فخم. ادخل رابط الصورة مباشرة أدناه:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="url"
              value={heroBgUrlInput}
              onChange={(e) => setHeroBgUrlInput(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="flex-1 text-xs font-mono"
              dir="ltr"
            />
            <Button 
              onClick={handleSaveHeroBg} 
              disabled={savingHeroBg}
              className="bg-[#8b2626] hover:bg-[#731b1b] text-white font-bold h-10 px-6 text-xs gap-2 shrink-0"
            >
              {savingHeroBg ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} حفظ الخلفية
            </Button>
          </div>

          {heroBgUrlInput && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-400">معاينة الصورة الحالية:</span>
              <div className="h-28 w-full rounded-sm border overflow-hidden relative bg-slate-100">
                <img src={heroBgUrlInput} alt="Hero Background Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-black/70 px-3 py-1 rounded-sm border border-white/20">معاينة التراكب للواجهة الرئيسية</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
            <span className="text-[11px] font-bold text-slate-400">نماذج صور حكومية ورسمية جاهزة:</span>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="text-[11px] h-7 px-2.5"
              onClick={() => setHeroBgUrlInput("https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=2070&auto=format&fit=crop")}
            >
              صرح حكومي عريق
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="text-[11px] h-7 px-2.5"
              onClick={() => setHeroBgUrlInput("https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2000&auto=format&fit=crop")}
            >
              مكتبة حكومية فخمة
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="text-[11px] h-7 px-2.5"
              onClick={() => setHeroBgUrlInput("https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2000&auto=format&fit=crop")}
            >
              مبنى معمار كلاسيكي
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-sm bg-white border"><CardContent className="p-8 text-center space-y-2"><div className="p-3 bg-blue-50 w-fit mx-auto rounded-sm border border-blue-100"><Users className="w-6 h-6 text-blue-600" /></div><div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">المبرمجون</p><p className="text-4xl font-black">{stats.totalUsers}</p></div></CardContent></Card>
        <Card className="rounded-sm bg-white border"><CardContent className="p-8 text-center space-y-2"><div className="p-3 bg-emerald-50 w-fit mx-auto rounded-sm border border-emerald-100"><Database className="w-6 h-6 text-emerald-600" /></div><div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">المسائل</p><p className="text-4xl font-black">{stats.totalProblems}</p></div></CardContent></Card>
        <Card className="rounded-sm bg-white border"><CardContent className="p-8 text-center space-y-2"><div className="p-3 bg-orange-50 w-fit mx-auto rounded-sm border border-orange-100"><Activity className="w-6 h-6 text-orange-600" /></div><div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">صحة المنصة</p><p className="text-4xl font-black">{stats.healthPercent}%</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="rounded-sm bg-white border">
            <CardHeader className="border-b py-4 bg-slate-50/50"><CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-slate-500"><BarChart3 className="w-4 h-4" /> توزيع المبرمجين حسب الدولة</CardTitle></CardHeader>
            <CardContent className="p-6 h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.usersByCountry}><XAxis dataKey="name" tick={{fontSize: 10}} /><YAxis /><Tooltip /><Bar dataKey="value">{stats.usersByCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>
         <Card className="rounded-sm bg-white border">
            <CardHeader className="border-b py-4 bg-slate-50/50"><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">مؤشر الإنجاز العام</CardTitle></CardHeader>
            <CardContent className="p-8 flex flex-col items-center justify-center gap-6">
               <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                     <RePieChart><Pie data={pieData} innerRadius={50} outerRadius={70} dataKey="value"><Cell fill="#10b981" /><Cell fill="#f1f5f9" /></Pie></RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black">{stats.healthPercent}%</span></div>
               </div>
               <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="p-3 bg-slate-50 border text-center rounded-sm"><span className="block text-[10px] font-black uppercase text-slate-400">إجمالي الحلول</span><span className="font-black text-emerald-600 text-lg">{stats.totalGlobalSolved}</span></div>
                  <div className="p-3 bg-slate-50 border text-center rounded-sm"><span className="block text-[10px] font-black uppercase text-slate-400">متوسط الإنجاز</span><span className="font-black text-blue-600 text-lg">{stats.avgSolvedPerUser}</span></div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
