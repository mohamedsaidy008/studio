'use client';

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirebase, useUser, useAdmin } from "@/firebase";
import { ref, onValue, push, set, serverTimestamp, remove, increment, update, get } from "firebase/database";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  User as UserIcon, 
  Loader2, 
  Send,
  Trash2,
  Reply,
  Flag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

const MAX_REPLIES_PER_DAY = 10;
const REPORT_THRESHOLD = 5;

export default function TopicDetailPage() {
  const { topicId } = useParams();
  const { rtdb } = useFirebase();
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const router = useRouter();
  
  const [topic, setTopic] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rtdb || !topicId) return;

    const topicRef = ref(rtdb, `forum/topics/${topicId}`);
    const unsubTopic = onValue(topicRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.status === 'deleted') {
          router.push("/forum");
          return;
        }
        setTopic({ id: snapshot.key, ...data });
      } else {
        router.push("/forum");
      }
      setLoading(false);
    });

    const repliesRef = ref(rtdb, `forum/replies/${topicId}`);
    const unsubReplies = onValue(repliesRef, (snapshot) => {
      if (snapshot.exists()) {
        const list = Object.entries(snapshot.val())
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(r => r.status !== 'deleted')
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setReplies(list);
      } else {
        setReplies([]);
      }
    });

    return () => {
      unsubTopic();
      unsubReplies();
    };
  }, [rtdb, topicId, router]);

  const scrollToBottom = () => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb || !newReply.trim() || isSending) return;

    const today = new Date().toISOString().split('T')[0];
    const activityRef = ref(rtdb, `users/${user.uid}/forumActivity/${today}`);
    const snap = await get(activityRef);
    const activity = snap.val() || { repliesCount: 0 };

    if (!isAdmin && activity.repliesCount >= MAX_REPLIES_PER_DAY) {
      toast({ variant: "destructive", title: "تجاوزت الحد اليومي", description: `يمكنك كتابة 10 ردود فقط يومياً.` });
      return;
    }

    setIsSending(true);
    try {
      const replyRef = push(ref(rtdb, `forum/replies/${topicId}`));
      await set(replyRef, {
        authorUid: user.uid,
        authorName: user.displayName || "مبرمج مجهول",
        authorPhoto: user.photoURL || null,
        content: newReply,
        createdAt: Date.now(),
        reportsCount: 0,
        status: 'active'
      });

      await update(ref(rtdb, `forum/topics/${topicId}`), {
        replyCount: increment(1),
        lastActivity: Date.now()
      });

      await update(activityRef, { repliesCount: increment(1) });

      setNewReply("");
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      console.error("Error sending reply:", e);
      toast({ variant: "destructive", title: "فشل إرسال الرد" });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!isAdmin) return;
    try {
      await update(ref(rtdb!, `forum/replies/${topicId}/${replyId}`), { status: 'deleted' });
      await update(ref(rtdb!, `forum/topics/${topicId}`), {
        replyCount: increment(-1)
      });
      toast({ title: "تم حذف الرد بنجاح" });
    } catch (e) {
      console.error("Error deleting reply:", e);
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  const handleReportReply = async (replyId: string) => {
    if (!user || !rtdb) return;
    const reportRef = ref(rtdb, `forum/reports/${replyId}/${user.uid}`);
    const snap = await get(reportRef);
    if (snap.exists()) {
      toast({ variant: "outline", title: "لقد قمت بالإبلاغ مسبقاً" });
      return;
    }

    try {
      await set(reportRef, true);
      const replyRef = ref(rtdb, `forum/replies/${topicId}/${replyId}`);
      const rSnap = await get(replyRef);
      const reportsCount = (rSnap.val().reportsCount || 0) + 1;
      
      await update(replyRef, { reportsCount });
      
      if (reportsCount >= REPORT_THRESHOLD) {
        toast({ title: "شكراً لبلاغك", description: "تم إرسال بلاغك للإدارة وسيبقى الرد ظاهراً حالياً." });
      } else {
        toast({ title: "تم تسجيل بلاغك بنجاح" });
      }
    } catch (e) {
      console.error("Error reporting reply:", e);
      toast({ variant: "destructive", title: "فشل الإبلاغ" });
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!topic) return null;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between mb-4">
            <Link href="/forum">
              <Button variant="ghost" size="sm" className="font-bold gap-2 text-slate-500">
                <ArrowLeft className="w-4 h-4 ml-1" /> العودة للمنتدى
              </Button>
            </Link>
            <div className="flex items-center gap-2">
               {topic.reportsCount >= REPORT_THRESHOLD && <Badge className="bg-orange-100 text-orange-600 border-orange-200 font-black text-[9px] animate-pulse">بلاغات عالية - قيد التدقيق</Badge>}
               <Badge variant="secondary" className="font-black rounded-sm">{topic.category}</Badge>
            </div>
          </div>

          <Card className="rounded-md shadow-none border bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                    {topic.authorPhoto ? <img src={topic.authorPhoto} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">{topic.title}</h1>
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400">
                      <span>{topic.authorName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(topic.createdAt), { addSuffix: true, locale: ar })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap text-lg">{topic.content}</p>
            </CardContent>
          </Card>

          <div className="space-y-6 pt-10">
            <div className="flex items-center gap-3 border-b pb-4">
               <MessageSquare className="w-5 h-5 text-primary" />
               <h2 className="font-black text-slate-900 text-lg">النقاش ({replies.length})</h2>
            </div>

            <div className="space-y-6">
              {replies.map((reply) => (
                <div key={reply.id} className={cn("flex gap-4 group")}>
                  <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {reply.authorPhoto ? <img src={reply.authorPhoto} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-white border rounded-md p-5 shadow-sm relative">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-black text-slate-800">{reply.authorName}</span>
                           {reply.reportsCount >= REPORT_THRESHOLD && <Badge className="bg-orange-50 text-orange-500 border-orange-100 h-3 text-[7px] font-black uppercase">Reported</Badge>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: ar })}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{reply.content}</p>
                      
                      <div className="absolute -top-2 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleReportReply(reply.id)}
                          className="h-7 w-7 rounded-full bg-white border shadow-sm text-slate-300 hover:text-orange-500"
                          title="إبلاغ"
                        >
                          <Flag className="w-3 h-3" />
                        </Button>
                        {(user?.uid === reply.authorUid || isAdmin) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteReply(reply.id)}
                            className="h-7 w-7 rounded-full bg-white border shadow-sm text-slate-300 hover:text-red-500"
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={repliesEndRef} />
            </div>

            <Card className="rounded-md border shadow-sm bg-white overflow-hidden mt-10">
              <CardHeader className="bg-slate-50 border-b py-3 px-6">
                <CardTitle className="text-xs font-black flex items-center gap-2"><Reply className="w-3 h-3 text-primary" /> أضف ردك على النقاش</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSendReply} className="space-y-4">
                  <Textarea 
                    placeholder="اكتب ردك هنا..." 
                    className="min-h-[100px] rounded-sm bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm font-medium"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button 
                      disabled={isSending || !newReply.trim()} 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90 font-black rounded-sm h-11 px-10 gap-2 shadow-lg"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} إرسال الرد
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

