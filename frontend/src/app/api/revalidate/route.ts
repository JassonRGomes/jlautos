import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const tag = searchParams.get('tag');
  const path = searchParams.get('path');

  const EXPECTED_SECRET = process.env.REVALIDATION_TOKEN || 'jl_autos_reval_token_secure_2026';

  if (secret !== EXPECTED_SECRET) {
    return NextResponse.json({ message: 'Invalid revalidation secret token' }, { status: 401 });
  }

  if (tag) {
    // @ts-ignore
    revalidateTag(tag);
    return NextResponse.json({ revalidated: true, tag, now: Date.now() });
  }

  if (path) {
    revalidatePath(path, 'page');
    return NextResponse.json({ revalidated: true, path, now: Date.now() });
  }

  return NextResponse.json({ message: 'Missing tag or path parameter' }, { status: 400 });
}
