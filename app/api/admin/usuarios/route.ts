import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const empresaId = session?.user?.empresa_id;

  try {
    const result = await sql`SELECT * FROM perfis_usuarios WHERE empresa_id = ${empresaId} ORDER BY email ASC`;
    return NextResponse.json(result.rows);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const empresaId = session?.user?.empresa_id;
  const { email, role } = await req.json();

  try {
    await sql`
      INSERT INTO perfis_usuarios (email, empresa_id, role)
      VALUES (${email.toLowerCase()}, ${empresaId}, ${role})
      ON CONFLICT (email) DO UPDATE SET role = ${role}, empresa_id = ${empresaId}
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  try {
    await sql`DELETE FROM perfis_usuarios WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}