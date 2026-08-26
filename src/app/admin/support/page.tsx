'use client';

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { useAdmin, useFirebase } from "@/firebase";
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc as firestoreDoc,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { ref, onValue, update as updateRtdb } from "firebase/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  LifeBuoy, 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  Flag,
  Archive,
  Reply,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AdminSupportPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { db, rtdb } = useFirebase();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [reportedTopics, setReportedTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeReplyTicket, setActiveReplyTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (!db || !isAdmin) return;

    const ticketsQ = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
    const unsubTickets = onSnapshot(ticketsQ, (snap) => {
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubTickets();
  }, [db, isAdmin]);

  useEffect(() => {
    if (!rtdb || !isAdmin) return;

    const topicsRef = ref(rtdb, 'forum/topics');
    const unsubReports = onValue(topicsRef, (snapshot) => {
      if (snapshot.exists()) {
        const list = Object.entries(snapshot.val())
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(t => t.reportsCount >= 5 && t.status !== 'deleted');
        setReportedTopics(list);
      } else {
        setReportedTopics([]);
      }
    });

    return () => unsubReports();
  }, [rtdb, isAdmin]);

  const handleSendReply = async () => {
    if (!activeReplyTicket || !replyText.trim()) return;
    setIsReplying(true);
    try {
      await updateDoc(firestoreDoc(db!, `support_tickets/${activeReplyTicket.id}`), {
        reply: replyText,
        status: "closed",
        repliedAt: serverTimestamp()
      });
      toast({ title: "تم إرسال الرد وإغلاق التذكرة بنجاح" });
      setReplyText("");
      setActiveReplyTicket(null);
    } catch (e) {
      console.error("Error replying to support ticket:", e);
      toast({ variant: "destructive", title: "فشل إرسال الرد" });
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteDoc(firestoreDoc(db!, `support_tickets/${ticketId}`));
      toast({ title: "تم حذف التذكرة نهائياً" });
    } catch (e) {
      console.error("Error deleting support ticket:", e);
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const handleIgnoreReports = async (topicId: string) => {
    try {
      await updateRtdb(ref(rtdb!, `forum/topics/${topicId}`), { 
        reportsCount: 0,
        status: 'active' 
      });
      toast({ title: "تم تجاهل البلاغات وإعادة المنشور للحالة الآمنة" });
    } catch (e) {
      console.error("Error ignoring reports:", e);
      toast({ variant: "destructive", title: "فشل التحديث" });
    }
  };

  const handlePermanentDeleteTopic = async (topicId: string) => {
    try {
      await updateRtdb(ref(rtdb!, `forum/topics/${topicId}`), { status: 'deleted' });
      toast({ title: "تم حذف المنشور المخالف نهائياً" });
    } catch (e) {
      console.error("Error deleting topic:", e);
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  if (adminLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const openTicketsCount = tickets.filter(t => t.status === 'open').length;
  const criticalReportsCount = reportedTopics.length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-sm border border-primary/20"><LifeBuoy className="w-8 h-8 text-primary" /></div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">الدعم الفني والبلاغات</h1>
              <p className="text-slate-500 font-bold text-sm">مراجعة طلبات المبرمجين والبت في بلاغات المحتوى المخالف.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="rounded-sm border shadow-none bg-white">
                <CardContent className="p-6 flex items-center gap-4">
                   <div className="p-3 bg-slate-50 rounded-sm text-slate-600 border border-slate-100"><Archive className="w-6 h-6" /></div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">تذاكر نشطة</p>
                      <p className="text-2xl font-black text-slate-800">{openTicketsCount}</p>
                   </div>
                </CardContent>
             </Card>
             <Card className="rounded-sm border shadow-none bg-white">
                <CardContent className="p-6 flex items-center gap-4">
                   <div className="p-3 bg-orange-50 rounded-sm text-orange-600 border border-orange-100"><Flag className="w-6 h-6" /></div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">بلاغات محتوى</p>
                      <p className="text-2xl font-black text-slate-800">{criticalReportsCount}</p>
                   </div>
                </CardContent>
             </Card>
          </div>

          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="bg-white border-2 rounded-sm p-1 h-12 mb-6">
              <TabsTrigger value="tickets" className="px-8 font-black text-xs gap-2 relative data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-none">
                تذاكر الدعم
                {openTicketsCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>}
              </TabsTrigger>
              <TabsTrigger value="forum_reports" className="px-8 font-black text-xs gap-2 relative data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-none">
                بلاغات المنتدى
                {criticalReportsCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="animate-in fade-in duration-300">
              <Card className="rounded-sm border shadow-none overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-wider">المبرمج</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-wider">الموضوع</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-wider">الرسالة</TableHead>
                      <TableHead className="text-center text-[9px] font-black uppercase tracking-wider">الحالة</TableHead>
                      <TableHead className="text-left text-[9px] font-black uppercase tracking-wider">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id} className={cn(t.status === 'closed' ? "opacity-50 grayscale bg-slate-50/30" : "bg-white")}>
                        <TableCell className="font-bold">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800">{t.username}</span>
                            <span className="text-[9px] text-slate-400 font-mono" dir="ltr">{t.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-black text-xs text-slate-700">{t.subject}</TableCell>
                        <TableCell className="max-w-xs"><p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{t.message}</p></TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "text-[9px] font-black rounded-sm",
                            t.status === 'open' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                          )}>{t.status === 'open' ? 'مفتوحة' : 'مغلقة'}</Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-end gap-2">
                            {t.status === 'open' && (
                              <Dialog open={activeReplyTicket?.id === t.id} onOpenChange={(o) => setActiveReplyTicket(o ? t : null)}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 text-[9px] font-black border-2 rounded-sm gap-1 hover:bg-slate-50">
                                    <Reply className="w-3 h-3" /> الرد والحل
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="text-right rounded-sm" dir="rtl">
                                  <DialogHeader>
                                    <DialogTitle className="font-black">إرسال رد نهائي</DialogTitle>
                                  </DialogHeader>
                                  <div className="py-6 space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-sm border italic text-xs text-slate-600">
                                      <span className="font-black text-slate-900 block mb-1">الرسالة الواردة:</span>
                                      {t.message}
                                    </div>
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">نص الرد الرسمي:</Label>
                                    <Textarea 
                                      value={replyText} 
                                      onChange={(e) => setReplyText(e.target.value)} 
                                      placeholder="سيتم إرسال هذا الرد للمستخدم عبر المنصة وإغلاق الطلب..."
                                      className="min-h-[150px] border-2 rounded-sm"
                                    />
                                  </div>
                                  <DialogFooter className="gap-2 justify-start border-t pt-4">
                                    <Button variant="outline" onClick={() => setActiveReplyTicket(null)} className="font-bold rounded-sm">إلغاء</Button>
                                    <Button onClick={handleSendReply} disabled={isReplying || !replyText.trim()} className="bg-primary font-black px-10 gap-2 rounded-sm shadow-none">
                                      {isReplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} إرسال الرد
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTicket(t.id)} className="h-8 w-8 text-slate-300 hover:text-red-500 rounded-sm"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tickets.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="py-24 text-center text-slate-300 font-bold italic text-sm">لا توجد طلبات دعم حالياً.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="forum_reports" className="animate-in fade-in duration-300">
              <Card className="rounded-sm border shadow-none overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-wider">المحتوى المبلّغ عنه</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-wider">الكاتب</TableHead>
                      <TableHead className="text-center text-[9px] font-black uppercase tracking-wider">العداد</TableHead>
                      <TableHead className="text-left text-[9px] font-black uppercase tracking-wider">القرار الإداري</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportedTopics.map((rt) => (
                      <TableRow key={rt.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1 max-w-sm">
                            <span className="text-sm font-black text-slate-800">{rt.title}</span>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{rt.content}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-600">{rt.authorName}</TableCell>
                        <TableCell className="text-center">
                           <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 font-black text-[11px] h-6 px-3 rounded-sm">{rt.reportsCount} بلاغات</Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleIgnoreReports(rt.id)} className="h-9 text-[10px] font-black gap-2 bg-white border-2 rounded-sm hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                              <RotateCcw className="w-3.5 h-3.5" /> تجاهل وحفظ
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handlePermanentDeleteTopic(rt.id)} className="h-9 text-[10px] font-black gap-2 bg-white border-2 rounded-sm hover:bg-red-50 hover:text-red-600 transition-all">
                              <Trash2 className="w-3.5 h-3.5" /> حذف نهائي
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reportedTopics.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-24 text-center text-slate-300 font-bold italic text-sm">لا توجد بلاغات محتوى تتطلب المراجعة.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
