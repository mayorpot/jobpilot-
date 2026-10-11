import type { StructuredResume } from "./resume.types.js";

const COMMON_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C#",
  "C++",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Node.js",
  "React",
  "Next.js",
  "Express",
  "Git",
  "GitHub",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Google Cloud",
  "Power BI",
  "Tableau",
  "Excel",
  "Pandas",
  "NumPy",
  "TensorFlow",
  "PyTorch",
  "Machine Learning",
  "Data Analysis",
  "Data Engineering",
  "Project Management",
];

export function analyzeResumeText(text: string): StructuredResume {
  const normalized = text.replace(/\r/g, "").trim();

  return {
    fullName: extractName(normalized),
    email: extractEmail(normalized),
    phone: extractPhone(normalized),
    location: extractLocation(normalized),

    headline: extractSection(
      normalized,
      ["professional title", "headline", "profile"]
    ),

    summary: extractSection(
      normalized,
      ["professional summary", "summary", "profile", "objective"]
    ),

    skills: extractSkills(normalized),

    experience: [],

    education: [],

    certifications: [],

    languages: [],

    targetRoles: [],
  };
}

function extractName(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 5)) {
    if (
      line.length >= 3 &&
      line.length <= 80 &&
      !line.includes("@") &&
      !/\d{3,}/.test(line)
    ) {
      return line;
    }
  }

  return null;
}

function extractEmail(text: string): string | null {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match?.[0] ?? null;
}

function extractPhone(text: string): string | null {
  const match = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/
  );

  return match?.[0]?.trim() ?? null;
}

function extractLocation(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const locationPattern =
    /\b(Lagos|Abuja|Port Harcourt|Ibadan|Kano|Kaduna|Benin City|Enugu|London|Toronto|New York|Dubai)\b/i;

  for (const line of lines.slice(0, 15)) {
    if (locationPattern.test(line) && line.length < 100) {
      return line;
    }
  }

  return null;
}

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();

  return COMMON_SKILLS.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );
}

function extractSection(
  text: string,
  headings: string[]
): string | null {
  const lines = text.split("\n");

  for (let index = 0; index < lines.length; index++) {
    const current = lines[index].trim().toLowerCase();

    if (!headings.some((heading) => current === heading)) {
      continue;
    }

    const content: string[] = [];

    for (
      let next = index + 1;
      next < lines.length && content.length < 8;
      next++
    ) {
      const line = lines[next].trim();

      if (!line) {
        if (content.length > 0) {
          break;
        }

        continue;
      }

      if (isLikelyHeading(line)) {
        break;
      }

      content.push(line);
    }

    if (content.length > 0) {
      return content.join(" ");
    }
  }

  return null;
}

function isLikelyHeading(line: string): boolean {
  const normalized = line.trim().toLowerCase();

  const headings = [
    "experience",
    "work experience",
    "employment",
    "education",
    "skills",
    "technical skills",
    "certifications",
    "projects",
    "languages",
    "references",
    "professional summary",
    "summary",
    "objective",
  ];

  return headings.includes(normalized);
}