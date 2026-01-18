import { Resource } from "sst";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Route } from "./+types/api.upload";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fileName = url.searchParams.get("fileName");

  if (!fileName) {
    return Response.json(
      { error: "fileName is required" },
      { status: 400 }
    );
  }

  // Generate unique S3 key
  const s3Key = `uploads/${crypto.randomUUID()}/${fileName}`;

  // Create presigned URL
  const client = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: Resource.LettersBucket.name,
    Key: s3Key,
    ContentType: "application/pdf",
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 3600, // 1 hour
  });

  return Response.json({ uploadUrl, s3Key });
}