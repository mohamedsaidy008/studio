'use client';

import { useState, useEffect } from "react";
import { loginWithGoogle, useUser, logout, auth, db, rtdb } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Chrome, Eye, EyeOff, Loader2, MailCheck, RefreshCcw, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification,
  sendPasswordResetEmail,
  reload
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ARAB_COUNTRIES } from "@/lib/countries";

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="5" fill="#1e40af"/>
    <path d="M30 40L15 50L30 60" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M70 40L85 50L70 60" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M40 70L60 30" stroke="white" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

const getAuthErrorMessage = (code: string) => {
  switch (code) {
    case 'auth/email-already-in-use': return "هذا البريد الإلكتروني مسجل بالفعل. حاول تسجيل الدخول.";
    case 'auth/invalid-email': return "عنوان البريد الإلكتروني غير صالح.";
    case 'auth/weak-password': return "كلمة المرور ضعيفة جداً. استخدم 6 رموز على الأقل.";
    case 'auth/user-not-found': return "لا يوجد حساب مسجل بهذا البريد الإلكتروني.";
    case 'auth/wrong-password': return "كلمة المرور غير صحيحة.";
    case 'auth/invalid-credential': return "بيانات الدخول غير صحيحة.";
    case 'auth/popup-blocked': return "تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة للموقع والمحاولة مجدداً.";
    case 'auth/cancelled-popup-request': return "تم إلغاء عملية الدخول.";
    case 'auth/network-request-failed': return "فشل الاتصال بالخادم. تحقق من اتصال الإنترنت.";
    case 'auth/too-many-requests': return "محاولات كثيرة خاطئة. تم حظر الدخول مؤقتاً.";
    default: return "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.";
  }
};

