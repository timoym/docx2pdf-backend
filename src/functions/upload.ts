import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { Readable } from "stream";
import { v1 as uuidv1 } from "uuid";
require("dotenv").config();

const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!containerName || !connectionString) {
    throw new Error("Azure Storage container name and connection string must be provided");
}

export async function uploadFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    if (!request.body) {
        return {
            status: 400,
            body: "Please pass a file in the request body"
        };
    }

    const fileId = uuidv1();
    const blobServiceClient = new BlobServiceClient(connectionString);

    const containerClient = blobServiceClient.getContainerClient(containerName);
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
