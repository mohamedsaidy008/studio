'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { useAdmin, useFirebase, useUser } from "@/firebase";
import { 
  collection, 
  doc, 
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDoc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Search, 
  Trash2, 
  Download, 
  Save,
  PlusSquare,
  AlertCircle,
  Braces,
  FileText,
  Eye,
  PlusCircle,
  X,
  Database,
  LayoutGrid,
  ChevronLeft,
  Layers,
  CheckCircle2,
  Hash,
  Lightbulb,
  Code2,
  Zap,
  BookOpen,
  Info
} from "lucide-react";
import { importCodeforcesProblem } from "@/ai/flows/import-codeforces-problem";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// --- Preview Component ---
const ProblemPreview = ({ problem }: { problem: any }) => {
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
                body { font-family: 'Tajawal', sans-serif; padding: 40px; line-height: 1.8; color: #334155; background: #fff; }
                h1 { font-size: 32px; font-weight: 900; margin-bottom: 15px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
                .meta { display: flex; gap: 12px; margin-bottom: 40px; }
                .badge { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 800; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; }
                .section-title { font-size: 20px; font-weight: 900; margin-top: 40px; margin-bottom: 20px; border-right: 5px solid #1e40af; padding-right: 15px; color: #1e293b; }
                .content { font-size: 17px; margin-bottom: 25px; white-space: pre-wrap; color: #475569; }
                .test-case { background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
                .test-label { font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; display: block; letter-spacing: 1px; }
                pre { background: #0f172a; color: #10b981; padding: 15px; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 14px; margin: 0; overflow-x: auto; border: 1px solid #1e293b; }
                .output-pre { color: #3b82f6; }
              </style>
            </head>
            <body>
              <h1>${problem.title || 'عنوان المسألة'}</h1>
              <div class="meta">
                <span class="badge">المعرف: ${problem.id || 'N/A'}</span>
                <span class="badge">التصنيف: ${problem.category || 'عام'}</span>
                <span class="badge">الصعوبة: ${problem.difficulty || 'Medium'}</span>
                <span class="badge">التقييم: ${problem.rating || 800}</span>
              </div>
              
              <div class="section-title">وصف المسألة</div>
              <div class="content">${problem.statement || 'لا يوجد وصف مضاف حالياً...'}</div>
              
              <div class="section-title">تنسيق الإدخال</div>
              <div class="content">${problem.inputFormat || '-'}</div>
              
              <div class="section-title">تنسيق الإخراج</div>
              <div class="content">${problem.outputFormat || '-'}</div>

              <div class="section-title">أمثلة تجريبية</div>
              ${(problem.examples || []).map((ex: any, i: number) => `
                <div class="test-case">
                  <div>
                    <span class="test-label">EXAMPLE INPUT #${i+1}</span>
                    <pre>${ex.input}</pre>
                  </div>
                  <div style="margin-top: 20px;">
                    <span class="test-label">EXAMPLE OUTPUT #${i+1}</span>
                    <pre class="output-pre">${ex.output}</pre>
                  </div>
                </div>
              `).join('')}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [problem]);

  return (
    <div className="border rounded-sm bg-white h-full overflow-hidden shadow-none relative">
      <div className="absolute top-4 left-4 z-10 bg-slate-100 px-3 py-1 rounded-sm text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-200">Live Preview Mode</div>
      <iframe ref={iframeRef} className="w-full h-full border-0" title="Problem Preview" />
    </div>
  );
};

export default function ProblemsManagementStudio() {
  const { isAdmin, isProblemSetter, loading: authLoading } = useAdmin();
  const { user } = useUser();
  const { db } = useFirebase();
  const { toast } = useToast();
  
  const [problems, setProblems] = useState<any[]>([]);
  const [pendingProblems, setPendingProblems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null); 
  const [activeTab, setActiveTab] = useState("manual");
  
  const [jsonContent, setJsonContent] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [bulkJson, setBulkJson] = useState("");
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "problems"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProblems(list);
      setIsLoading(false);
    });
  }, [db]);

  const parsedProblem = useMemo(() => {
    try { return JSON.parse(jsonContent); } catch { return {}; }
  }, [jsonContent]);

  const selectProblem = (prob: any) => {
    setSelectedId(prob.id);
    const { createdAt, updatedAt, lastModifiedBy, isPending, ...pureData } = prob;
    setJsonContent(JSON.stringify(pureData, null, 2));
    setJsonError(null);
    setActiveTab("manual");
  };

  const handleJsonChange = (val: string) => {
    setJsonContent(val);
    try {
      if (val.trim()) {
        JSON.parse(val);
        setJsonError(null);
      }
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const updateField = (field: string, value: any) => {
    const current = { ...parsedProblem, [field]: value };
    setJsonContent(JSON.stringify(current, null, 2));
    
    if (pendingProblems.some(p => p.id === selectedId)) {
      setPendingProblems(prev => prev.map(p => p.id === selectedId ? { ...p, [field]: value } : p));
    }
  };

  const updateHintField = (field: string, value: any) => {
    const hints = { ...(parsedProblem.hints || {}), [field]: value };
    updateField("hints", hints);
  };

  const handleAddExample = () => {
    const examples = [...(parsedProblem.examples || [])];
    examples.push({ input: "", output: "", explanation: "" });
    updateField("examples", examples);
  };

  const handleRemoveExample = (idx: number) => {
    const examples = [...parsedProblem.examples];
    examples.splice(idx, 1);
    updateField("examples", examples);
  };

  const handleCreateNew = () => {
    const tempId = "NEW_PROBLEM";
    setSelectedId(tempId);
    const template = {
      id: "",
      title: "مسألة جديدة",
      category: "General",
      difficulty: "Medium",
      rating: 800,
      statement: "",
      inputFormat: "",
      outputFormat: "",
      timeLimit: "1.0s",
      memoryLimit: "256MB",
      examples: [{ input: "", output: "", explanation: "" }],
      hints: { 
        simple: "",
        clear: "",
        comprehensive: "",
        solution: "// الحل النموذجي باللغة C++" 
      }
    };
    setJsonContent(JSON.stringify(template, null, 2));
    setJsonError(null);
    setActiveTab("manual");
  };

  const handleBulkImport = () => {
    try {
      const data = JSON.parse(bulkJson);
      if (!Array.isArray(data)) throw new Error("يجب إدخل مصفوفة من المسائل.");
      
      const newPending = data.map((p, idx) => ({
        ...p,
        id: p.id || `PENDING_${Date.now()}_${idx}`,
        isPending: true
      }));
      
      setPendingProblems(prev => [...newPending, ...prev]);
      setIsBulkDialogOpen(false);
      setBulkJson("");
      toast({ title: `تم تحميل ${newPending.length} مسائل بنجاح` });
      
      if (newPending.length > 0) selectProblem(newPending[0]);
      
    } catch (e: any) {
      console.error("Error in bulk import:", e);
      toast({ variant: "destructive", title: "خطأ في التنسيق", description: e.message });
    }
  };

  const handleSave = async () => {
    if (!db || jsonError || !user || !jsonContent.trim()) return;
    setIsSaving(true);
    try {
      const data = JSON.parse(jsonContent);
      let probId = data.id?.trim();
      
      if (!probId) {
        toast({ variant: "destructive", title: "المعرف مطلوب" });
        setIsSaving(false);
        return;
      }

      const finalData = {
        ...data,
        id: probId,
        updatedAt: serverTimestamp(),
        createdAt: (selectedId === "NEW_PROBLEM" || pendingProblems.some(p => p.id === selectedId)) ? serverTimestamp() : parsedProblem.createdAt || serverTimestamp(),
        lastModifiedBy: user.uid
      };
      
      await setDoc(doc(db, "problems", probId), finalData, { merge: true });
      setPendingProblems(prev => prev.filter(p => p.id !== selectedId && p.id !== probId));
      
      toast({ title: `تم حفظ المسألة ${probId} بنجاح` });
      setSelectedId(probId);
    } catch (e) {
      console.error("Error saving problem:", e);
      toast({ variant: "destructive", title: "فشل حفظ البيانات" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !selectedId) return;
    
    if (pendingProblems.some(p => p.id === selectedId)) {
      setPendingProblems(prev => prev.filter(p => p.id !== selectedId));
      setSelectedId(null);
      toast({ title: "تمت الإزالة من القائمة المعلقة" });
      return;
    }

    try {
      await deleteDoc(doc(db!, "problems", selectedId));
      toast({ title: "تم الحذف نهائياً" });
      setSelectedId(null);
    } catch (e) {
      console.error("Error deleting problem:", e);
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const handleImportOne = async () => {
    if (!importUrl.trim().startsWith("http")) return;
    setIsImporting(true);
    try {
      const result = await importCodeforcesProblem(importUrl);
      const data = {
        id: result.id,
        title: result.title,
        sourceUrl: importUrl,
        category: result.category || "General",
        difficulty: result.difficulty,
        rating: result.rating,
        statement: result.statement,
        inputFormat: result.inputFormat,
        outputFormat: result.outputFormat,
        timeLimit: result.timeLimit || "1.0s",
        memoryLimit: result.memoryLimit || "256MB",
        examples: result.examples || [],
        hints: result.hints
      };
      setJsonContent(JSON.stringify(data, null, 2));
      setSelectedId("NEW_PROBLEM");
      toast({ title: `تم الاستيراد بنجاح: ${result.id}` });
    } catch (e) {
      console.error("Error importing problem:", e);
      toast({ variant: "destructive", title: "فشل الاستيراد التلقائي" });
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProblems = useMemo(() => {
    const problemsIds = new Set(problems.map(p => p.id));
    const uniquePending = pendingProblems.filter(p => !problemsIds.has(p.id));
    const list = [...uniquePending, ...problems];
    return list.filter(p => 
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [problems, pendingProblems, searchTerm]);

  if (authLoading || isLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex h-screen bg-slate-50 text-right font-body" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-8 bg-white shrink-0 z-30 shadow-none">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-100 rounded-sm text-slate-900 border border-slate-200"><Database className="w-5 h-5" /></div>
            <div className="space-y-0.5">
               <h1 className="font-black text-lg text-slate-900">إدارة المسائل</h1>
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Problem Bank Engine</span>
                 {selectedId && <Badge variant="outline" className="h-4 px-1.5 bg-slate-50 text-slate-600 border-slate-200 text-[9px] font-black uppercase rounded-sm">{selectedId}</Badge>}
               </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving || !!jsonError || !selectedId} className="h-10 font-black px-10 bg-primary hover:bg-primary/90 shadow-none rounded-sm gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ المسألة
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Navigator Sidebar */}
          <div className="w-80 flex flex-col bg-white shrink-0 border-l shadow-none z-20">
             <div className="p-6 border-b bg-slate-50/30 space-y-3 shrink-0">
                <Button onClick={handleCreateNew} className="w-full h-10 bg-slate-900 hover:bg-black font-black rounded-sm gap-2 shadow-none">
                   <PlusSquare className="w-4 h-4" /> إضافة مسألة
                </Button>
                
                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                  <DialogTrigger asChild>
                     <Button variant="outline" className="w-full h-10 border-2 font-black gap-2 border-slate-200 rounded-sm text-slate-600 hover:bg-slate-50">
                        <Layers className="w-4 h-4" /> إضافة جماعية (JSON)
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl text-right rounded-sm" dir="rtl">
                    <DialogHeader><DialogTitle className="font-black text-xl">استيراد مجموعة مسائل</DialogTitle></DialogHeader>
                    <div className="py-6 space-y-4">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مصفوفة بيانات JSON (المعرف مطلوب):</Label>
                      <Textarea 
                        placeholder='[ { "id": "123A", "title": "مسألة 1", ... } ]' 
                        value={bulkJson} 
                        onChange={(e) => setBulkJson(e.target.value)} 
                        className="min-h-[300px] font-code text-xs bg-slate-50 text-slate-800 border-2 rounded-sm"
                        dir="ltr"
                      />
                    </div>
                    <DialogFooter className="gap-2 justify-start border-t pt-4">
                      <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)} className="font-bold rounded-sm">إلغاء</Button>
                      <Button onClick={handleBulkImport} className="bg-primary font-black px-10 rounded-sm">بدء الاستيراد</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="relative pt-2">
                   <Search className="absolute right-3 top-[calc(50%+4px)] -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                   <Input placeholder="بحث بالاسم أو المعرف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-9 h-10 text-[11px] bg-white border-2 rounded-sm" />
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto divide-y bg-slate-50/20">
                {filteredProblems.map((prob) => (
                  <div key={prob.id} className="group relative">
                    <button 
                      onClick={() => selectProblem(prob)} 
                      className={cn(
                        "w-full p-5 text-right transition-all flex items-center gap-4 border-r-4", 
                        selectedId === prob.id 
                          ? "bg-white border-r-primary" 
                          : "border-r-transparent hover:bg-white hover:border-r-slate-200"
                      )}
                    >
                       <div className={cn(
                         "w-10 h-10 rounded-sm border-2 flex items-center justify-center shrink-0 font-black text-[10px]",
                         prob.rating >= 1600 ? "bg-red-50 text-red-600 border-red-100" : prob.rating >= 1200 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                       )}>
                         {prob.rating || 800}
                       </div>
                       <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                             <span className={cn("text-[12px] font-black truncate leading-none", selectedId === prob.id ? "text-primary" : "text-slate-700")}>{prob.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <Badge variant="secondary" className="h-3 px-1 text-[8px] font-black bg-slate-100 text-slate-400 border-0 uppercase rounded-sm">{prob.id}</Badge>
                             {prob.isPending && (
                               <Badge className="bg-orange-500 text-white text-[7px] h-3 px-1 font-black uppercase rounded-sm">قيد المراجعة</Badge>
                             )}
                             <span className="text-[8px] font-bold text-slate-300 truncate">{prob.category}</span>
                          </div>
                       </div>
                       <ChevronLeft className={cn("w-3.5 h-3.5 mr-auto transition-all", selectedId === prob.id ? "text-primary" : "text-slate-200 opacity-0 group-hover:opacity-100")} />
                    </button>
                    {selectedId === prob.id && (
                       <Button variant="ghost" size="icon" onClick={handleDelete} className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white border shadow-none"><Trash2 className="w-3.5 h-3.5" /></Button>
                    )}
                  </div>
                ))}
             </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedId ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 border-b bg-slate-50/50 flex items-center justify-between shrink-0 h-14">
                  <TabsList className="bg-transparent gap-8 h-full">
                    <TabsTrigger value="manual" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-xs px-0">التحرير اليدوي</TabsTrigger>
                    <TabsTrigger value="json" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-xs px-0">محرر JSON</TabsTrigger>
                    <TabsTrigger value="preview" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-xs px-0">معاينة العرض</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-4">
                    <Input placeholder="رابط Codeforces..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)} className="h-8 text-[10px] w-64 rounded-sm bg-white border-2" dir="ltr" />
                    <Button onClick={handleImportOne} disabled={isImporting} variant="secondary" size="sm" className="h-8 font-black text-[10px] gap-2 border rounded-sm">
                       {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} جلب تلقائي
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="manual" className="m-0 p-8 space-y-12 pb-32 max-w-5xl mx-auto">
                       {/* Model Solution & Hints */}
                       <Card className="rounded-sm border-2 shadow-none overflow-hidden">
                          <CardHeader className="bg-slate-900 border-b py-3 px-6 flex flex-row items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-400" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">نظام المساعدة التعليمي</CardTitle>
                          </CardHeader>
                          <CardContent className="p-8 space-y-8">
                             <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1.5"><Info className="w-3 h-3" /> التلميح الأول</Label>
                                  <Textarea 
                                    value={parsedProblem.hints?.simple || ""} 
                                    onChange={(e) => updateHintField('simple', e.target.value)} 
                                    placeholder="فكرة مبدئية لمساعدة الطالب..."
                                    className="min-h-[80px] text-sm font-bold bg-slate-50 border-2 rounded-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> منطق الحل</Label>
                                  <Textarea 
                                    value={parsedProblem.hints?.clear || ""} 
                                    onChange={(e) => updateHintField('clear', e.target.value)} 
                                    placeholder="شرح الخوارزمية أو المنطق البرمجي..."
                                    className="min-h-[80px] text-sm font-bold bg-slate-50 border-2 rounded-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black text-purple-600 uppercase flex items-center gap-1.5"><Zap className="w-3 h-3" /> شرح مفصل</Label>
                                  <Textarea 
                                    value={parsedProblem.hints?.comprehensive || ""} 
                                    onChange={(e) => updateHintField('comprehensive', e.target.value)} 
                                    placeholder="شرح تقني دقيق للطريقة..."
                                    className="min-h-[80px] text-sm font-bold bg-slate-50 border-2 rounded-sm"
                                  />
                                </div>
                             </div>

                             <div className="space-y-3 pt-6 border-t border-slate-100">
                                <Label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2"><Code2 className="w-4 h-4 text-slate-900" /> كود الحل النموذجي (C++)</Label>
                                <Textarea 
                                  value={parsedProblem.hints?.solution || ""} 
                                  onChange={(e) => updateHintField('solution', e.target.value)} 
                                  dir="ltr"
                                  className="min-h-[300px] font-code text-xs bg-slate-50 text-slate-900 p-6 border-2 rounded-sm focus-visible:ring-0" 
                                  placeholder="// الصق كود الحل النموذجي هنا..."
                                />
                             </div>
                          </CardContent>
                       </Card>

                       {/* Basics Section */}
                       <Card className="rounded-sm border-2 shadow-none overflow-hidden">
                          <CardHeader className="bg-slate-50 border-b py-3 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">البيانات الأساسية</CardTitle></CardHeader>
                          <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-primary uppercase tracking-widest">المعرف (ID)</Label>
                                <Input 
                                  value={parsedProblem.id || ""} 
                                  onChange={(e) => updateField('id', e.target.value.toUpperCase().replace(/\s/g, ''))} 
                                  placeholder="مثلاً: 123A"
                                  className="h-11 font-black text-lg border-2 uppercase rounded-sm" 
                                />
                             </div>
                             <div className="md:col-span-2 space-y-2">
                                <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">عنوان المسألة</Label>
                                <Input value={parsedProblem.title || ""} onChange={(e) => updateField('title', e.target.value)} className="h-11 font-black text-lg border-2 rounded-sm" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">التصنيف</Label>
                                <Input value={parsedProblem.category || ""} onChange={(e) => updateField('category', e.target.value)} className="h-11 font-bold bg-slate-50 border-2 rounded-sm" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">التقييم (Rating)</Label>
                                <Input type="number" value={parsedProblem.rating || 800} onChange={(e) => updateField('rating', parseInt(e.target.value))} className="h-11 font-mono font-black border-2 rounded-sm" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">الصعوبة</Label>
                                <Input value={parsedProblem.difficulty || "Medium"} onChange={(e) => updateField('difficulty', e.target.value)} className="h-11 font-bold bg-slate-50 border-2 rounded-sm" />
                             </div>
                             <div className="md:col-span-3 space-y-2">
                                <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">رابط المصدر (Codeforces)</Label>
                                <Input value={parsedProblem.sourceUrl || ""} onChange={(e) => updateField('sourceUrl', e.target.value)} dir="ltr" className="h-11 font-mono text-xs text-blue-600 bg-slate-50 border-2 rounded-sm" />
                             </div>
                          </CardContent>
                       </Card>

                       {/* Content Section */}
                       <section className="space-y-6 text-right">
                          <Label className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-2"><FileText className="w-5 h-5 text-slate-400" /> نص المسألة والشرح</Label>
                          <Textarea 
                            value={parsedProblem.statement || ""} 
                            onChange={(e) => updateField('statement', e.target.value)} 
                            className="min-h-[300px] font-bold text-base leading-loose p-8 border-2 rounded-sm shadow-none" 
                            placeholder="اكتب نص المسألة هنا..."
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase text-slate-500">تنسيق الإدخال</Label>
                                <Textarea value={parsedProblem.inputFormat || ""} onChange={(e) => updateField('inputFormat', e.target.value)} className="min-h-[100px] text-sm font-bold bg-slate-50 border-2 rounded-sm" />
                             </div>
                             <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase text-slate-500">تنسيق الإخراج</Label>
                                <Textarea value={parsedProblem.outputFormat || ""} onChange={(e) => updateField('outputFormat', e.target.value)} className="min-h-[100px] text-sm font-bold bg-slate-50 border-2 rounded-sm" />
                             </div>
                          </div>
                       </section>

                       {/* Examples Section */}
                       <section className="space-y-8 pt-6 border-t-2 border-dashed text-right">
                          <div className="flex items-center justify-between">
                             <h3 className="font-black text-xl text-slate-900">أمثلة تجريبية</h3>
                             <Button variant="outline" onClick={handleAddExample} className="font-black text-xs gap-2 border-2 border-slate-200 text-slate-600 h-10 px-6 rounded-sm">
                                <PlusCircle className="w-5 h-5" /> إضافة مثال
                             </Button>
                          </div>
                          <div className="grid grid-cols-1 gap-6">
                             {(parsedProblem.examples || []).map((ex: any, idx: number) => (
                               <Card key={idx} className="border-2 shadow-none overflow-hidden rounded-sm">
                                  <div className="bg-slate-50 px-6 py-2 flex items-center justify-between border-b">
                                     <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Example #{idx+1}</span>
                                     <Button variant="ghost" size="icon" onClick={() => handleRemoveExample(idx)} className="h-6 w-6 text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></Button>
                                  </div>
                                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                                     <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Input</Label>
                                        <Textarea value={ex.input} onChange={(e) => {
                                          const newEx = [...parsedProblem.examples];
                                          newEx[idx].input = e.target.value;
                                          updateField('examples', newEx);
                                        }} dir="ltr" className="font-code text-xs bg-slate-50 text-slate-900 min-h-[80px] border-2 rounded-sm" />
                                     </div>
                                     <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase text-slate-400">Output</Label>
                                        <Textarea value={ex.output} onChange={(e) => {
                                          const newEx = [...parsedProblem.examples];
                                          newEx[idx].output = e.target.value;
                                          updateField('examples', newEx);
                                        }} dir="ltr" className="font-code text-xs bg-slate-50 text-slate-900 min-h-[80px] border-2 rounded-sm" />
                                     </div>
                                  </div>
                               </Card>
                             ))}
                          </div>
                       </section>
                  </TabsContent>

                  <TabsContent value="json" className="m-0 h-full overflow-hidden flex flex-col bg-slate-950">
                    <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Braces className="w-4 h-4" /> Raw Manifest</span>
                      {jsonError && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-black rounded-sm">Error: {jsonError}</Badge>}
                    </div>
                    <Textarea 
                      value={jsonContent} 
                      onChange={(e) => handleJsonChange(e.target.value)}
                      className="flex-1 w-full p-8 font-code text-[12px] leading-relaxed text-emerald-400 bg-transparent border-0 resize-none focus-visible:ring-0 overflow-y-auto"
                      dir="ltr"
                      spellCheck={false}
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="m-0 p-8 h-full">
                     <ProblemPreview problem={parsedProblem} />
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50/20 p-20 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-white border-2 flex items-center justify-center shadow-none text-slate-200"><Eye className="w-10 h-10" /></div>
                <div className="space-y-2">
                   <h2 className="font-black text-2xl text-slate-800">إدارة بنك المسائل</h2>
                   <p className="text-slate-400 font-bold text-sm max-w-sm mx-auto leading-relaxed">اختر مسألة من القائمة الجانبية للتعديل، أو ابدأ بإنشاء واحدة جديدة وتحديد خصائصها الأكاديمية.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
