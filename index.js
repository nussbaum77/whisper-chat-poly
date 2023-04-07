import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createRequest, createPresignedURL } from "@aws-sdk/s3-request-presigner";
import openai from "openai";

// Configure OpenAI API Key
openai.apiKey = "your_openai_api_key";

// Configure AWS S3
const s3Client = new S3Client({
  region: "your_aws_region",
  credentials: {
    accessKeyId: "your_aws_access_key_id",
    secretAccessKey: "your_aws_secret_access_key",
  },
});

async function transcribeAudioFromS3(bucketName, objectKey) {
  try {
    // Get the object from S3
    const getObjectParams = { Bucket: bucketName, Key: objectKey };
    const getObjectCommand = new GetObjectCommand(getObjectParams);

    // Generate a pre-signed URL for the audio file
    const request = createRequest(s3Client, getObjectCommand);
    const presignedUrl = await createPresignedURL(s3Client, getObjectCommand, request, {
      expiresIn: 3600, // 1 hour
    });

    // Transcribe the audio using OpenAI API
    const response = await openai.Audio.create({
      url: presignedUrl,
      language_model: "your_language_model", // e.g., "base"
    });

    // Poll the transcription status
    let transcription = await openai.Audio.retrieve(response.id);

    while (transcription.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
      transcription = await openai.Audio.retrieve(response.id);
    }

    if (transcription.status === "completed") {
      console.log("Transcription: ", transcription.text);
    } else {
      console.error("Transcription failed. Status: ", transcription.status);
    }
  } catch (error) {
    console.error("Error: ", error);
  }
}

// Replace with your bucket name and object key
const bucketName = "your_bucket_name";
const objectKey = "path/to/your/audio_file.mp3";

transcribeAudioFromS3(bucketName, objectKey);
