'use client';

import { useState, useEffect } from "react";
import { useFirebase, useUser, useAdmin } from "@/firebase";
import { ref, onValue } from "firebase/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Map, 
  Loader2, 
  Target, 
  CheckCircle2, 
  FileText, 
  Video, 
  ChevronDown, 
  ChevronUp, 
  CircleDashed,
  ArrowLeft
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const { rtdb } = useFirebase();
  const { user, loading: authLoading } = useUser();
  const { isProblemSetter } = useAdmin();
  const router = useRouter();
  
  const [stages, setStages] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = "المنهج";
  }, []);

  useEffect(() => {
    if (authLoading || !user || !rtdb) return;
    
    const roadmapRef = ref(rtdb, 'roadmap');
    onValue(roadmapRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list = Object.entries(val)
          .filter(([_, stage]: any) => stage !== null)
          .map(([id, stage]: [string, any]) => ({ id, ...stage }));
        
        const sorted = list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setStages(sorted);
        // تم إلغاء فتح الوحدة الأولى تلقائياً لضمان بداية نظيفة
      } else {
        setStages([]);
      }
    });

    const progressRef = ref(rtdb, `users/${user.uid}/progress/lessons`);
    onValue(progressRef, (snapshot) => {
      setUserProgress(snapshot.val() || {});
      setLoading(false);
    });
  }, [rtdb, user, authLoading]);

  // تحديث دالة التبديل لإغلاق أي مرحلة مفتوحة أخرى عند فتح مرحلة جديدة
  const toggleStage = (id: string) => {
    setOpenStages(prev => {
      const isCurrentlyOpen = !!prev[id];
      // إذا كانت مفتوحة نغلقها، وإذا كانت مغلقة نفتحها ونغلق كافة الأخريات
      return isCurrentlyOpen ? {} : { [id]: true };
    });
  };

  if (loading || authLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-4 lg:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-10">
          
          <div className="bg-white p-10 border-2 rounded-sm shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="p-5 bg-primary/5 rounded-sm text-primary border border-primary/10">
                <Map className="w-14 h-14" />
              </div>
              <div className="space-y-2 text-center md:text-right">
                <h1 className="text-3xl font-black text-slate-900">خارطة الطريق</h1>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {stages.map((stage, idx) => {
              const lessonsEntries = stage.lessons 
                ? Object.entries(stage.lessons).filter(([_, l]: any) => l !== null && (isProblemSetter || !l.isDraft)) 
                : [];
              
              const completedCount = lessonsEntries.filter(([lid, _]) => userProgress[`${stage.id}_${lid}`]).length;
              const totalCount = lessonsEntries.length;
              const isOpen = !!openStages[stage.id];
              const isAllDone = totalCount > 0 && completedCount === totalCount;

              return (
                <div key={stage.id} className="group animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <Card className={cn(
                    "rounded-sm border-2 overflow-hidden transition-all duration-300",
                    isOpen ? "shadow-xl border-primary/20 ring-1 ring-primary/5" : "shadow-none border-slate-200 hover:border-slate-300"
                  )}>
                    <button 
                      onClick={() => toggleStage(stage.id)}
                      className={cn(
                        "w-full p-6 sm:p-8 flex items-center justify-between gap-6 transition-colors",
                        isOpen ? "bg-slate-50/80" : "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-6">
                         <div className={cn(
                           "w-14 h-14 rounded-sm border-2 flex flex-col items-center justify-center shrink-0 transition-all",
                           isAllDone ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" : isOpen ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-400"
                         )}>
                           <span className="text-[10px] font-black uppercase leading-none mb-1">الوحدة</span>
                           <span className="text-xl font-black leading-none">{idx + 1}</span>
                         </div>
                         
                         <div className="text-right space-y-1">
                            <h2 className={cn("text-xl font-black", isOpen ? "text-primary" : "text-slate-700")}>{stage.title}</h2>
                            <div className="flex items-center gap-3">
                               <div className="flex items-center gap-1.5">
                                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                     <div 
                                      className="h-full bg-emerald-500 transition-all duration-500" 
                                      style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                                     />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-400">{completedCount} / {totalCount} مكتمل</span>
                               </div>
                               {isAllDone && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-black text-[9px] h-4 rounded-sm border-emerald-200">مكتملة</Badge>}
                            </div>
                         </div>
                      </div>

                      <div className={cn(
                        "w-10 h-10 rounded-sm border-2 flex items-center justify-center transition-all",
                        isOpen ? "bg-primary border-primary text-white" : "bg-slate-50 border-slate-100 text-slate-300"
                      )}>
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {isOpen && (
                      <CardContent className="p-8 pt-0 border-t bg-white animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 gap-4 pt-8">
                          {lessonsEntries.map(([lid, lesson]: [string, any]) => {
                            const completed = !!userProgress[`${stage.id}_${lid}`];
                            return (
                              <Link 
                                key={lid} 
                                href={lesson.type === 'practice' ? `/problems/${lesson.problemId}` : `/roadmap/lesson/${stage.id}/${lid}`}
                                className={cn(
                                  "p-5 border-2 rounded-sm transition-all flex items-start gap-5 hover:scale-[1.01] active:scale-100",
                                  completed ? "bg-emerald-50/20 border-emerald-100/50" : "bg-white hover:border-primary/20 border-slate-100"
                                )}
                              >
                                <div className={cn(
                                  "w-12 h-12 rounded-sm flex items-center justify-center shrink-0 shadow-sm border-2",
                                  completed ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-400"
                                )}>
                                  {completed ? <CheckCircle2 className="w-6 h-6" /> : lesson.type === 'video' ? <Video className="w-6 h-6" /> : lesson.type === 'practice' ? <Target className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                </div>

                                <div className="flex-1 space-y-1.5">
                                   <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className={cn("text-base font-black leading-tight", completed ? "text-emerald-800" : "text-slate-800")}>
                                        {lesson.name}
                                      </h3>
                                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-slate-50/50 h-4 px-1.5">
                                        {lesson.type === 'video' ? 'VIDEO' : lesson.type === 'practice' ? 'PRACTICE' : 'ARTICLE'}
                                      </Badge>
                                      {lesson.isDraft && <Badge className="bg-orange-500 text-[8px] h-4">DRAFT</Badge>}
                                   </div>
                                   
                                   {lesson.description && (
                                     <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-1 max-w-2xl">
                                       {lesson.description}
                                     </p>
                                   )}
                                </div>

                                <div className="self-center">
                                   <div className={cn(
                                     "w-8 h-8 rounded-sm flex items-center justify-center transition-all",
                                     completed ? "text-emerald-600" : "text-slate-200"
                                   )}>
                                      <ArrowLeft className="w-4 h-4" />
                                   </div>
                                </div>
                              </Link>
                            );
                          })}

                          {lessonsEntries.length === 0 && (
                            <div className="py-16 text-center border-2 border-dashed rounded-sm bg-slate-50">
                               <CircleDashed className="w-12 h-12 text-slate-200 animate-spin-slow mx-auto mb-4" />
                               <p className="text-slate-400 font-black text-sm italic">الوحدة قيد التحضير، سيتم إدراج الدروس قريباً.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              );
            })}

            {stages.length === 0 && (
              <div className="py-32 text-center bg-white border-2 border-dashed rounded-sm">
                 <Map className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                 <h2 className="text-xl font-black text-slate-400">خارطة الطريق قيد التحديث</h2>
                 <p className="text-slate-300 font-bold text-sm">سيقوم فريق المنصة بإدراج المنهج الجديد خلال الساعات القادمة.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
