import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { Readable } from "stream";
import { v1 as uuidv1 } from "uuid";
require("dotenv").config();

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
if (!accountName || !accountKey) {
    throw new Error("Azure Storage account name and key must be provided in environment variables");
}

export async function uploadFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    if (!request.body) {
        return {
            status: 400,
            body: "Please pass a file in the request body"
        };
    }

    const fileId = uuidv1();
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
    );

    const containerClient = blobServiceClient.getContainerClient("uploaded-docx-files");
    const blobClient = containerClient.getBlockBlobClient(fileId + ".docx");

    const uploadBlobResponse = await blobClient.uploadStream(Readable.from(request.body));

    if (uploadBlobResponse._response.status !== 201) {
        return {
            status: 500,
            body: `Failed to upload file. Status code: ${uploadBlobResponse._response.status}`
        };
    }

    return {
        status: 200,
        body: `File uploaded successfully. File Id: ${fileId}`
    };
};

app.http('upload', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: uploadFunction
});
