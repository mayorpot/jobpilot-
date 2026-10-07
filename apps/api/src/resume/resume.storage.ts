import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase storage configuration is missing");
}

const bucket = process.env.SUPABASE_RESUME_BUCKET ?? "resumes";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function uploadResume(
  userId: string,
  fileName: string,
  file: Buffer,
  contentType: string
) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${crypto.randomUUID()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Resume upload failed: ${error.message}`);
  }

  return {
    storagePath,
    bucket,
  };
}

export async function createResumeDownloadUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 5);

  if (error || !data?.signedUrl) {
    throw new Error("Unable to create resume download link");
  }

  return data.signedUrl;
}

export async function deleteResumeFile(storagePath: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Resume deletion failed: ${error.message}`);
  }
}