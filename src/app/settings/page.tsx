'use client';

import { useState, useEffect } from "react";
import { useUser, useFirebase } from "@/firebase";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  User, 
  Loader2, 
  MessageSquarePlus, 
  LifeBuoy,
  Send,
  Code2
} from "lucide-react";
import { ref, update as updateRtdb, get, set as setRtdb, remove } from "firebase/database";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ARAB_COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const { db, rtdb } = useFirebase();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTicket, setIsSendingTicket] = useState(false);
  const [profile, setProfile] = useState<any>({"username": "", "country": "LY", "cfHandle": ""});
  const [oldUsername, setOldUsername] = useState("");

  const [ticket, setTicket] = useState({ subject: "", message: "" });
  const [userTickets, setUserTickets] = useState<any[]>([]);

  useEffect(() => {
    document.title = "الإعدادات";
    if (user && db) {
      const userDocRef = doc(db, `users/${user.uid}`);
      getDoc(userDocRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const uname = data.username || user.displayName || "";
          setProfile({
            username: uname,
            country: data.country || "LY",
            cfHandle: data.cfHandle || ""
          });
          setOldUsername(uname);
        }
      });

      const ticketsQ = query(collection(db, "support_tickets"), where("uid", "==", user.uid));
      const unsubTickets = onSnapshot(ticketsQ, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserTickets(list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      });
      return () => unsubTickets();
    }
  }, [user, db]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !rtdb) return;

    const newUsername = profile.username.trim().toLowerCase();
    if (newUsername.length < 3) {
      toast({ variant: "destructive", title: "اسم المستخدم قصير جداً" });
      return;
    }

    setIsLoading(true);
    try {
      if (newUsername !== oldUsername.toLowerCase()) {
        const nameRef = ref(rtdb, `usernames/${newUsername}`);
        const nameSnap = await get(nameRef);
        if (nameSnap.exists() && nameSnap.val() !== user.uid) {
          toast({ variant: "destructive", title: "عذراً، هذا الاسم محجوز مسبقاً." });
          setIsLoading(false);
          return;
        }
        if (oldUsername) await remove(ref(rtdb, `usernames/${oldUsername.toLowerCase()}`));
        await setRtdb(ref(rtdb, `usernames/${newUsername}`), user.uid);
      }

      const updates = { username: profile.username, country: profile.country, cfHandle: profile.cfHandle };
      await updateDoc(doc(db, `users/${user.uid}`), updates);
      await updateRtdb(ref(rtdb, `users/${user.uid}`), updates);
      
      setOldUsername(profile.username);
      toast({ title: "تم تحديث الإعدادات بنجاح ✨" });
    } catch (e) { 
      console.error("Error updating settings:", e);
      toast({ variant: "destructive", title: "فشل التحديث" }); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !ticket.subject || !ticket.message) return;
    setIsSendingTicket(true);
    try {
      await addDoc(collection(db, "support_tickets"), {
        uid: user.uid,
        username: profile.username,
        email: user.email,
        subject: ticket.subject,
        message: ticket.message,
        status: "open",
        createdAt: serverTimestamp()
      });
      setTicket({ subject: "", message: "" });
      toast({ title: "تم إرسال بلاغك بنجاح" });
    } catch (e) {
      console.error("Error sending support ticket:", e);
      toast({ variant: "destructive", title: "فشل الإرسال" });
    }
    finally { setIsSendingTicket(false); }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border rounded-sm text-primary shadow-sm"><Settings className="w-6 h-6" /></div>
            <h1 className="text-2xl font-black">إعدادات المنصة</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-3 space-y-12">
              <Card className="rounded-sm shadow-none border">
                <CardHeader className="border-b bg-slate-50/50 py-4"><CardTitle className="text-sm font-black flex items-center gap-2">الملف الأكاديمي <User className="w-4 h-4 text-slate-400" /></CardTitle></CardHeader>
                <CardContent className="pt-8">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-xs text-slate-500">اسم المستخدم</Label>
                          <Input value={profile.username} onChange={(e) => setProfile({...profile, username: e.target.value.replace(/\s/g, '_')})} className="h-11 rounded-sm font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs text-slate-500">Codeforces Handle</Label>
                          <div className="relative">
                            <Input placeholder="tourist" value={profile.cfHandle} onChange={(e) => setProfile({...profile, cfHandle: e.target.value})} dir="ltr" className="h-11 rounded-sm font-bold" />
                            <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs text-slate-500">الدولة</Label>
                      <Select value={profile.country} onValueChange={(v) => setProfile({...profile, country: v})}>
                         <SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger>
                         <SelectContent className="max-h-[250px]">{ARAB_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code} className="text-right">{c.flag} {c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-11 bg-primary font-black shadow-md">حفظ كافة التغييرات</Button>
                  </form>
                </CardContent>
              </Card>

              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-4"><LifeBuoy className="w-6 h-6 text-primary" /><h2 className="text-xl font-black">نظام الدعم الفني</h2></div>
                <Card className="rounded-sm shadow-none border bg-white">
                  <CardHeader className="border-b bg-slate-50/30 py-4"><CardTitle className="text-xs font-black flex items-center gap-2"><MessageSquarePlus className="w-4 h-4" /> إرسال بلاغ جديد</CardTitle></CardHeader>
                  <CardContent className="pt-8">
                    <form onSubmit={handleSendTicket} className="space-y-4">
                      <Input placeholder="الموضوع..." value={ticket.subject} onChange={(e) => setTicket({...ticket, subject: e.target.value})} className="h-11" />
                      <Textarea placeholder="التفاصيل..." value={ticket.message} onChange={(e) => setTicket({...ticket, message: e.target.value})} className="min-h-[120px]" />
                      <Button disabled={isSendingTicket || !ticket.subject || !ticket.message} className="w-full h-12 bg-primary font-black gap-2 shadow-sm">
                        {isSendingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} إرسال للأدمن
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  {userTickets.map(t => (
                    <Card key={t.id} className="rounded-sm border shadow-none bg-white">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center"><h4 className="font-black text-sm">{t.subject}</h4><Badge className="text-[9px]">{t.status === 'open' ? 'قيد المراجعة' : 'تم الحل'}</Badge></div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-sm border border-dashed">{t.message}</p>
                        {t.reply && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-sm text-xs font-bold text-emerald-800">{t.reply}</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
