import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const ADMIN_EMAILS = [
  'gfxdjo@gmail.com',
];

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !ADMIN_EMAILS.includes(session.user?.email || '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const result = await sql`
      SELECT * FROM horas_extras 
      ORDER BY user_email ASC, data DESC;
    `;
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}