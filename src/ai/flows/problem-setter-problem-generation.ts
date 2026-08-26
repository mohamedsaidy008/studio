'use server';
/**
 * @fileOverview A Genkit flow for generating competitive programming problem statements with pre-generated hints.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProblemSetterProblemGenerationInputSchema = z.object({
  topic: z.string().describe('The topic for the problem (e.g., Dynamic Programming).'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Expert']).describe('Difficulty level.'),
});

const ProblemSetterProblemGenerationOutputSchema = z.object({
  title: z.string().describe('The title of the problem.'),
  problemStatement: z.string().describe('Full description.'),
  inputFormat: z.string().describe('Input format.'),
  outputFormat: z.string().describe('Output format.'),
  exampleCases: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string(),
  })),
  constraints: z.array(z.string()),
  timeLimit: z.string(),
  memoryLimit: z.string(),
  hints: z.object({
    simple: z.string().describe('Basic hint.'),
    clear: z.string().describe('Clear logic hint.'),
    comprehensive: z.string().describe('Algorithm hint.'),
    solution: z.string().describe('Final C++ solution.'),
  }),
});

export async function problemSetterProblemGeneration(input: z.infer<typeof ProblemSetterProblemGenerationInputSchema>) {
  return problemSetterProblemGenerationFlow(input);
}

const problemSetterProblemGenerationFlow = ai.defineFlow(
  {
    name: 'problemSetterProblemGenerationFlow',
    inputSchema: ProblemSetterProblemGenerationInputSchema,
    outputSchema: ProblemSetterProblemGenerationOutputSchema,
  },
  async input => {
    const {output} = await ai.generate({
      prompt: `Create a professional competitive programming problem statement for the topic "${input.topic}" with difficulty "${input.difficulty}".
      Also generate 4 levels of hints: simple, clear, comprehensive, and a final C++ solution.
      Output everything in Arabic (except the code).`,
      output: { schema: ProblemSetterProblemGenerationOutputSchema }
    });
    if (!output) throw new Error('Failed to generate problem.');
    return output;
  }
);
