'use client';

import { useState, useEffect } from "react";
import { useUser, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  User,
  ArrowRight,
  Sparkles,
  MapPin
} from "lucide-react";
import { ref, update as updateRtdb, get } from "firebase/database";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ARAB_COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

export default function OnboardingSetupPage() {
  const { user, loading: authLoading } = useUser();
  const { db, rtdb } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: "",
    country: "",
    cfHandle: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const checkStatus = async () => {
      const userDoc = await getDoc(doc(db!, `users/${user.uid}`));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // إذا كان لديه اسم مستخدم ودولة، فهو جاهز
        if (data.username && data.username !== 'مبرمج_طموح' && data.country) {
          router.push("/roadmap");
          return;
        }
        setFormData({
          username: data.username === 'مبرمج_طموح' ? "" : (data.username || ""),
          country: data.country || "",
          cfHandle: data.cfHandle || ""
        });
      }
      setLoading(false);
    };
    checkStatus();
  }, [user, authLoading, db, router]);

  const handleCompleteSetup = async () => {
    if (!formData.username.trim() || formData.username.length < 3) {
      setUsernameError("اسم المستخدم قصير جداً");
      return;
    }
    
    if (!formData.country) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى اختيار دولتك للمتابعة." });
      return;
    }

    setIsSaving(true);
    setUsernameError("");
    try {
      // فحص توفر الاسم
      const usernameRef = ref(rtdb!, `usernames/${formData.username.toLowerCase()}`);
      const snap = await get(usernameRef);
      if (snap.exists() && snap.val() !== user?.uid) {
        setUsernameError("عذراً، هذا الاسم محجوز لمبرمج آخر.");
        setIsSaving(false);
        return;
      }

      const updates = { 
        username: formData.username,
        country: formData.country,
        cfHandle: formData.cfHandle,
        lastActivity: new Date().toISOString()
      };
      
      await updateDoc(doc(db!, `users/${user!.uid}`), updates);
      await updateRtdb(ref(rtdb!, `users/${user!.uid}`), updates);
      await updateRtdb(ref(rtdb!, `usernames/${formData.username.toLowerCase()}`), user!.uid);
      
      toast({ title: "تم إكمال الملف الشخصي بنجاح ✨" });
      router.push("/roadmap");
    } catch (e) {
      console.error("Error saving setup data:", e);
      toast({ variant: "destructive", title: "فشل حفظ البيانات" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-right" dir="rtl">
      <div className="max-w-xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center space-y-3">
           <div className="w-16 h-16 bg-primary/10 rounded-sm flex items-center justify-center mx-auto text-primary border-2 border-primary/20">
              <Sparkles className="w-8 h-8" />
           </div>
           <h1 className="text-3xl font-black text-slate-900">مرحباً بك في OptimalCP</h1>
           <p className="text-slate-500 font-bold text-sm">لنقم بإعداد هويتك البرمجية لتبدأ رحلة الاحتراف.</p>
        </div>

        <Card className="rounded-md border-2 border-slate-100 shadow-sm bg-white overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-xs font-black flex items-center gap-2 text-slate-900"><User className="w-4 h-4 text-primary" /> إكمال البيانات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] text-slate-400 uppercase">اسم المستخدم الفريد</Label>
                <Input 
                    placeholder="مثال: code_master" 
                    value={formData.username} 
                    onChange={(e) => setFormData({...formData, username: e.target.value.replace(/\s/g, '_')})} 
                    dir="ltr" 
                    className={cn("h-12 font-black rounded-sm border-2", usernameError ? "border-red-200 focus:border-red-500" : "focus:border-primary")} 
                />
                {usernameError && <p className="text-[10px] font-bold text-red-500">{usernameError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="font-black text-[10px] text-slate-400 uppercase">الدولة</Label>
                <Select value={formData.country} onValueChange={(v) => setFormData({...formData, country: v})}>
                    <SelectTrigger className="h-12 font-bold"><SelectValue placeholder="اختر دولتك..." /></SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {ARAB_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code} className="text-right">{c.flag} {c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-black text-[10px] text-slate-400 uppercase">Codeforces Handle (اختياري)</Label>
                <Input 
                    placeholder="مثال: tourist" 
                    value={formData.cfHandle} 
                    onChange={(e) => setFormData({...formData, cfHandle: e.target.value})} 
                    dir="ltr" 
                    className="h-12 font-black rounded-sm border-2 focus:border-primary" 
                />
                <p className="text-[10px] text-slate-400">يمكنك ربطه لاحقاً من الإعدادات لمزامنة حلولك.</p>
              </div>

              <Button onClick={handleCompleteSetup} disabled={isSaving || !formData.username || !formData.country} className="w-full h-12 bg-primary font-black gap-2 mt-4 shadow-lg">
                {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Sparkles className="w-4 h-4" /> ابدأ رحلة التعلم الآن</>}
              </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-sm text-blue-700">
           <MapPin className="w-5 h-5 shrink-0" />
           <p className="text-[10px] font-black leading-relaxed">
              تنبيه: سيتم عرض اسمك ودولتك في لوحة المتصدرين العامة للمنصة.
           </p>
        </div>
      </div>
    </div>
  );
}
