'use client';

import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="p-3 bg-primary/10 rounded-sm text-primary shadow-sm border">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black">سياسة الخصوصية</h1>
              <p className="text-slate-500 font-bold text-sm">التزامنا بحماية بيانات المبرمجين في OptimalCP.</p>
            </div>
          </div>

          <Card className="rounded-sm shadow-none border bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> كيف نتعامل مع بياناتك
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10 text-slate-600 leading-loose font-medium">
              
              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-primary pr-3">1. جمع المعلومات الأساسية</h3>
                <p>نحن نجمع بيانات التسجيل الأساسية (الاسم، البريد الإلكتروني، وصورة الملف الشخصي) عبر موفر الخدمة Google لغرض إنشاء ملفك الشخصي الأكاديمي وتتبع تقدمك في خارطة الطريق.</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-primary pr-3">2. التعامل مع بيانات Codeforces</h3>
                <p>عند ربط حسابك في Codeforces، نقوم بالوصول إلى بياناتك العامة (التقييم، الرتبة، سجل المسابقات، والحلول) لغرض المزامنة وتوثيق الإنجازات في OptimalCP. نحن لا نطلب ولا نخزن كلمات مرور حساباتك الخارجية مطلقاً.</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-primary pr-3">3. أمان وتشفير البيانات</h3>
                <p>تُخزن كافة البيانات في خوادم Google Cloud (Firebase) المشفرة، ونضمن عدم مشاركة بياناتك الشخصية مع أي طرف ثالث لأغراض إعلانية أو تجارية.</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-primary pr-3">4. ملفات تعريف الارتباط (Cookies)</h3>
                <p>نستخدم ملفات تعريف الارتباط الضرورية فقط لضمان بقاء جلسة دخولك نشطة ولتوفير تجربة تصفح سريعة ومنتظمة.</p>
              </section>

              <div className="pt-10 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-slate-400">
                <span>تاريخ آخر تحديث: يونيو 2026</span>
                <span className="uppercase tracking-widest text-slate-300">إشراف استوديو آرتياتك - Artiatech Studio</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
