import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl') || process.env.NEXT_PUBLIC_LLM_BASE_URL || 'http://127.0.0.1:1234';
    const apiKey = searchParams.get('apiKey') || '';

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await axios.get(`${baseUrl}/v1/models`, {
      timeout: 10000,
      headers,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to fetch models:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch models', details: error.message },
      { status: 500 }
    );
  }
}
