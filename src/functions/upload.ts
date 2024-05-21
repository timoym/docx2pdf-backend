import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
const { BlobServiceClient } = require("@azure/storage-blob");
const { v1: uuidv1 } = require("uuid");
require("dotenv").config();

export async function upload(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const name = request.query.get('name') || await request.text() || 'world';

    return { body: `Hello, ${name}!` };
};

app.http('upload', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: upload
});
