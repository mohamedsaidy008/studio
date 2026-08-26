'use client';

import { useState, useEffect } from "react";
import { useFirebase, useUser, useAdmin } from "@/firebase";
import { ref, onValue, push, set, serverTimestamp, remove, update, get, increment } from "firebase/database";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Clock, 
  User as UserIcon, 
  ChevronLeft,
  Loader2,
  Trash2,
  AlertCircle,
  Flag
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", name: "الكل" },
  { id: "algorithms", name: "خوارزميات" },
  { id: "problems", name: "مسائل" },
  { id: "general", name: "عام" },
  { id: "announcements", name: "إعلانات" }
];

const MAX_TOPICS_PER_DAY = 2;
const REPORT_THRESHOLD = 5;

export default function ForumPage() {
  const { rtdb } = useFirebase();
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [newTopic, setNewTopic] = useState({
    title: "",
    content: "",
    category: "general"
  });

  useEffect(() => {
    document.title = "المنتدى";
  }, []);

  useEffect(() => {
    if (!rtdb) return;
    
    const topicsRef = ref(rtdb, 'forum/topics');
    const unsub = onValue(topicsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(t => t.status !== 'deleted')
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTopics(list);
      } else {
        setTopics([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [rtdb]);

  const handleCreateTopic = async () => {
    if (!user || !rtdb || !newTopic.title.trim() || !newTopic.content.trim()) {
      toast({ variant: "destructive", title: "بيانات ناقصة" });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const activityRef = ref(rtdb, `users/${user.uid}/forumActivity/${today}`);
    const snap = await get(activityRef);
    const activity = snap.val() || { topicsCount: 0 };

    if (!isAdmin && activity.topicsCount >= MAX_TOPICS_PER_DAY) {
      toast({ variant: "destructive", title: "تجاوزت الحد اليومي", description: `يمكنك نشر موضوعين فقط يومياً.` });
      return;
    }

    try {
      const topicsRef = ref(rtdb, 'forum/topics');
      const newTopicRef = push(topicsRef);
      await set(newTopicRef, {
        title: newTopic.title,
        content: newTopic.content,
        category: newTopic.category,
        authorUid: user.uid,
        authorName: user.displayName || "مبرمج مجهول",
        authorPhoto: user.photoURL || null,
        createdAt: Date.now(),
        replyCount: 0,
        lastActivity: Date.now(),
        reportsCount: 0,
        status: 'active'
      });

      await update(activityRef, { topicsCount: increment(1) });

      toast({ title: "تم نشر الموضوع بنجاح" });
      setIsCreateDialogOpen(false);
      setNewTopic({ title: "", content: "", category: "general" });
    } catch (e) {
      console.error("Error creating topic:", e);
      toast({ variant: "destructive", title: "فشل نشر الموضوع" });
    }
  };

  const handleDeleteTopic = async (topicId: string, authorUid: string) => {
    if (user?.uid !== authorUid && !isAdmin) return;
    try {
      await update(ref(rtdb!, `forum/topics/${topicId}`), { status: 'deleted' });
      toast({ title: "تم حذف الموضوع بنجاح" });
    } catch (e) {
      console.error("Error deleting topic:", e);
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const handleReportTopic = async (topicId: string) => {
    if (!user || !rtdb) return;
    const reportRef = ref(rtdb, `forum/reports/${topicId}/${user.uid}`);
    const snap = await get(reportRef);
    if (snap.exists()) {
      toast({ variant: "outline", title: "لقد قمت بالإبلاغ مسبقاً" });
      return;
    }

    try {
      await set(reportRef, true);
      const topicRef = ref(rtdb, `forum/topics/${topicId}`);
      const tSnap = await get(topicRef);
      const reportsCount = (tSnap.val().reportsCount || 0) + 1;
      
      await update(topicRef, { reportsCount });
      
      if (reportsCount >= REPORT_THRESHOLD) {
        toast({ title: "شكراً لبلاغك", description: "تم إرسال المنشور للمراجعة الإدارية وسيبقى مرئياً حالياً." });
      } else {
        toast({ title: "تم تسجيل بلاغك بنجاح" });
      }
    } catch (e) {
      console.error("Error reporting topic:", e);
      toast({ variant: "destructive", title: "فشل الإبلاغ" });
    }
  };

  const filteredTopics = topics.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 border rounded-md shadow-none">
            <div className="space-y-2">
              <h1 className="text-3xl font-black flex items-center gap-3">المنتدى <MessageSquare className="w-7 h-7 text-primary" /></h1>
              <p className="text-slate-500 font-bold text-sm">ساحة للنقاش وتبادل الخبرات البرمجية بين أعضاء المنصة.</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="font-bold bg-primary hover:bg-primary/90 h-12 px-8 rounded-sm gap-2">
                  <Plus className="w-5 h-5" /> موضوع جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-md bg-white border-2 max-w-2xl" dir="rtl">
                <DialogHeader className="border-b pb-4">
                  <DialogTitle className="text-right font-black">بدء نقاش جديد</DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-6 text-right">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase">عنوان النقاش</label>
                    <Input 
                      placeholder="مثال: كيف أبدأ في تعلم البرمجة الديناميكية؟" 
                      value={newTopic.title} 
                      onChange={(e) => setNewTopic({...newTopic, title: e.target.value})}
                      className="h-12 rounded-sm border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase">التصنيف</label>
                    <Select value={newTopic.category} onValueChange={(v) => setNewTopic({...newTopic, category: v})}>
                      <SelectTrigger className="h-12 rounded-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-sm">
                        {CATEGORIES.slice(1).map(c => <SelectItem key={c.id} value={c.id} className="text-right">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase">المحتوى</label>
                    <Textarea 
                      placeholder="اشرح فكرتك أو سؤالك بالتفصيل هنا..." 
                      className="min-h-[150px] rounded-sm"
                      value={newTopic.content}
                      onChange={(e) => setNewTopic({...newTopic, content: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 justify-start border-t pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-sm px-6 font-bold">إلغاء</Button>
                  <Button onClick={handleCreateTopic} className="bg-primary hover:bg-primary/90 rounded-sm px-10 font-black">نشر الآن</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative lateral-search flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="بحث في المواضيع..." 
                className="pr-10 h-11 bg-white border-slate-200 rounded-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {CATEGORIES.map(c => (
                <Button 
                  key={c.id}
                  variant={selectedCategory === c.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    "font-bold h-11 px-6 rounded-sm whitespace-nowrap",
                    selectedCategory === c.id ? "bg-primary" : "bg-white border-slate-200 text-slate-500"
                  )}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>

          <Card className="rounded-md shadow-none border bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-xs font-black text-slate-400 uppercase">قائمة النقاشات الحالية</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredTopics.map((topic) => (
                  <div key={topic.id} className="p-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-black rounded-sm bg-slate-100 border-slate-200 text-slate-500">
                            {CATEGORIES.find(c => c.id === topic.category)?.name}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(topic.createdAt), { addSuffix: true, locale: ar })}
                          </span>
                          {topic.reportsCount >= REPORT_THRESHOLD && (
                            <Badge className="bg-orange-500 text-white text-[8px] h-4 rounded-sm animate-pulse">تحت المراجعة</Badge>
                          )}
                        </div>
                        <Link href={`/forum/${topic.id}`}>
                          <h3 className="text-lg font-black text-slate-800 hover:text-primary transition-colors cursor-pointer">{topic.title}</h3>
                        </Link>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">{topic.content}</p>
                        <div className="flex items-center gap-4 text-[10px] font-black">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border overflow-hidden">
                              {topic.authorPhoto ? <img src={topic.authorPhoto} className="w-full h-full object-cover" /> : <UserIcon className="w-3 h-3" />}
                            </div>
                            <span>بواسطة: {topic.authorName}</span>
                          </div>
                          <div className="text-slate-400 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {topic.replyCount || 0} ردود
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Link href={`/forum/${topic.id}`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 rounded-sm hover:bg-primary/10 text-primary">
                            <ChevronLeft className="w-5 h-5" />
                          </Button>
                        </Link>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleReportTopic(topic.id)}
                              className="h-8 w-8 text-slate-300 hover:text-orange-500"
                              title="إبلاغ"
                           >
                              <Flag className="w-4 h-4" />
                           </Button>
                           {(user?.uid === topic.authorUid || isAdmin) && (
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteTopic(topic.id, topic.authorUid)}
                                className="h-8 w-8 text-slate-300 hover:text-red-500"
                                title="حذف"
                             >
                                <Trash2 className="w-4 h-4" />
                             </Button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTopics.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <AlertCircle className="w-12 h-12 text-slate-200" />
                    <p className="text-slate-400 font-bold text-sm">لا توجد مواضيع في هذا القسم حالياً.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
