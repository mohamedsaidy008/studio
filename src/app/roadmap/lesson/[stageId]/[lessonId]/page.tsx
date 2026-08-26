'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirebase, useUser, useAdmin } from "@/firebase";
import { ref, onValue, update as updateRtdb, increment as incrementRtdb } from "firebase/database";
import { doc, updateDoc, increment as incrementFirestore } from "firebase/firestore";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Target, 
  Info, 
  HelpCircle,
  AlertCircle,
  FileText,
  Sparkles,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LessonDetailPage() {
  const { stageId, lessonId } = useParams();
  const { rtdb, db } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<any>(null);
  const [stage, setStage] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResults, setQuizResults] = useState<Record<number, boolean>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [isQuizPassed, setIsQuizPassed] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (!stageId || !lessonId || !user || !rtdb) return;
    
    const stageRef = ref(rtdb, `roadmap/${stageId}`);
    onValue(stageRef, (snapshot) => {
      if (snapshot.exists()) {
        const stageData = snapshot.val();
        setStage(stageData);
        if (stageData.lessons && stageData.lessons[lessonId as string]) {
          setLesson(stageData.lessons[lessonId as string]);
        }
      }
    });

    // استخدام المفتاح المركب لمنع التداخل
    onValue(ref(rtdb, `users/${user.uid}/progress/lessons/${stageId}_${lessonId}`), (snapshot) => {
      const done = !!snapshot.val();
      setIsCompleted(done);
      if (done) setIsQuizPassed(true);
      setLoading(false);
    });
  }, [stageId, lessonId, rtdb, user]);

  const handleQuizSubmit = () => {
    if (!lesson.quiz) return;
    const results: Record<number, boolean> = {};
    let passed = true;

    lesson.quiz.forEach((q: any, idx: number) => {
      const isCorrect = quizAnswers[idx] === q.correctIndex;
      results[idx] = isCorrect;
      if (!isCorrect) passed = false;
    });

    setQuizResults(results);
    setShowQuizResults(true);
    setIsQuizPassed(passed);

    if (passed) {
      toast({ title: "إجابة صحيحة ✨" });
      setTimeout(() => {
        document.getElementById('completion-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      toast({ variant: "destructive", title: "بعض الإجابات خاطئة، حاول مجدداً." });
    }
  };

  const markAsCompleted = async () => {
    if (!user || !stageId || !lessonId || !rtdb || !db || !isQuizPassed || isFinishing) return;
    setIsFinishing(true);
    try {
      // تحديث قاعدة بيانات الوقت الفعلي للتقدم بالمفتاح المركب
      const rtdbUpdates: any = {};
      rtdbUpdates[`users/${user.uid}/progress/lessons/${stageId}_${lessonId}`] = true;
      rtdbUpdates[`users/${user.uid}/xp`] = incrementRtdb(20);
      rtdbUpdates[`users/${user.uid}/lastActivity`] = new Date().toISOString();
      await updateRtdb(ref(rtdb), rtdbUpdates);

      // تحديث Firestore للملف الشخصي والترتيب
      const userDocRef = doc(db, `users/${user.uid}`);
      await updateDoc(userDocRef, {
        xp: incrementFirestore(20),
        lastActivity: new Date().toISOString()
      });

      toast({ title: "رائع! تم إكمال الدرس", description: "+20 XP أضيفت لرصيدك" });
      router.push("/roadmap");
    } catch (e) {
      console.error("Error finishing lesson:", e);
      toast({ variant: "destructive", title: "فشل تحديث التقدم" });
      setIsFinishing(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;
  if (!lesson) return <div className="flex h-screen items-center justify-center font-bold text-slate-400">الدرس غير موجود.</div>;

  const videoUrl = getYouTubeEmbedUrl(lesson.videoUrl);
  const hasContent = lesson.textContent && lesson.textContent.trim() !== "";
  const hasQuiz = lesson.quiz && lesson.quiz.length > 0;

  return (
    <div className="flex min-h-screen bg-background text-right font-body" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="container mx-auto max-w-5xl space-y-10 pb-40">
          
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <Link href="/roadmap"><Button variant="ghost" className="gap-2 font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4 ml-2" /> العودة للمنهج</Button></Link>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5 px-3">{stage?.title}</Badge>
                  <Badge className="bg-slate-900 font-black px-3">{lesson.type === 'video' ? 'درس مرئي' : lesson.type === 'text' ? 'درس نصي' : 'تمرين برمجي'}</Badge>
                </div>
             </div>
             <h1 className="text-4xl font-black text-slate-900 leading-tight">{lesson.name}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              
              {lesson.type === 'video' ? (
                <div className="space-y-10">
                  {videoUrl && (
                    <div className="aspect-video rounded-sm overflow-hidden border-2 bg-black shadow-xl ring-1 ring-slate-200">
                      <iframe width="100%" height="100%" src={videoUrl} frameBorder="0" allowFullScreen></iframe>
                    </div>
                  )}
                  {hasContent && (
                    <Card className="rounded-sm p-10 border shadow-sm bg-white">
                      <div className="html-content leading-loose text-lg font-medium text-slate-700" dangerouslySetInnerHTML={{ __html: lesson.textContent }} />
                    </Card>
                  )}
                </div>
              ) : lesson.type === 'text' ? (
                hasContent ? (
                  <Card className="rounded-sm p-10 border shadow-sm bg-white">
                     <div className="html-content leading-loose text-lg font-medium text-slate-700" dangerouslySetInnerHTML={{ __html: lesson.textContent }} />
                  </Card>
                ) : (
                  <Card className="rounded-sm p-20 border-2 border-dashed shadow-none bg-slate-50 flex flex-col items-center justify-center text-center gap-4">
                     <FileText className="w-12 h-12 text-slate-200" />
                     <p className="text-slate-400 font-bold italic">المحتوى التعليمي لهذا الدرس قيد المراجعة والتحضير حالياً.</p>
                  </Card>
                )
              ) : (
                <div className="p-16 bg-slate-50 border-2 border-dashed rounded-sm text-center flex flex-col items-center gap-8">
                  <div className="p-6 bg-white rounded-full shadow-sm border-2"><Target className="w-16 h-16 text-primary" /></div>
                  <div className="space-y-2">
                     <h2 className="text-2xl font-black text-slate-800">هذا الدرس هو تمرين برمجـي</h2>
                     <p className="text-slate-500 font-bold max-w-sm">يجب حل المسألة البرمجية ومزامنة الكود بنجاح ليتم احتساب هذا الدرس كمكتمل.</p>
                  </div>
                  <Link href={`/problems/${lesson.problemId}`}><Button className="bg-primary hover:bg-primary/90 h-16 px-14 font-black text-xl shadow-2xl rounded-sm transition-all active:scale-95">انتقل لحل المسألة في البنك</Button></Link>
                </div>
              )}

              {(lesson.type === 'video' || lesson.type === 'text') && hasQuiz && (
                <section className="pt-12 space-y-10 border-t-2 border-dashed border-slate-200">
                  <div className="flex items-center gap-4 bg-white p-6 border rounded-sm shadow-sm">
                    <div className="p-3 bg-primary/10 rounded-sm text-primary"><HelpCircle className="w-8 h-8" /></div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-900">اختبر استيعابك للمحتوى</h2>
                       <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Academic Comprehension Check</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {lesson.quiz.map((q: any, idx: number) => (
                      <div key={idx} className={cn(
                        "p-8 rounded-sm border-2 bg-white transition-all space-y-6 shadow-sm relative overflow-hidden",
                        showQuizResults && quizResults[idx] === false ? "border-red-200 bg-red-50/20" : "border-slate-100"
                      )}>
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-100" />
                        <h3 className="text-xl font-black flex gap-4 pr-4">
                           <span className="bg-slate-900 text-white w-8 h-8 rounded-sm flex items-center justify-center text-xs shrink-0 font-black">#{idx + 1}</span>
                           {q.question}
                        </h3>
                        <RadioGroup 
                          value={quizAnswers[idx]?.toString()} 
                          onValueChange={(v) => {
                            if(isCompleted) return;
                            setQuizAnswers({ ...quizAnswers, [idx]: parseInt(v) }); 
                            setShowQuizResults(false);
                          }} 
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4 sm:pr-12"
                          disabled={isCompleted}
                        >
                          {q.options.map((opt: string, oIdx: number) => {
                            if (!opt || opt.trim() === "") return null;
                            const isSelected = quizAnswers[idx] === oIdx;
                            return (
                              <div key={oIdx} className={cn(
                                "flex items-center gap-4 p-5 border-2 rounded-sm transition-all cursor-pointer group",
                                isSelected ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-300 bg-white"
                              )}>
                                <RadioGroupItem value={oIdx.toString()} id={`q${idx}-o${oIdx}`} className="border-2 w-5 h-5" />
                                <Label htmlFor={`q${idx}-o${oIdx}`} className="font-bold text-slate-700 cursor-pointer flex-1 py-1 text-base">{opt}</Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                        {showQuizResults && quizResults[idx] === false && (
                          <div className="text-xs font-black text-red-600 flex items-center gap-2 pr-12 animate-bounce">
                             <AlertCircle className="w-4 h-4" /> إجابة غير دقيقة، راجع المحتوى وحاول مرة أخرى.
                          </div>
                        )}
                      </div>
                    ))}

                    <div id="completion-card" className="space-y-6 pt-4">
                       {!isQuizPassed && (
                         <Button onClick={handleQuizSubmit} className="w-full h-20 bg-slate-900 hover:bg-black font-black text-2xl gap-3 shadow-xl rounded-sm transition-all active:scale-[0.98]">
                           <CheckCircle2 className="w-7 h-7" /> فحص الإجابات
                         </Button>
                       )}

                       {isQuizPassed && !isCompleted && (
                         <Card className="p-10 bg-emerald-50 border-2 border-emerald-200 rounded-sm space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-4 -left-4 opacity-5"><Trophy className="w-40 h-40" /></div>
                            <div className="flex items-center gap-4 text-emerald-800 border-b border-emerald-100 pb-6">
                               <div className="p-3 bg-emerald-500 rounded-sm text-white shadow-lg"><Sparkles className="w-10 h-10 animate-pulse" /></div>
                               <div className="space-y-1">
                                  <h3 className="font-black text-2xl">أداء أكاديمي متميز!</h3>
                                  <p className="text-sm font-bold opacity-80 italic">لقد اجتزت اختبار الاستيعاب بنسبة 100%.</p>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <p className="text-xs font-black text-emerald-700 uppercase tracking-widest text-center">الخطوة النهائية لتوثيق الإنجاز</p>
                               <Button 
                                 onClick={markAsCompleted} 
                                 disabled={isFinishing}
                                 className="w-full h-24 bg-emerald-600 hover:bg-emerald-700 font-black text-3xl gap-4 shadow-xl rounded-sm transition-all active:scale-[0.96] border-b-8 border-emerald-800"
                               >
                                  {isFinishing ? <Loader2 className="w-10 h-10 animate-spin" /> : <><CheckCircle2 className="w-10 h-10" /> تأكيد الإكمال وحصد +20 XP</>}
                               </Button>
                            </div>
                         </Card>
                       )}

                       {isCompleted && (
                         <div className="p-10 bg-slate-900 border-2 border-emerald-500/20 rounded-sm text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20 text-emerald-500 shadow-inner">
                               <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                               <h3 className="text-white font-black text-2xl">تم إكمال هذا الدرس بنجاح</h3>
                               <p className="text-slate-400 font-bold text-sm">الإنجاز موثق في ملفك الشخصي (+20 XP محققة).</p>
                            </div>
                            <Link href="/roadmap" className="inline-block pt-4">
                               <Button variant="outline" className="h-12 border-slate-700 text-slate-300 hover:bg-slate-800 font-black px-10 gap-3 rounded-sm transition-all">
                                  <ArrowLeft className="w-4 h-4 ml-1" /> العودة لخارطة الطريق
                               </Button>
                            </Link>
                         </div>
                       )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-8">
              <Card className="rounded-sm border-2 border-slate-100 bg-white shadow-none sticky top-8">
                <CardHeader className="border-b bg-slate-50/50 py-4"><CardTitle className="text-xs font-black flex items-center gap-2 text-slate-500"><Info className="w-4 h-4" /> تفاصيل الوحدة والدرس</CardTitle></CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="space-y-4">
                     <p className="text-sm text-slate-600 leading-relaxed font-bold border-r-4 border-slate-200 pr-3">{lesson.description || "تابع المحتوى بتركيز لضمان الاستيعاب الكامل."}</p>
                     <div className="p-4 bg-slate-50 border rounded-sm space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase"><span>نقاط الخبرة</span><span className="text-primary">+20 XP</span></div>
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase"><span>طريقة التقييم</span><span>{hasQuiz ? 'اختبار ذكي' : 'مزامنة كود'}</span></div>
                     </div>
                  </div>

                  <div className="pt-8 border-t space-y-4">
                    {isCompleted ? (
                      <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-sm text-center space-y-3 animate-in fade-in duration-500">
                         <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                         <span className="block font-black text-emerald-700 text-sm">لقد أتممت هذا الدرس بنجاح! ✨</span>
                      </div>
                    ) : (
                      <div className={cn(
                        "p-5 rounded-sm border-2 border-dashed text-center transition-all",
                        isQuizPassed ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"
                      )}>
                         <span className="text-[9px] font-black uppercase text-slate-400 block mb-2 tracking-widest">المتطلب الأكاديمي</span>
                         <span className={cn("text-xs font-black", isQuizPassed ? "text-emerald-700" : "text-slate-500")}>
                           {isQuizPassed ? "تم اجتياز الاختبار بنجاح ✅" : "يجب إنهاء الاختبار في الأسفل أولاً"}
                         </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
