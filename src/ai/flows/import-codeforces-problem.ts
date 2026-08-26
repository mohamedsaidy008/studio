'use server';
/**
 * @fileOverview نظام استيراد المسائل المطور: يدعم الروابط العامة وروابط المجموعات (Groups) مع ترجمة احترافية.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImportProblemInputSchema = z.object({
  url: z.string().url().describe('رابط المسألة من موقع Codeforces أو Group.'),
});

const ImportProblemOutputSchema = z.object({
  id: z.string().describe('المعرف الرسمي للمسألة المستخرج من الرابط (مثلاً 123A أو 1A).'),
  title: z.string().describe('عنوان المسألة باللغة العربية الفصحى.'),
  statement: z.string().describe('وصف المسألة الكامل مترجماً بدقة أكاديمية من المحتوى الفعلي للرابط.'),
  inputFormat: z.string().describe('تنسيق الإدخال بالتفصيل كما ورد في المصدر.'),
  outputFormat: z.string().describe('تنسيق الإخراج بالتفصيل كما ورد في المصدر.'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Expert']).describe('مستوى الصعوبة بناءً على التقييم الرقمي الرسمي.'),
  rating: z.number().describe('التقييم الرقمي الرسمي (Rating) المستخرج من صفحة المسألة.'),
  category: z.string().describe('التصنيف الأساسي للمسألة (مثل: Greedy, DP, Math).'),
  timeLimit: z.string().default('1.0s'),
  memoryLimit: z.string().default('256MB'),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string().optional(),
  })).describe('أمثلة حالات الاختبار (Input/Output) المستخرجة نصياً من الرابط.'),
  hints: z.object({
    solution: z.string().describe('الحل النموذجي بلغة C++ حصراً للمسألة الموجودة في الرابط.'),
  }),
});

export async function importCodeforcesProblem(url: string) {
  return importCodeforcesFlow({ url });
}

const importCodeforcesFlow = ai.defineFlow(
  {
    name: 'importCodeforcesFlow',
    inputSchema: ImportProblemInputSchema,
    outputSchema: ImportProblemOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await ai.generate({
        system: `أنت خبير في البرمجة التنافسية ومترجم أكاديمي. مهمتك هي قراءة محتوى الرابط المقدم بدقة واستخراج البيانات منه.
        
        قواعد العمل الصارمة:
        1. القراءة الحقيقية: الرابط قد يكون رابطاً عاماً أو رابطاً داخل مجموعة (Group). اقرأ المحتوى الفعلي في الرابط حالياً.
        2. المعرف (ID): استخرج رقم الكونتست وحرف المسألة ليكون هو الـ ID. (مثلاً في روابط المجموعات contest/429548/problem/A المعرف هو 429548A).
        3. الدقة في الأرقام: استخرج القيود (Constraints) والتقييم (Rating) كما هي مكتوبة تماماً.
        4. جودة الترجمة: استخدم مصطلحات برمجية عربية رصينة.
        5. الصعوبة الصارمة: 
           - Rating < 1200 -> Easy
           - 1200 <= Rating < 1600 -> Medium
           - 1600 <= Rating < 2100 -> Hard
           - Rating >= 2100 -> Expert`,
        prompt: `قم باستخراج وترجمة المسألة البرمجية من الرابط التالي: ${input.url}`,
        output: { schema: ImportProblemOutputSchema },
        config: { 
          temperature: 0.1,
        }
      });
      
      if (!output) throw new Error('AI failed to return structured data');
      return output;
    } catch (error: any) {
      console.error("Import Error:", error);
      throw new Error("فشل استيراد المسألة. يرجى التأكد من الرابط أو المحاولة لاحقاً.");
    }
  }
);
