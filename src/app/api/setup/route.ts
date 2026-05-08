import { NextResponse } from 'next/server'
import { runSeed } from '@/lib/db/seed'

async function handler() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED) {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }
  const result = await runSeed()
  return NextResponse.json(result)
}

// GET allows calling from browser during dev setup
export async function GET() { return handler() }
export async function POST() { return handler() }
