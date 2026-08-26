'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirebase, useUser } from "@/firebase";
import { ref, update, increment, get, onValue, off } from "firebase/database";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  Lock, 
  Unlock,
  AlertCircle,
  ExternalLink,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getUserStatus } from "@/app/actions/codeforces";

const MAX_CODE_LENGTH = 64000;

export default function SolveProblemPage() {
  const { id } = useParams();
  const { db, rtdb } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [cfHandle, setCfHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user || !db || !rtdb) return;

    const fetchUserData = async () => {
      try {
        const snap = await get(ref(rtdb, `users/${user.uid}`));
        const data = snap.val();
        if (!data?.cfHandle) {
          toast({ variant: "outline", title: "ملاحظة", description: "يفضل ربط حساب كودفورسز في الإعدادات لتتمكن من مزامنة حلولك." });
        } else {
          setCfHandle(data.cfHandle);
        }
      } catch (e) {
        console.error("User data fetch failed:", e);
      }
    };

    fetchUserData();

    const probRef = doc(db, "problems", id as string);
    const unsubProb = onSnapshot(probRef, (docSnap) => {
      if (docSnap.exists()) setProblem({ id: docSnap.id, ...docSnap.data() });
      setLoading(false);
    }, (err) => console.error("Problem sync error:", err));

    const progressRef = ref(rtdb, `users/${user.uid}/solvedProblems/${id}`);
    onValue(progressRef, (snapshot) => {
      setIsSolved(!!snapshot.val());
    }, (err) => console.error("Progress sync error:", err));

    return () => {
      unsubProb();
      off(progressRef);
    };
  }, [id, db, rtdb, user, toast]);

  const getSubmitUrl = (url: string) => {
    if (!url) return "";
    const cleanUrl = url.replace(/\/$/, "");
    
    // دعم روابط المجموعات والمسابقات العامة بشكل ديناميكي
    if (cleanUrl.includes("/problemset/problem/")) {
      const parts = cleanUrl.split("/");
      const index = parts.pop();
      const contestId = parts.pop();
      return `https://codeforces.com/problemset/submit?contestId=${contestId}&problemIndex=${index}`;
    } else if (cleanUrl.includes("/problem/")) {
      // يقوم بتحويل أي رابط ينتهي بـ /problem/X إلى /submit
      return cleanUrl.substring(0, cleanUrl.lastIndexOf("/problem/")) + "/submit";
    }
    return cleanUrl;
  };

  const handleVerifyViaCodeforces = async () => {
    if (!cfHandle || isVerifying || !problem?.sourceUrl) {
      if (!cfHandle) toast({ variant: "destructive", title: "الهاندل غير موجود", description: "يرجى إضافة حساب كودفورسز في الإعدادات أولاً." });
      return;
    }
    
    setIsVerifying(true);
    setConsoleOutput(prev => [...prev, `[System] البدء في التحقق للحساب: ${cfHandle}...`]);

    try {
      const url = problem.sourceUrl.replace(/\/$/, "");
      const parts = url.split('/');
      let problemIndex = "";
      let contestId = "";

      if (url.includes("problemset/problem")) {
        problemIndex = parts[parts.length - 1];
        contestId = parts[parts.length - 2];
      } else if (url.includes("contest/")) {
        // يعمل مع الروابط العامة وروابط المجموعات
        problemIndex = parts[parts.length - 1]; // الحرف مثل A
        contestId = parts[parts.length - 3];    // الرقم مثل 429548
      }

      const data = await getUserStatus(cfHandle);

      if (data.status === 'OK') {
        const solvedSub = data.result.find((sub: any) => 
          sub.problem.index.toString().toUpperCase() === problemIndex.toUpperCase() && 
          sub.problem.contestId.toString() === contestId.toString() &&
          sub.verdict === 'OK'
        );

        if (solvedSub) {
          if (!isSolved) {
            const today = new Date().toISOString().split('T')[0];
            const updates: Record<string, any> = {};
            updates[`users/${user!.uid}/solvedProblems/${id}`] = true;
            updates[`users/${user!.uid}/solved`] = increment(1);
            updates[`users/${user!.uid}/xp`] = increment(100);
            updates[`users/${user!.uid}/activity/${today}`] = increment(1);
            updates[`users/${user!.uid}/lastActivity`] = new Date().toISOString();
            
            if (code.trim()) {
              updates[`users/${user!.uid}/codeVault/${id}`] = { code, timestamp: Date.now() };
            }

            await update(ref(rtdb!), updates);
            await updateDoc(doc(db!, `users/${user!.uid}`), {
              xp: increment(100),
              solved: increment(1),
              lastActivity: new Date().toISOString()
            });

            setConsoleOutput(prev => [...prev, "[Verdict] ACCEPTED - تم توثيق الإنجاز بنجاح ✨"]);
            toast({ title: "تم قبول الحل ومزامنة النقاط! ✨" });
          } else {
            setConsoleOutput(prev => [...prev, "[Verdict] ALREADY SOLVED - المسألة محلولة سابقاً."]);
          }
        } else {
          setConsoleOutput(prev => [...prev, "[Verdict] REJECTED - لم نجد حلاً مقبولاً (OK) في كودفورسز لهذه المسألة."]);
          toast({ variant: "destructive", title: "حل غير موجود", description: "تأكد من إرسال حلك في كودفورسز وحصولك على OK." });
        }
      } else throw new Error(data.comment || "API Error");
    } catch (e) {
      console.error("CF verification error:", e);
      setConsoleOutput(prev => [...prev, "[Error] فشل الاتصال بخادم كودفورسز."]);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

  const submitUrl = getSubmitUrl(problem?.sourceUrl);

  return (
    <div className="flex min-h-screen bg-white text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="h-14 border-b px-6 flex items-center justify-between bg-white z-30 shrink-0">
          <div className="flex items-center gap-4">
            <Link href={`/problems/${id}`}><Button variant="ghost" size="sm" className="h-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <h2 className="font-black text-lg truncate max-w-[200px] md:max-w-md">{problem?.title}</h2>
            {isSolved && <Badge className="bg-emerald-600 rounded-sm">ACCEPTED</Badge>}
          </div>
          <Button onClick={handleVerifyViaCodeforces} disabled={isVerifying} className="bg-primary hover:bg-primary/90 font-black rounded-sm h-10 px-8 gap-2">
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} 
            مزامنة الإنجاز
          </Button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          <div className="flex flex-col bg-slate-900">
            <div className="flex-1 relative overflow-hidden">
               <div className="h-8 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between">
                 <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-widest">Code Vault (C++)</span>
                 <span className="text-[9px] text-slate-500 font-bold">{code.length}/{MAX_CODE_LENGTH} bytes</span>
               </div>
               <Textarea 
                className="w-full h-full p-6 font-code text-sm border-0 bg-transparent text-slate-100 resize-none focus-visible:ring-0 overflow-y-auto" 
                placeholder="// الصق كود الحل هنا للرجوع إليه لاحقاً..." 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                dir="ltr" 
                spellCheck={false}
               />
            </div>
            <div className="h-32 bg-slate-950 p-4 font-code text-[11px] text-emerald-500 overflow-y-auto border-t border-slate-800" dir="ltr">
              <div className="flex items-center gap-2 mb-2 text-slate-600"><Terminal className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-tighter">Sync Terminal</span></div>
              <div className="space-y-1">{consoleOutput.map((line, i) => <div key={i}>{line}</div>)}</div>
            </div>
          </div>

          <div className="bg-white flex flex-col border-r overflow-y-auto">
            <Tabs defaultValue="info" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b bg-slate-50 h-12 px-4 shrink-0">
                <TabsTrigger value="info" className="font-black text-[10px] h-full px-6 data-[state=active]:bg-white rounded-none border-x">دليل الحل والمزامنة</TabsTrigger>
                <TabsTrigger value="solution" className="font-black text-[10px] h-full px-6 data-[state=active]:bg-white rounded-none border-x">الحل النموذجي</TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-y-auto">
                <TabsContent value="info" className="p-8 mt-0 space-y-8">
                    <div className="space-y-4">
                        <h3 className="font-black text-lg text-slate-900 border-r-4 border-primary pr-3">الخطوة الأولى: إرسال الحل</h3>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed">قم بزيارة صفحة التسليم الرسمية في كودفورسز (عبر المجموعة أو المسابقة) وأرسل حلك هناك.</p>
                        <a href={submitUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <Button className="w-full h-14 bg-slate-900 hover:bg-black font-black gap-2 shadow-lg rounded-sm">
                            <ExternalLink className="w-5 h-5" /> صفحة التسليم في Codeforces
                          </Button>
                        </a>
                    </div>

                    <div className="space-y-4 pt-8 border-t">
                        <h3 className="font-black text-lg text-slate-900 border-r-4 border-emerald-600 pr-3">الخطوة الثانية: المزامنة</h3>
                        <div className="bg-slate-50 p-6 rounded-sm border-2 border-dashed space-y-4 text-xs font-bold text-slate-600 leading-loose">
                           <p>1. بعد الحصول على <span className="text-emerald-600">Accepted (OK)</span> هناك.</p>
                           <p>2. ارجع هنا واضغط زر <span className="text-primary">"مزامنة الإنجاز"</span> في الأعلى.</p>
                           <p>3. سيتم توثيق نقاطك وفتح الحل النموذجي لك تلقائياً.</p>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="solution" className="p-8 mt-0">
                   {isSolved ? (
                     <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2"><Unlock className="w-5 h-5" /><h3 className="font-black text-sm">الحل النموذجي المعتمد</h3></div>
                        <div className="bg-slate-900 p-6 rounded-sm border-2 border-emerald-500/20 shadow-xl overflow-x-auto">
                           <pre className="font-code text-sm text-slate-100" dir="ltr">{problem?.hints?.solution || "// لم يتم إدراج كود الحل بعد."}</pre>
                        </div>
                     </div>
                   ) : (
                     <div className="p-12 border-2 border-dashed rounded-sm text-center space-y-4 bg-slate-50/50">
                        <Lock className="w-10 h-10 text-slate-200 mx-auto" />
                        <h3 className="font-black text-slate-400 text-sm">الحل النموذجي مقفل</h3>
                        <p className="text-xs text-slate-400 font-bold">يفتح هذا القسم فقط بمجرد نجاحك في مزامنة حلك الصحيح.</p>
                     </div>
                   )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
