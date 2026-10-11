import { z } from "zod";

export const resumeAnalysisSchema = z.object({
  headline: z.string().nullable(),

  summary: z.string().nullable(),

  skills: z.array(z.string()),

  targetRoles: z.array(z.string()),

  industries: z.array(z.string()),

  yearsExperience: z.number().nullable(),

  employmentTypes: z.array(z.string()),

  professionalStrengths: z.array(z.string()),

  missingInformation: z.array(z.string()),
});

export type ResumeAnalysis = z.infer<
  typeof resumeAnalysisSchema
>;

export type ResumeAnalysisInput = {
  resumeText: string;
};

export interface ResumeAIProvider {
  analyzeResume(
    input: ResumeAnalysisInput
  ): Promise<ResumeAnalysis>;
}