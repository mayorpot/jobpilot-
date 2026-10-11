export type StructuredResume = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;

  headline: string | null;
  summary: string | null;

  skills: string[];

  experience: Array<{
    jobTitle: string | null;
    company: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string[];
  }>;

  education: Array<{
    institution: string | null;
    qualification: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
  }>;

  certifications: string[];

  languages: string[];

  targetRoles: string[];
};