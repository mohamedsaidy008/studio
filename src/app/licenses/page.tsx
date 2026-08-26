'use client';

import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Award } from "lucide-react";

export default function LicensesPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      <DashboardSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="p-3 bg-blue-500/10 rounded-sm text-blue-600 shadow-sm border">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black">التراخيص والمصادر</h1>
              <p className="text-slate-500 font-bold text-sm">الشفافية في استخدام البرمجيات مفتوحة المصدر.</p>
            </div>
          </div>

          <Card className="rounded-md shadow-none border bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-blue-600" />
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" /> مصادرنا التقنية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8 text-slate-600 leading-loose font-medium">
              <p>تم بناء منصة OptimalCP باستخدام أحدث التقنيات البرمجية العالمية مفتوحة المصدر:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-sm bg-slate-50">
                  <span className="block font-black text-slate-900 text-sm mb-1">Next.js Framework</span>
                  <p className="text-[10px] text-slate-500 font-bold">MIT License - Copyright © Vercel, Inc.</p>
                </div>
                <div className="p-4 border rounded-sm bg-slate-50">
                  <span className="block font-black text-slate-900 text-sm mb-1">Firebase Platform</span>
                  <p className="text-[10px] text-slate-500 font-bold">Apache License 2.0 - Copyright © Google LLC.</p>
                </div>
                <div className="p-4 border rounded-sm bg-slate-50">
                  <span className="block font-black text-slate-900 text-sm mb-1">Tailwind CSS</span>
                  <p className="text-[10px] text-slate-500 font-bold">MIT License - Copyright © Tailwind Labs.</p>
                </div>
                <div className="p-4 border rounded-sm bg-slate-50">
                  <span className="block font-black text-slate-900 text-sm mb-1">ShadCN UI</span>
                  <p className="text-[10px] text-slate-500 font-bold">MIT License - Copyright © ShadCN.</p>
                </div>
              </div>

              <section className="pt-6 border-t space-y-4">
                <h3 className="text-slate-900 font-black border-r-4 border-blue-600 pr-3">المحتوى الخارجي</h3>
                <p>نحن فخورون بكوننا منصة تعتمد على بيانات <span className="font-bold text-slate-900">Codeforces</span>. يتم عرض المسائل والتقييمات وفقاً لقوانين استخدام API كودفورسز، مع توجيه المستخدمين دوماً للمنصة الأصلية للقيام بالحلول الرسمية والمشاركة في المسابقات.</p>
              </section>

              <div className="p-6 bg-blue-50/50 rounded-sm border text-center font-black text-blue-800 text-sm">
                تطوير وإشراف: استوديو آرتياتك - Artiatech Studio (ليبيا).
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
