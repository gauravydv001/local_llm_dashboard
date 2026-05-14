import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { message, model = 'default', baseUrl, apiKey } = await request.json();

    const llmBaseUrl = baseUrl || process.env.NEXT_PUBLIC_LLM_BASE_URL || 'http://127.0.0.1:1234';
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await axios.post(`${llmBaseUrl}/v1/chat/completions`, {
      model,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    },
    {
      timeout: 30000,
      headers,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('LLM API error:', error.message);
    return NextResponse.json(
      { error: 'Failed to connect to LLM service', details: error.message },
      { status: 500 }
    );
  }
}
