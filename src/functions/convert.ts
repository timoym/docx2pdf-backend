import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  CreatePDFJob,
  CreatePDFResult,
  PDFServices,
  SDKError,
  MimeType,
  ServiceApiError,
  ServicePrincipalCredentials,
  ServiceUsageError,
} from "@adobe/pdfservices-node-sdk";
import { BlobServiceClient } from "@azure/storage-blob";
import { Readable } from "stream";
require("dotenv").config();

const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!containerName || !connectionString) {
  throw new Error(
    "Azure Storage container name and connection string must be provided"
  );
}

export async function convertFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const fileId = request.query.get("fileId");
  if (!fileId) {
    return {
      status: 400,
      body: JSON.stringify({
        error: "Please pass a fileId in the query string",
      }),
    };
  }
  try {
    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.PDF_SERVICES_CLIENT_ID,
      clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
    });
    const pdfServices = new PDFServices({ credentials });

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlockBlobClient(fileId + ".docx");

    //check if blob exists
    const exists = await blobClient.exists();
    if (!exists) {
      return {
        status: 404,
        body: JSON.stringify({
          error: "File not found",
        }),
      };
    }

    const inputAsset = await pdfServices.upload({
      readStream: Readable.from(await blobClient.downloadToBuffer()),
      mimeType: MimeType.DOCX,
    });
    const job = new CreatePDFJob({ inputAsset });

    const pollingUrl = await pdfServices.submit({ job });

    // save polling url to db
    return {
      status: 200,
      body: JSON.stringify({ status: "success" }),
    };
  } catch (error) {
    if (
      error instanceof SDKError ||
      error instanceof ServiceUsageError ||
      error instanceof ServiceApiError
    ) {
      context.log("Exception encountered while executing operation", error);
    } else {
      context.log("Exception encountered while executing operation", error);
    }
  } finally {
  }
  return { body: "" };
}

app.http("convert", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: convertFunction,
});
