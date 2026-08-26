'use client';

import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, AlertCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="p-3 bg-orange-500/10 rounded-sm text-orange-600 shadow-sm border">
              <Scale className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black">شروط الاستخدام</h1>
              <p className="text-slate-500 font-bold text-sm">القوانين المنظمة لمنصة التدريب البرمجي OptimalCP.</p>
            </div>
          </div>

          <Card className="rounded-sm shadow-none border bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-orange-500" />
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" /> القواعد العامة والرقابة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10 text-slate-600 leading-loose font-medium">
              
              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-orange-500 pr-3">1. الملكية والتشغيل</h3>
                <p>منصة OptimalCP هي مشروع تعليمي مملوك ومدار بالكامل من قبل استوديو آرتياتك (Artiatech Studio). كافة الحقوق محفوظة للمطورين والمشرفين.</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-orange-500 pr-3">2. نظام البلاغات والرقابة الآلية</h3>
                <p>تعتمد المنصة نظام رقابة مجتمعي؛ حيث يمكن للأعضاء الإبلاغ عن المحتوى المخالف. في حال وصول البلاغات إلى الحد المقرر (5 بلاغات)، يتم إخفاء المحتوى تلقائياً لمراجعته من قبل الإدارة. يحق للأدمن حذف المحتوى نهائياً أو استعادته إذا ثبتت سلامته.</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-orange-500 pr-3">3. حدود المشاركة اليومية</h3>
                <p>لضمان جودة المحتوى ومنع الإغراق (Spam)، يلتزم المستخدم بحدود نشر يومية: موضوعان جديدان (Topics) و10 ردود (Replies) كحد أقصى. يتم تصفير هذه الحدود يومياً في منتصف الليل.</p>
              </section>

              <section className="space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-orange-500 pr-3">4. النزاهة وحظر الحسابات</h3>
                <p>يمنع الغش البرمجي أو استخدام الذكاء الاصطناعي بشكل يخل بالتعلم. يحق للإدارة حظر أي حساب يسيء استخدام نظام البلاغات أو يتجاوز القواعد الأخلاقية للمنصة.</p>
              </section>

              <div className="p-6 bg-slate-50 rounded-sm border-2 border-dashed border-slate-200 text-center text-xs font-bold italic">
                تم تحديث هذه الشروط في يونيو 2026 لتشمل قوانين الرقابة المجتمعية والحدود اليومية.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