export default function LoginPage() {
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("LY");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      if (user.emailVerified || user.providerData[0]?.providerId === 'google.com') {
        const checkVerificationStatus = async () => {
          try {
            const userDoc = await getDoc(doc(db, `users/${user.uid}`));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.role === 'admin' || (data.username && data.username !== 'مبرمج_طموح')) {
                router.push("/roadmap");
              } else {
                router.push("/setup");
              }
            } else {
               router.push("/setup");
            }
          } catch (e) {
            console.error("Error checking verification status:", e);
            router.push("/setup");
          }
        };
        checkVerificationStatus();
      } else {
        setVerificationSent(true);
      }
    }
  }, [user, authLoading, router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualVerifyCheck = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        toast({ title: "تم التحقق بنجاح" });
        window.location.reload();
      } else {
        toast({ variant: "destructive", title: "لم يتم التفعيل بعد" });
      }
    } catch (e: any) {
      console.error("Manual verify error:", e);
      toast({ variant: "destructive", title: "خطأ في التحديث" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("يرجى إدخال البريد الإلكتروني أولاً لإرسال رابط استعادة كلمة المرور.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "تم إرسال الرابط",
        description: "يرجى تفقد بريدك الإلكتروني لإعادة تعيين كلمة المرور."
      });
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbortVerification = async () => {
    await logout();
    setVerificationSent(false);
    setError("");
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isRegister) {
        if (password !== confirmPassword) throw new Error("كلمات المرور غير متطابقة");
        const usernameRef = ref(rtdb, `usernames/${username.toLowerCase()}`);
        const snap = await get(usernameRef);
        if (snap.exists()) throw new Error("اسم المستخدم محجوز مسبقاً.");

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        await updateProfile(newUser, { displayName: username });
        
        const userData = {
          uid: newUser.uid,
          username: username,
          email: email,
          country: country,
          createdAt: new Date().toISOString(),
          xp: 0,
          solved: 0,
          role: (email === 'artiateech@gmail.com' || email === 'artiatechstudio@gmail.com') ? 'admin' : 'trainee'
        };

        await setDoc(doc(db, "users", newUser.uid), userData);
        await set(ref(rtdb, `users/${newUser.uid}`), userData);
        await set(ref(rtdb, `usernames/${username.toLowerCase()}`), newUser.uid);
        await sendEmailVerification(newUser);
        setVerificationSent(true);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) setVerificationSent(true);
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      setError(err.code ? getAuthErrorMessage(err.code) : (err.message || "فشل تسجيل الدخول"));
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <Card className="w-full max-w-md text-center p-8 space-y-6 rounded-sm border shadow-none bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <MailCheck className="w-16 h-16 text-primary mx-auto opacity-20" />
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black">تحقق من بريدك!</CardTitle>
            <p className="text-muted-foreground text-sm font-bold leading-relaxed">
              أرسلنا رابط تأكيد إلى: <br/> 
              <span className="font-black text-slate-800 underline" dir="ltr">{user?.email || email}</span>
            </p>
          </div>
          <div className="grid gap-3 pt-4">
            <Button onClick={handleManualVerifyCheck} disabled={isLoading} className="w-full h-12 font-black bg-primary gap-2 rounded-sm shadow-none">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              لقد قمت بالتفعيل، تابع الآن
            </Button>
            <Button onClick={handleAbortVerification} variant="ghost" className="w-full h-10 font-bold text-slate-400">
              العودة لتغيير الحساب
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <Card className="w-full max-w-md border rounded-sm shadow-none bg-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <CardHeader className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-2"><Logo /><span className="text-2xl font-black text-slate-900">OptimalCP</span></Link>
          <CardTitle className="text-2xl font-black text-slate-900">{isRegister ? "إنشاء حساب مبرمج" : "تسجيل الدخول"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegister && (
              <div className="space-y-4">
                <div className="space-y-1 text-right">
                  <Label className="font-black text-[10px] text-slate-400 uppercase">اسم المستخدم</Label>
                  <Input placeholder="code_master" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11 font-bold rounded-sm border-2" />
                </div>
                <div className="space-y-1 text-right">
                  <Label className="font-black text-[10px] text-slate-400 uppercase">الدولة</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-11 font-bold rounded-sm border-2" dir="rtl"><SelectValue /></SelectTrigger>
                    <SelectContent align="end" className="max-h-[250px] rounded-sm">{ARAB_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code} className="text-right">{c.flag} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-1 text-right">
              <Label className="font-black text-[10px] text-slate-400 uppercase">البريد الإلكتروني</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="h-11 font-bold rounded-sm border-2" />
            </div>
            <div className="space-y-1 text-right">
              <div className="flex justify-between items-center">
                <Label className="font-black text-[10px] text-slate-400 uppercase">كلمة المرور</Label>
                {!isRegister && (
                  <button 
                    type="button" 
                    onClick={handleResetPassword}
                    className="text-[10px] font-black text-primary hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" className="h-11 font-bold pl-10 rounded-sm border-2" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            {isRegister && (
              <div className="space-y-1 text-right">
                <Label className="font-black text-[10px] text-slate-400 uppercase">تأكيد كلمة المرور</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required dir="ltr" className="h-11 font-bold pl-10 rounded-sm border-2" />
              </div>
            )}
            {error && <div className="p-3 rounded-sm bg-red-50 text-red-600 text-[11px] font-black text-right border border-red-100 flex items-start gap-2 leading-relaxed animate-in fade-in"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
            <Button className="w-full font-black h-12 bg-primary hover:bg-primary/90 rounded-sm text-base shadow-none gap-2" disabled={isLoading} type="submit">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? <><ArrowRight className="w-4 h-4" /> إنشاء حساب</> : "دخول المنصة")}
            </Button>
          </form>
          <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-3 text-slate-400 font-black">أو</span></div></div>
          <Button variant="outline" className="w-full h-12 font-black gap-3 text-xs rounded-sm border-2" onClick={handleGoogleLogin} disabled={isLoading}>
            <Chrome className="w-5 h-5 text-primary" /> المتابعة باستخدام Google
          </Button>
          <p className="text-center text-xs text-slate-500 font-bold">
            {isRegister ? "لديك حساب؟" : "ليس لديك حساب؟"}
            <button onClick={() => { setIsRegister(!isRegister); setError(""); setVerificationSent(false); }} className="text-primary font-black mr-2 hover:underline">
              {isRegister ? "سجل دخولك" : "انشئ حساب جديد"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
