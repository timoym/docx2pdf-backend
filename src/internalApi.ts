import * as sql from "mssql";
import { env } from "process";
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

export enum JobStatus {
  IN_PROGRESS = "inprogress",
  DONE = "done",
  FAILED = "failed",
  UNKNOWN = "unknown",
}

async function createDbPool() {
  return await sql.connect(env.DB_CONNECTION_STRING);
}

export async function initAdobeDocumentService() {
  const credentials = new ServicePrincipalCredentials({
    clientId: process.env.PDF_SERVICES_CLIENT_ID,
    clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
  });

  return new PDFServices({ credentials });
}

export async function initAzureContainerClient() {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!containerName || !connectionString) {
    throw new Error(
      "Azure Storage container name and connection string must be provided"
    );
  }
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

  return blobServiceClient.getContainerClient(containerName);
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  try {
    const pool = await createDbPool();
    const result = await pool
      .request()
      .query(`SELECT status FROM dbo.conversionJobs WHERE Id = '${jobId}'`);
    //check if job exists
    if (result.recordset.length === 0) {
      return JobStatus.UNKNOWN;
    }
    return result.recordset[0].status;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function createJob(
  fileId: string,
  statusLink: string
): Promise<string> {
  try {
    const pool = await createDbPool();
    const result = await pool
      .request()
      .query(
        `INSERT INTO dbo.conversionJobs (fileId, status, statusLink) VALUES ('${fileId}', '${JobStatus.IN_PROGRESS}', '${statusLink}')`
      );
    return result.recordset[0].status;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
