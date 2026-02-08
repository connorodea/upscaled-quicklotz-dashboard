import { NextRequest, NextResponse } from 'next/server';

const BST_API_URL = 'http://localhost:8002';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'deals';

    // Build query string for the backend
    const backendParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        backendParams.append(key, value);
      }
    });

    const queryString = backendParams.toString();
    const url = `${BST_API_URL}/api/${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('BST-ETL API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to BST-ETL backend' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'scan';

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BST_API_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('BST-ETL API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to BST-ETL backend' },
      { status: 500 }
    );
  }
}
