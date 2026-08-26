'use server';
/**
 * @fileOverview مستشار ذكي تفاعلي (Chat) لتصميم المناهج التعليمية وتوليد المحتوى الكامل للدروس مع أسئلة اختبار.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RoadmapChatInputSchema = z.object({
  stageTitle: z.string().describe('عنوان المرحلة الحالية'),
  currentLessons: z.array(z.string()).describe('الدروس الموجودة حالياً'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).describe('تاريخ المحادثة'),
  message: z.string().describe('رسالة الأدمن الجديدة'),
});

const RoadmapChatOutputSchema = z.object({
  response: z.string().describe('رد المساعد النصي للأدمن'),
  suggestedLesson: z.object({
    name: z.string().describe('عنوان الدرس المقترح'),
    type: z.enum(['video', 'practice', 'text']).describe('نوع الدرس'),
    description: z.string().describe('وصف موجز للدرس'),
    videoUrl: z.string().optional().describe('رابط يوتيوب مقترح إذا كان النوع فيديو'),
    textContent: z.string().optional().describe('المحتوى النصي الكامل للدرس إذا كان النوع نصياً أو شرح مرافق للفيديو'),
    problemSearchHint: z.string().optional().describe('تلميح للبحث عن مسألة مناسبة إذا كان النوع تمرين'),
    genTopic: z.string().optional().describe('الموضوع المقترح لتوليد مسألة جديدة إذا لم تتوفر واحدة'),
    genDifficulty: z.enum(['Easy', 'Medium', 'Hard', 'Expert']).optional().describe('الصعوبة المقترحة للتوليد'),
    quiz: z.array(z.object({
      question: z.string().describe('نص السؤال'),
      options: z.array(z.string()).describe('4 خيارات'),
      correctIndex: z.number().min(0).max(3).describe('رقم الإجابة الصحيحة (0-3)')
    })).optional().describe('أسئلة اختبار قصيرة لضمان الفهم'),
  }).optional().describe('بيانات الدرس الكاملة والنهائية'),
});

export async function roadmapChat(input: z.infer<typeof RoadmapChatInputSchema>) {
  return roadmapChatFlow(input);
}

const roadmapChatFlow = ai.defineFlow(
  {
    name: 'roadmapChatFlow',
    inputSchema: RoadmapChatInputSchema,
    outputSchema: RoadmapChatOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      system: `أنت خبير تعليمي وأكاديمي متخصص في البرمجة التنافسية. مهمتك هي مساعدة "الأدمن" في بناء محتوى تعليمي رصين لمرحلة: "${input.stageTitle}".

      سياق المرحلة الحالي:
      - الدروس المضافة: [${input.currentLessons.join(', ')}].

      قواعد العمل والإنتاج:
      1. عند الاتفاق على درس، قدم محتوى كاملاً.
      2. للدروس النصية والمرئية، قم دائماً بتوليد 2-3 أسئلة اختبار (quiz) في حقل quiz للتأكد من فهم المتدرب.
      3. لغة الرد هي العربية الفصحى والرصينة.`,
      messages: [
        ...input.history.map(m => ({ role: m.role, content: [{ text: m.content }] })),
        { role: 'user', content: [{ text: input.message }] }
      ],
      output: { schema: RoadmapChatOutputSchema },
      config: { temperature: 0.7 }
    });
    
    if (!output) throw new Error('فشل المساعد في الرد.');
    return output;
  }
);
