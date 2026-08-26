
'use server';
/**
 * @fileOverview نظام تحكيم ذكي يعتمد على تحليل الذكاء الاصطناعي لمنطق الكود البرمجي.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VerifyCodeInputSchema = z.object({
  code: z.string().describe("The trainee's submitted C++ code."),
  problemId: z.string(),
  problemTitle: z.string(),
  problemStatement: z.string(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
  })).optional(),
});

const VerifyCodeOutputSchema = z.object({
  status: z.enum(['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'RUNTIME_ERROR']),
  feedback: z.string().describe('Detailed technical feedback in Arabic explaining the decision.'),
  passedCount: z.number(),
  totalCount: z.number(),
  analysis: z.string().describe('Deep logical analysis of the code efficiency and correctness.'),
});

export async function verifyCode(input: z.infer<typeof VerifyCodeInputSchema>) {
  return verifyCodeFlow(input);
}

const verifyCodeFlow = ai.defineFlow(
  {
    name: 'verifyCodeFlow',
    inputSchema: VerifyCodeInputSchema,
    outputSchema: VerifyCodeOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `You are an expert competitive programming judge. Analyze the provided C++ code logic against the problem requirements.
      
      PROBLEM CONTEXT:
      Title: ${input.problemTitle}
      Statement: ${input.problemStatement}
      Constraints: ${input.constraints?.join(', ')}
      Examples: ${JSON.stringify(input.examples)}
      
      TRAINEE CODE:
      \`\`\`cpp
      ${input.code}
      \`\`\`
      
      TASK:
      1. Check for logical correctness.
      2. Check if it handles edge cases mentioned in the constraints.
      3. Evaluate time and space complexity based on constraints.
      4. Provide a verdict (status) and detailed feedback in Arabic.
      
      Be strict. If the logic is likely to fail on large inputs even if it passes examples, mark it as WRONG_ANSWER or TIME_LIMIT_EXCEEDED.`,
      output: { schema: VerifyCodeOutputSchema }
    });
    
    if (!output) throw new Error('AI judging failed.');
    return output;
  }
);
