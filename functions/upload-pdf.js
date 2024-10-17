const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Set your ChatPDF API key here
const CHATPDF_API_KEY = process.env.CHATPDF_API_KEY;

// Set up Multer for file uploads (store uploads in 'tmp/' folder)
const upload = multer({ dest: '/tmp/' });  // AWS Lambda allows writing to /tmp

exports.handler = async (event, context) => {
  // Enable CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',  // Replace '*' with your frontend URL in production
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: 'Method Not Allowed',
    };
  }

  // Parse multipart/form-data
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: 'Content-Type must be multipart/form-data',
    };
  }

  return new Promise((resolve, reject) => {
    const multipart = require('parse-multipart');
    const boundary = multipart.getBoundary(contentType);
    const parts = multipart.Parse(Buffer.from(event.body, 'base64'), boundary);

    if (!parts.length || !parts[0].filename) {
      resolve({
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No file uploaded. Please upload a PDF.' }),
      });
      return;
    }

    const file = parts[0];
    const filePath = `/tmp/${file.filename}`;
    fs.writeFileSync(filePath, file.data);

    (async () => {
      try {
        // Create form-data for uploading the file to ChatPDF
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        const options = {
          headers: {
            'x-api-key': CHATPDF_API_KEY,
            ...formData.getHeaders(),
          },
        };

        console.log('Uploading file to ChatPDF...');

        // Upload file to ChatPDF
        const response = await axios.post('https://api.chatpdf.com/v1/sources/add-file', formData, options);

        console.log('File uploaded successfully to ChatPDF.');

        // Remove the file from local storage after upload
        fs.unlinkSync(filePath);

        // Return the sourceId to the client
        resolve({
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            sourceId: response.data.sourceId,
          }),
        });
      } catch (error) {
        console.error('Error uploading PDF:', error.message);
        resolve({
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: 'Failed to upload PDF. Please try again.',
            details: error.response?.data || {},
          }),
        });
      }
    })();
  });
};
