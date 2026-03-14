import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== 'gfxdjo@gmail.com') return NextResponse.json({ error: 'Negado' }, { status: 403 });

  try {
    const result = await sql`
      SELECT e.*, p.email as email_dono 
      FROM empresas e
      LEFT JOIN perfis_usuarios p ON e.id = p.empresa_id AND p.role = 'admin'
      ORDER BY e.id DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email !== 'gfxdjo@gmail.com') return NextResponse.json({ error: 'Negado' }, { status: 403 });

    const { nomeEmpresa, emailDono } = await req.json();

    const result = await sql`INSERT INTO empresas (nome_empresa) VALUES (${nomeEmpresa}) RETURNING id`;
    const novaId = result.rows[0].id;

    await sql`
      INSERT INTO perfis_usuarios (email, empresa_id, role)
      VALUES (${emailDono.toLowerCase()}, ${novaId}, 'admin')
      ON CONFLICT (email) DO UPDATE SET empresa_id = ${novaId}, role = 'admin'
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== 'gfxdjo@gmail.com') return NextResponse.json({ error: 'Negado' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  await sql`DELETE FROM perfis_usuarios WHERE empresa_id = ${id}`;
  await sql`DELETE FROM empresas WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}