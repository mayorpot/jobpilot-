
import { GoogleGenAI } from "@google/genai";
import { resumeAnalysisSchema } from "./resume.js";
import type {
  ResumeAIProvider,
  ResumeAnalysis,
  ResumeAnalysisInput,
} from "./resume.js";

export class GeminiResumeAIProvider implements ResumeAIProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey = process.env.GEMINI_API_KEY) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    this.client = new GoogleGenAI({ apiKey });
    this.model =
      process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  }

  async analyzeResume(
    input: ResumeAnalysisInput
  ): Promise<ResumeAnalysis> {
    const resumeText = input.resumeText.trim();

    if (!resumeText) {
      throw new Error("Resume text is empty");
    }

    // Limit input size to control cost and avoid sending
    // unnecessarily large documents to the model.
    const boundedText = resumeText.slice(0, 40_000);

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Analyze the following resume for a job-search platform.

Extract only information supported by the resume.
Do not invent skills, experience, qualifications, or achievements.
Use null when headline, summary, or years of experience cannot
be determined reliably.
Return only a JSON object with these fields:
headline, summary, skills, targetRoles, industries,
yearsExperience, employmentTypes, professionalStrengths,
missingInformation.

For missingInformation, list useful information that a candidate
could add to improve their job applications.

Resume:
${boundedText}
`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Gemini returned invalid JSON");
    }

    // Always validate model output before using or storing it.
    return resumeAnalysisSchema.parse(parsed);
  }
}
