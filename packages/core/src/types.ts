export type LetterStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "ERROR";

export type Letter = {
  id: string;
  nhsNumber: string | null;
  fileName: string;
  s3Key: string;
  summary: string | null;
  status: LetterStatus;
  error: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type PresignedUrlResponse = {
  uploadUrl: string;
  s3Key: string;
};