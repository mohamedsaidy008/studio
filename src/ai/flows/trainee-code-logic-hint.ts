'use server';
/**
 * @fileOverview An AI Logic Mentor for competitive programming trainees.
 *
 * - traineeCodeLogicHint - A function that analyzes trainee code and failed test cases to provide logical hints.
 * - TraineeCodeLogicHintInput - The input type for the traineeCodeLogicHint function.
 * - TraineeCodeLogicHintOutput - The return type for the traineeCodeLogicHint function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TraineeCodeLogicHintInputSchema = z.object({
  code: z.string().describe("The trainee's submitted code."),
  problemStatement: z.string().describe('The problem statement or description.'),
  failedTestCaseInput: z.string().describe('The input that caused the code to fail.'),
  failedTestCaseExpectedOutput: z.string().describe('The expected output for the failed test case.'),
  failedTestCaseActualOutput: z.string().describe("The actual output produced by the trainee's code for the failed test case."),
});
export type TraineeCodeLogicHintInput = z.infer<typeof TraineeCodeLogicHintInputSchema>;

const TraineeCodeLogicHintOutputSchema = z.object({
  hint: z.string().describe('A logical hint and explanation for the failed test case, without revealing the direct solution.'),
});
export type TraineeCodeLogicHintOutput = z.infer<typeof TraineeCodeLogicHintOutputSchema>;

export async function traineeCodeLogicHint(input: TraineeCodeLogicHintInput): Promise<TraineeCodeLogicHintOutput> {
  return traineeCodeLogicHintFlow(input);
}

const traineeCodeLogicHintPrompt = ai.definePrompt({
  name: 'traineeCodeLogicHintPrompt',
  input: { schema: TraineeCodeLogicHintInputSchema },
  output: { schema: TraineeCodeLogicHintOutputSchema },
  prompt: `You are an AI Logic Mentor for competitive programming trainees. Your task is to analyze a trainee's code, the problem statement, and details of a failed test case.

Based on this information, you must provide a specific, logical hint and explanation about why their code failed this particular test case. Your explanation should guide the trainee to understand their mistake and improve their problem-solving skills, without giving them the direct answer or solution.

Focus on the logical flaw, incorrect algorithm, edge case handling, or conceptual misunderstanding that led to the incorrect output.

--- Start of Information ---
Problem Statement:
{{{problemStatement}}}


Trainee's Code:
\`\`\`cpp
{{{code}}}
\`\`\`


Failed Test Case Input:
\`\`\`
{{{failedTestCaseInput}}}
\`\`\`


Expected Output for Failed Test Case:
\`\`\`
{{{failedTestCaseExpectedOutput}}}
\`\`\`


Actual Output from Trainee's Code for Failed Test Case:
\`\`\`
{{{failedTestCaseActualOutput}}}
\`\`\`
--- End of Information ---


Your response should be a helpful hint that points out the logical error without solving the problem for them. Do NOT provide correct code or a direct solution. Keep the language encouraging and educational.`,
});

const traineeCodeLogicHintFlow = ai.defineFlow(
  {
    name: 'traineeCodeLogicHintFlow',
    inputSchema: TraineeCodeLogicHintInputSchema,
    outputSchema: TraineeCodeLogicHintOutputSchema,
  },
  async (input) => {
    const { output } = await traineeCodeLogicHintPrompt(input);
    return output!;
  }
);
