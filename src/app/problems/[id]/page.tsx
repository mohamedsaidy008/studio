'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirebase, useUser } from "@/firebase";
import { ref, onValue } from "firebase/database";
import { doc, onSnapshot } from "firebase/firestore";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  Activity, 
  ScrollText, 
  ExternalLink, 
  Play, 
  Loader2, 
  Trophy,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function ProblemDetailPage() {
  const { id } = useParams();
  const { db, rtdb } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  
  const [problem, setProblem] = useState<any>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !db || !rtdb) return;

    // جلب المسألة من Firestore
    const probRef = doc(db, "problems", id as string);
    const unsubProb = onSnapshot(probRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProblem({ id: docSnap.id, ...data });
        document.title = data.title || (id as string);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore sync error:", err);
      setLoading(false);
    });

    // جلب تقدم المستخدم من Realtime Database
    let unsubProgress = () => {};
    if (user) {
      const progressRef = ref(rtdb, `users/${user.uid}/solvedProblems/${id}`);
      unsubProgress = onValue(progressRef, (snapshot) => {
        setIsSolved(!!snapshot.val());
      }, (err) => {
        console.error("Progress sync error:", err);
      });
    }

    return () => {
      unsubProb();
      unsubProgress();
    };
  }, [id, db, rtdb, user]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;
  if (!problem) return <div className="flex h-screen items-center justify-center bg-white font-bold text-slate-400">المسألة غير موجودة أو تم حذفها.</div>;

  return (
    <div className="flex min-h-screen bg-background text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black">{problem.title}</h1>
                {isSolved && <Badge className="bg-emerald-500 gap-1"><CheckCircle2 className="w-3 h-3" /> تم الحل</Badge>}
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{problem.category}</Badge>
                <Badge variant="outline" className={
                  problem.difficulty === 'Hard' ? 'text-destructive border-destructive/20' : 
                  problem.difficulty === 'Medium' ? 'text-orange-500 border-orange-500/20' : 
                  'text-accent border-accent/20'
                }>{problem.difficulty}</Badge>
              </div>
            </div>
            
            <Link href={`/problems/${id}/solve`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 px-10 rounded-sm font-black h-16 shadow-xl gap-2 text-xl">
                <Play className="w-6 h-6" /> محاولة الحل الآن
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 shadow-none border rounded-md overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ScrollText className="w-6 h-6 text-primary" /> وصف المسألة
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed text-lg text-slate-700 font-medium">{problem.statement}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                  <div className="space-y-2">
                    <h4 className="font-black text-slate-900 border-r-4 border-primary pr-3">تنسيق الإدخال</h4>
                    <p className="text-sm bg-slate-50 p-4 rounded-sm italic border text-slate-600 leading-loose">{problem.inputFormat}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-black text-slate-900 border-r-4 border-emerald-600 pr-3">تنسيق الإخراج</h4>
                    <p className="text-sm bg-emerald-50/30 p-4 rounded-sm italic border border-emerald-100 text-slate-600 leading-loose">{problem.outputFormat}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h4 className="font-black text-lg text-slate-900">أمثلة تجريبية (Test Cases)</h4>
                  {problem.examples?.map((ex: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-md border">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input</span>
                        <pre className="p-4 bg-slate-900 text-emerald-400 rounded-sm font-code text-xs overflow-x-auto shadow-inner" dir="ltr">{ex.input}</pre>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Output</span>
                        <pre className="p-4 bg-slate-900 text-blue-400 rounded-sm font-code text-xs overflow-x-auto shadow-inner" dir="ltr">{ex.output}</pre>
                      </div>
                      {ex.explanation && (
                        <div className="col-span-full pt-2 text-xs text-slate-500 font-bold italic">
                          <span className="font-black text-slate-700">توضيح:</span> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-md border shadow-none bg-white">
                <CardHeader className="bg-slate-50/50 border-b py-3"><CardTitle className="text-sm font-black uppercase">القيود التقنية</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-sm">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-500"><Clock className="w-4 h-4 text-primary" /> حد الوقت</div>
                    <span className="font-black text-slate-800 text-sm">{problem.timeLimit || "1.0s"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-sm">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-500"><Activity className="w-4 h-4 text-blue-500" /> حد الذاكرة</div>
                    <span className="font-black text-slate-800 text-sm">{problem.memoryLimit || "256MB"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-sm text-primary border border-primary/10">
                    <div className="flex items-center gap-2 text-xs font-black"><Trophy className="w-4 h-4" /> نقاط الإنجاز</div>
                    <span className="font-black text-sm">100 XP</span>
                  </div>
                </CardContent>
              </Card>

              {problem.sourceUrl && (
                <Card className="rounded-md border shadow-none bg-white">
                  <CardContent className="pt-6">
                    <a href={problem.sourceUrl} target="_blank" className="flex items-center justify-center gap-2 text-xs font-black text-slate-500 hover:text-primary transition-colors">
                      <ExternalLink className="w-4 h-4" /> عرض في Codeforces الأصلي
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
