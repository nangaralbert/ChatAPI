const axios = require('axios');

// Set your ChatPDF API key here
const CHATPDF_API_KEY = process.env.CHATPDF_API_KEY;

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

  try {
    const { sourceId, question } = JSON.parse(event.body);

    if (!sourceId || !question) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Source ID and question are required.' }),
      };
    }

    const config = {
      headers: {
        'x-api-key': CHATPDF_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const data = {
      sourceId: sourceId,
      messages: [
        {
          role: 'user',
          content: question,
        },
      ],
    };

    console.log('Asking question to ChatPDF...');

    // Send question to ChatPDF
    const response = await axios.post('https://api.chatpdf.com/v1/chats/message', data, config);

    console.log('Received response from ChatPDF.');

    // Send the response back to the client
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        answer: response.data.content,
      }),
    };
  } catch (error) {
    console.error('Error asking question:', error.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Failed to ask the question. Please try again.',
        details: error.response?.data || {},
      }),
    };
  }
};
