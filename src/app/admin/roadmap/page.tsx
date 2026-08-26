'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { useAdmin, useFirebase, useUser } from "@/firebase";
import { ref, onValue, set, remove, update } from "firebase/database";
import { collection, onSnapshot as firestoreOnSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Video, 
  Target, 
  Loader2, 
  FileText, 
  Edit3, 
  Link as LinkIcon, 
  Search,
  Code2,
  AlertCircle,
  Braces,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings2,
  HelpCircle,
  PlusCircle,
  MinusCircle,
  Map
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// --- Components ---

const LivePreview = ({ html }: { html: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <html dir="rtl">
            <head>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Tajawal', sans-serif; padding: 20px; line-height: 1.7; color: #334155; }
                .html-content h1 { font-size: 24px; font-weight: 900; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                .html-content h2 { font-size: 20px; font-weight: 900; margin-top: 30px; margin-bottom: 15px; border-right: 4px solid #1e40af; padding-right: 10px; }
                .html-content p { margin-bottom: 20px; }
                .html-content code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #1e40af; }
                .html-content pre { background: #0f172a; color: #f8fafc; padding: 20px; border-radius: 8px; overflow-x: auto; margin-bottom: 20px; }
              </style>
            </head>
            <body><div class="html-content">${html || '<p style="color: #94a3b8; font-style: italic;">لا يوجد محتوى تعليمي للمعالجة...</p>'}</div></body>
          </html>
        `);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div className="border-2 rounded-sm bg-white h-full overflow-hidden shadow-none relative">
      <div className="absolute top-2 left-2 z-10 bg-slate-50 px-2 py-0.5 rounded-sm text-[8px] font-black text-slate-400 uppercase tracking-widest border">Live Preview</div>
      <iframe ref={iframeRef} className="w-full h-full border-0" title="Live Preview" />
    </div>
  );
};

// --- Main Page ---

export default function RoadmapManagementPage() {
  const { isAdmin, loading: authLoading } = useAdmin();
  const { user } = useUser();
  const { db, rtdb } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  
  const [stages, setStages] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStageTitle, setNewStageTitle] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [problemSearch, setProblemSearch] = useState("");

  const [lessonsJson, setLessonsJson] = useState<string>("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push("/admin/problems");
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!rtdb) return;
    const roadmapRef = ref(rtdb, "roadmap");
    return onValue(roadmapRef, (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .filter(([_, stage]: any) => stage !== null)
          .map(([id, d]: any) => ({ id, ...d }));
        setStages(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
      } else setStages([]);
    });
  }, [rtdb]);

  useEffect(() => {
    if (!db) return;
    return firestoreOnSnapshot(collection(db, "problems"), (snap) => {
      setProblems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [db]);

  const activeStage = useMemo(() => stages.find(s => s.id === activeStageId), [stages, activeStageId]);
  
  const parsedLessons = useMemo(() => {
    try { return JSON.parse(lessonsJson); } catch { return {}; }
  }, [lessonsJson]);

  const activeLesson = useMemo(() => {
    if (!activeLessonId) return null;
    return parsedLessons[activeLessonId] || null;
  }, [parsedLessons, activeLessonId]);

  const filteredProblems = useMemo(() => {
    return problems.filter(p => 
      p.title?.toLowerCase().includes(problemSearch.toLowerCase()) ||
      p.id?.toLowerCase().includes(problemSearch.toLowerCase())
    );
  }, [problems, problemSearch]);

  const validLessonsCount = useMemo(() => {
    return Object.values(parsedLessons).filter(l => l !== null).length;
  }, [parsedLessons]);

  const selectStage = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    setActiveStageId(stageId);
    setActiveLessonId(null);
    setLessonsJson(JSON.stringify(stage?.lessons || {}, null, 2));
    setJsonError(null);
  };

  const handleJsonChange = (val: string) => {
    setLessonsJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const updateLessonField = (lid: string, field: string, value: any) => {
    const current = { ...parsedLessons };
    if (!current[lid]) return;
    current[lid] = { ...current[lid], [field]: value };
    setLessonsJson(JSON.stringify(current, null, 2));
  };

  const addQuizQuestion = (lid: string) => {
    const current = { ...parsedLessons };
    const lesson = current[lid];
    const quiz = [...(lesson.quiz || [])];
    quiz.push({ question: "سؤال جديد؟", options: ["", "", "", ""], correctIndex: 0 });
    lesson.quiz = quiz;
    setLessonsJson(JSON.stringify(current, null, 2));
  };

  const removeQuizQuestion = (lid: string, qIdx: number) => {
    const current = { ...parsedLessons };
    const quiz = [...(current[lid].quiz || [])];
    quiz.splice(qIdx, 1);
    current[lid].quiz = quiz;
    setLessonsJson(JSON.stringify(current, null, 2));
  };

  const updateQuizField = (lid: string, qIdx: number, field: string, value: any) => {
    const current = { ...parsedLessons };
    const quiz = [...(current[lid].quiz || [])];
    quiz[qIdx] = { ...quiz[qIdx], [field]: value };
    current[lid].quiz = quiz;
    setLessonsJson(JSON.stringify(current, null, 2));
  };

  const createNewLesson = () => {
    if (!activeStageId) return;
    const current = { ...parsedLessons };
    const newId = (Object.keys(current).length + 1).toString();
    current[newId] = {
      id: newId,
      name: "عنوان الدرس",
      type: "text",
      description: "",
      textContent: "",
      isDraft: true,
      quiz: []
    };
    setLessonsJson(JSON.stringify(current, null, 2));
    setActiveLessonId(newId);
    setActiveTab("manual");
  };

  const deleteLesson = (lid: string) => {
    const current = { ...parsedLessons };
    delete current[lid];
    setLessonsJson(JSON.stringify(current, null, 2));
    if (activeLessonId === lid) setActiveLessonId(null);
  };

  const saveToDatabase = async () => {
    if (!activeStageId || jsonError) return;
    setIsSaving(true);
    try {
      const data = JSON.parse(lessonsJson);
      const cleaned = Array.isArray(data) ? data.filter(l => l !== null) : data;
      
      await update(ref(rtdb!, `roadmap/${activeStageId}`), {
        lessons: cleaned,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "تم حفظ التغييرات بنجاح" });
    } catch (e) {
      console.error("Error saving lessons to database:", e);
      toast({ variant: "destructive", title: "فشل الحفظ" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStageMeta = async () => {
    if (!newStageTitle) return;
    try {
      if (editingStageId) {
        await update(ref(rtdb!, `roadmap/${editingStageId}`), { title: newStageTitle });
        toast({ title: "تم التحديث" });
      } else {
        const nextId = (stages.length + 1).toString();
        await set(ref(rtdb!, `roadmap/${nextId}`), {
          title: newStageTitle,
          order: stages.length,
          createdAt: new Date().toISOString(),
          lessons: {}
        });
        toast({ title: "تمت إضافة الوحدة" });
      }
      setStageDialogOpen(false);
      setEditingStageId(null);
      setNewStageTitle("");
    } catch (e) {
      console.error("Error saving stage meta:", e);
      toast({ variant: "destructive", title: "فشل العملية" });
    }
  };

  const deleteStage = async (id: string) => {
    try {
      await remove(ref(rtdb!, `roadmap/${id}`));
      toast({ title: "تم الحذف" });
      if (activeStageId === id) setActiveStageId(null);
    } catch (e) {
      console.error("Error deleting stage:", e);
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-50 text-right" dir="rtl">
      <DashboardSidebar />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0 z-20 shadow-none">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-100 rounded-sm text-slate-900 border border-slate-200"><BookOpen className="w-5 h-5" /></div>
            <div className="flex items-center gap-2">
               <h1 className="font-black text-lg">إدارة المنهج</h1>
               {activeStage && <span className="text-slate-300 mx-2">/</span>}
               {activeStage && <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-black rounded-sm">{activeStage.title}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button onClick={saveToDatabase} disabled={isSaving || !!jsonError || !activeStageId} className="h-10 px-8 bg-primary hover:bg-primary/90 font-black gap-2 shadow-none rounded-sm">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ الوحدة
             </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Right Navigator Stack */}
          <div className="w-80 border-l bg-white flex flex-col shrink-0 overflow-hidden z-20 shadow-none">
             <div className="p-5 border-b bg-slate-50/50 space-y-4 shrink-0">
                <Button onClick={() => setStageDialogOpen(true)} className="w-full h-10 bg-slate-900 hover:bg-black font-black gap-2 shadow-none rounded-sm">
                   <Plus className="w-4 h-4" /> إضافة وحدة
                </Button>
                {activeStageId && (
                   <Button variant="ghost" onClick={() => setActiveStageId(null)} className="w-full h-8 text-[9px] font-black text-slate-400 gap-2 uppercase tracking-widest">
                      <ChevronRight className="w-3 h-3" /> العودة للقائمة
                   </Button>
                )}
             </div>

             <div className="flex-1 overflow-y-auto">
                {!activeStageId ? (
                  <div className="divide-y divide-slate-100">
                     {stages.map((s, idx) => (
                       <div key={s.id} className="group relative overflow-hidden">
                          <button onClick={() => selectStage(s.id)} className="w-full p-5 pl-20 text-right hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 group border-r-4 border-transparent hover:border-slate-200">
                             <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="text-[9px] font-black text-slate-400 font-mono shrink-0 bg-slate-50 w-8 h-8 rounded-sm border border-slate-100 flex items-center justify-center">#{idx+1}</div>
                                <span className="font-black text-sm text-slate-700 truncate">{s.title}</span>
                             </div>
                             <ChevronLeft className="w-3.5 h-3.5 text-slate-200 group-hover:text-primary transition-all shrink-0" />
                          </button>
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                             <Button variant="ghost" size="icon" onClick={() => { setEditingStageId(s.id); setNewStageTitle(s.title); setStageDialogOpen(true); }} className="h-7 w-7 bg-white border shadow-none text-slate-400 hover:text-blue-500"><Edit3 className="w-3.5 h-3.5" /></Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 bg-white border shadow-none text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                                <AlertDialogContent className="text-right rounded-sm" dir="rtl">
                                   <AlertDialogHeader><DialogTitle className="font-black">حذف الوحدة؟</DialogTitle><AlertDialogDescription className="font-bold text-xs">سيتم حذف كافة الدروس التابعة لهذه الوحدة نهائياً من قاعدة البيانات.</AlertDialogDescription></AlertDialogHeader>
                                   <AlertDialogFooter className="gap-2 justify-start"><AlertDialogCancel className="font-bold rounded-sm">إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteStage(s.id)} className="bg-destructive font-black rounded-sm">حذف نهائي</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                          </div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="flex flex-col h-full overflow-hidden">
                     <div className="p-4 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-between shrink-0">
                        <span>الدروس المتاحة</span>
                        <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[8px] rounded-sm">{validLessonsCount} عنصر</Badge>
                     </div>
                     <div className="flex-1 divide-y divide-slate-100 overflow-y-auto bg-slate-50/20 pb-20">
                        {Object.entries(parsedLessons).filter(([_, l]: any) => l !== null).map(([lid, lesson]: [string, any]) => (
                          <div key={lid} className="group relative overflow-hidden">
                            <button 
                              onClick={() => { setActiveLessonId(lid); setActiveTab("manual"); }} 
                              className={cn(
                                "w-full p-4 pl-12 text-right transition-all flex items-center gap-3 border-r-4",
                                activeLessonId === lid ? "bg-white border-r-primary shadow-none" : "border-r-transparent hover:bg-white"
                              )}
                            >
                               <div className={cn(
                                 "p-2 rounded-sm shrink-0 border",
                                 lesson.type === 'video' ? "bg-slate-100 text-slate-900" : lesson.type === 'practice' ? "bg-slate-100 text-slate-900" : "bg-slate-100 text-slate-900"
                               )}>
                                  {lesson.type === 'video' ? <Video className="w-3 h-3" /> : lesson.type === 'practice' ? <Target className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                     <p className={cn("text-[11px] font-black truncate", activeLessonId === lid ? "text-primary" : "text-slate-700")}>{lesson.name || "(عنوان مفقود)"}</p>
                                     {lesson.isDraft && <Badge className="h-3 px-1 bg-slate-100 text-slate-400 text-[6px] font-black uppercase tracking-widest rounded-none">DRAFT</Badge>}
                                  </div>
                                  <p className="text-[8px] font-mono text-slate-300 mt-0.5">ID: {lid}</p>
                               </div>
                            </button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteLesson(lid)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-white border shadow-none text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                            >
                               <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        <button onClick={createNewLesson} className="w-[calc(100%-24px)] p-6 border-2 border-dashed border-slate-200 m-3 rounded-sm text-slate-400 hover:text-primary hover:border-primary/20 transition-all flex flex-col items-center gap-2 group">
                           <PlusCircle className="w-5 h-5" />
                           <span className="text-[9px] font-black uppercase tracking-widest">إضافة درس جديد</span>
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>

          {/* Main Workspace Area (Editor) */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
             {activeStageId ? (
               <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-8 border-b bg-slate-50/50 flex items-center justify-between shrink-0 h-14">
                     <TabsList className="h-full bg-transparent gap-8">
                        <TabsTrigger value="manual" disabled={!activeLessonId} className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black text-xs px-0">التحرير المرئي</TabsTrigger>
                        <TabsTrigger value="json" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black text-xs px-0">محرر البيانات (JSON)</TabsTrigger>
                     </TabsList>
                     {activeLessonId && <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">تحرير العنصر: <span className="text-primary">#{activeLessonId}</span></div>}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="manual" className="h-full m-0 overflow-y-auto p-8 space-y-10">
                       {activeLesson ? (
                         <div className="max-w-6xl mx-auto space-y-12 pb-20">
                            {/* Lesson Basics */}
                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                               <div className="lg:col-span-2 space-y-6">
                                  <div className="flex items-center justify-between">
                                     <Label className="font-black text-[9px] text-slate-400 uppercase tracking-widest">أساسيات الدرس</Label>
                                     <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">مسودة (Draft)</span>
                                        <Switch checked={activeLesson.isDraft} onCheckedChange={(v) => updateLessonField(activeLessonId!, 'isDraft', v)} />
                                     </div>
                                  </div>
                                  <Input 
                                    placeholder="عنوان الدرس..." 
                                    value={activeLesson.name} 
                                    onChange={(e) => updateLessonField(activeLessonId!, 'name', e.target.value)}
                                    className="h-12 text-xl font-black border-2 rounded-sm" 
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                     <Select value={activeLesson.type} onValueChange={(v) => updateLessonField(activeLessonId!, 'type', v)}>
                                        <SelectTrigger className="h-11 font-bold rounded-sm border-2"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-sm"><SelectItem value="text" className="text-right">درس نصي</SelectItem><SelectItem value="video" className="text-right">درس فيديو</SelectItem><SelectItem value="practice" className="text-right">تمرين برمجي</SelectItem></SelectContent>
                                     </Select>
                                     {activeLesson.type === 'practice' && (
                                       <Select value={activeLesson.problemId} onValueChange={(v) => updateLessonField(activeLessonId!, 'problemId', v)}>
                                          <SelectTrigger className="h-11 font-bold rounded-sm border-2"><SelectValue placeholder="اختر المسألة..." /></SelectTrigger>
                                          <SelectContent className="max-h-[300px] rounded-sm">
                                             <div className="p-2 border-b sticky top-0 bg-white z-10"><Input placeholder="بحث..." value={problemSearch} onChange={(e) => setProblemSearch(e.target.value)} className="h-8 text-xs rounded-none" /></div>
                                             {filteredProblems.map(p => <SelectItem key={p.id} value={p.id} className="text-right">{p.title}</SelectItem>)}
                                          </SelectContent>
                                       </Select>
                                     )}
                                  </div>
                                  <Textarea 
                                    placeholder="وصف موجز للمحتوى..." 
                                    value={activeLesson.description} 
                                    onChange={(e) => updateLessonField(activeLessonId!, 'description', e.target.value)}
                                    className="min-h-[100px] font-bold text-sm bg-slate-50/50 border-2 rounded-sm" 
                                  />
                               </div>
                               <div className="bg-slate-50 p-6 rounded-sm border-2 border-dashed border-slate-200 space-y-4">
                                  <h4 className="font-black text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-3.5 h-3.5" /> الإعدادات</h4>
                                  <div className="space-y-2">
                                     <Label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">المعرف (ID)</Label>
                                     <Input value={activeLesson.id} disabled className="h-9 font-mono text-xs bg-white border-2 rounded-sm" />
                                  </div>
                                  {activeLesson.type === 'video' && (
                                    <div className="space-y-2">
                                       <Label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">رابط YouTube</Label>
                                       <Input dir="ltr" value={activeLesson.videoUrl || ""} onChange={(e) => updateLessonField(activeLessonId!, 'videoUrl', e.target.value)} className="h-9 font-mono text-xs border-2 rounded-sm" />
                                    </div>
                                  )}
                               </div>
                            </section>

                            {/* HTML Content & Preview */}
                            {(activeLesson.type === 'text' || activeLesson.type === 'video') && (
                              <section className="space-y-6">
                                 <div className="flex items-center justify-between">
                                    <h3 className="font-black text-lg flex items-center gap-2"><Code2 className="w-5 h-5 text-slate-400" /> المحتوى الأكاديمي (HTML)</h3>
                                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest text-slate-400 rounded-none bg-slate-50">Editor Active</Badge>
                                 </div>
                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
                                    <div className="relative group">
                                       <Textarea 
                                          dir="ltr"
                                          value={activeLesson.textContent || ""}
                                          onChange={(e) => updateLessonField(activeLessonId!, 'textContent', e.target.value)}
                                          className="w-full h-full p-6 font-code text-[12px] leading-loose border-2 bg-slate-50 text-slate-900 resize-none rounded-sm focus-visible:ring-0 shadow-none"
                                          spellCheck={false}
                                       />
                                    </div>
                                    <LivePreview html={activeLesson.textContent} />
                                 </div>
                              </section>
                            )}

                            {/* Quiz Builder */}
                            {(activeLesson.type === 'text' || activeLesson.type === 'video') && (
                              <section className="space-y-8 pt-8 border-t">
                                 <div className="flex items-center justify-between">
                                    <div>
                                       <h3 className="font-black text-lg flex items-center gap-2"><HelpCircle className="w-5 h-5 text-slate-400" /> اختبار الاستيعاب (Quiz)</h3>
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Short Comprehension Check</p>
                                    </div>
                                    <Button variant="outline" onClick={() => addQuizQuestion(activeLessonId!)} className="font-black text-xs gap-2 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-sm">
                                       <PlusCircle className="w-4 h-4" /> إضافة سؤال
                                    </Button>
                                 </div>

                                 <div className="grid grid-cols-1 gap-6">
                                    {activeLesson.quiz?.map((q: any, qIdx: number) => (
                                      <Card key={qIdx} className="border-2 shadow-none overflow-hidden rounded-sm">
                                         <CardHeader className="bg-slate-50/50 py-3 flex flex-row items-center justify-between border-b">
                                            <div className="flex items-center gap-3">
                                               <span className="w-6 h-6 rounded-sm bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{qIdx + 1}</span>
                                               <Input 
                                                  value={q.question} 
                                                  onChange={(e) => updateQuizField(activeLessonId!, qIdx, 'question', e.target.value)}
                                                  className="border-0 bg-transparent font-black text-sm h-8 w-[400px] focus-visible:ring-0 rounded-none" 
                                               />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeQuizQuestion(activeLessonId!, qIdx)} className="h-8 w-8 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                         </CardHeader>
                                         <CardContent className="p-6">
                                            <div className="grid grid-cols-2 gap-4">
                                               {q.options.map((opt: string, oIdx: number) => (
                                                 <div key={oIdx} className={cn("flex items-center gap-3 p-3 border-2 rounded-sm transition-all", q.correctIndex === oIdx ? "border-emerald-200 bg-emerald-50/20" : "bg-white border-slate-100")}>
                                                    <div 
                                                       onClick={() => updateQuizField(activeLessonId!, qIdx, 'correctIndex', oIdx)}
                                                       className={cn("w-4 h-4 rounded-sm border-2 cursor-pointer shrink-0 transition-all", q.correctIndex === oIdx ? "bg-emerald-500 border-emerald-500" : "border-slate-200")}
                                                    />
                                                    <Input 
                                                       placeholder={`الخيار ${oIdx + 1}...`}
                                                       value={opt} 
                                                       onChange={(e) => {
                                                         const newOpts = [...q.options];
                                                         newOpts[oIdx] = e.target.value;
                                                         updateQuizField(activeLessonId!, qIdx, 'options', newOpts);
                                                       }}
                                                       className="border-0 bg-transparent h-8 text-xs font-bold focus-visible:ring-0 p-0 rounded-none" 
                                                    />
                                                 </div>
                                               ))}
                                            </div>
                                         </CardContent>
                                      </Card>
                                    ))}
                                    {(!activeLesson.quiz || activeLesson.quiz.length === 0) && (
                                      <div className="py-12 border-2 border-dashed rounded-sm text-center text-slate-300 font-bold italic text-sm">لم يتم إدراج أسئلة اختبار لهذا الدرس.</div>
                                    )}
                                 </div>
                              </section>
                            )}
                         </div>
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                            <Eye className="w-12 h-12 opacity-30" />
                            <p className="font-black text-sm uppercase tracking-widest">اختر درساً لبدء التحرير</p>
                         </div>
                       )}
                    </TabsContent>

                    <TabsContent value="json" className="h-full m-0 overflow-hidden flex flex-col bg-slate-950">
                       <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Braces className="w-3 h-3" /> Raw JSON Manifest</span>
                          {jsonError && <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-sm border border-red-400/20 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> JSON Error: {jsonError}</span>}
                       </div>
                       <Textarea 
                          dir="ltr"
                          value={lessonsJson}
                          onChange={(e) => handleJsonChange(e.target.value)}
                          className="flex-1 w-full p-8 font-code text-[12px] leading-relaxed text-emerald-400 bg-transparent border-0 resize-none focus-visible:ring-0 overflow-y-auto"
                          spellCheck={false}
                       />
                    </TabsContent>
                  </div>
               </Tabs>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-20 gap-6 animate-in fade-in duration-500">
                  <div className="w-24 h-24 bg-slate-50 rounded-sm flex items-center justify-center border border-slate-100 shadow-none"><Map className="w-10 h-10 text-slate-200" /></div>
                  <div className="space-y-2">
                     <h2 className="text-2xl font-black text-slate-800">إدارة المنهج الأكاديمي</h2>
                     <p className="text-slate-400 font-bold text-sm max-w-md mx-auto leading-relaxed">حدد وحدة تعليمية من القائمة الجانبية لإدارة الدروس والمحتوى التقني والاختبارات المرافقة.</p>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Stage Meta Dialog */}
        <Dialog open={stageDialogOpen} onOpenChange={(open) => { setStageDialogOpen(open); if(!open) {setEditingStageId(null); setNewStageTitle("");}}}>
          <DialogContent className="text-right rounded-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right font-black">{editingStageId ? "تعديل مسمى الوحدة" : "إنشاء وحدة تعليمية جديدة"}</DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <Label className="font-black text-[9px] text-slate-400 uppercase tracking-widest">عنوان الوحدة</Label>
              <Input placeholder="مثال: مدخل إلى البرمجة الديناميكية" value={newStageTitle} onChange={(e) => setNewStageTitle(e.target.value)} className="h-11 font-bold border-2 rounded-sm" />
            </div>
            <DialogFooter className="gap-2 justify-start border-t pt-4">
              <Button variant="outline" onClick={() => setStageDialogOpen(false)} className="font-bold rounded-sm">إلغاء</Button>
              <Button onClick={handleSaveStageMeta} className="bg-primary font-black px-8 rounded-sm">حفظ البيانات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
