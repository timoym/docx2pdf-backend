import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  CreatePDFJob,
  SDKError,
  MimeType,
  ServiceApiError,
  ServiceUsageError,
} from "@adobe/pdfservices-node-sdk";
import { Readable } from "stream";
import {
  initAdobeDocumentService,
  initAzureContainerClient,
} from "../internalApi";
require("dotenv").config();

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
    const pdfServices = await initAdobeDocumentService();

    const containerClient = await initAzureContainerClient();
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
    }else {
      context.log("Exception encountered while executing operation", error);
    } 
  }
  return { body: "" };
}

app.http("convert", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: convertFunction,
});
