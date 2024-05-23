import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { Readable } from "stream";
import { v1 as uuidv1 } from "uuid";
require("dotenv").config();

const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!containerName || !connectionString) {
  throw new Error(
    "Azure Storage container name and connection string must be provided"
  );
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function uploadFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (!request.body) {
    return {
      status: 400,
      body: "Please pass a file in the request body",
    };
  }

  const fileId = uuidv1();
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(fileId + ".docx");

  try {
    await blobClient.uploadData(
      await streamToBuffer(Readable.from(request.body))
    );
    context.log("File uploaded successfully. File Id: ", fileId);
  } catch (error) {
    return {
      status: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }

  // return the file id as json string
  return {
    status: 200,
    body: JSON.stringify({ fileId }),
  };
}

app.http("upload", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: uploadFunction,
});
