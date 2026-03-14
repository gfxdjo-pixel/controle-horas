import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Pegamos o empresaId direto da sessão do usuário
  // @ts-ignore (evita erro de tipagem caso o TS não reconheça o campo novo ainda)
  const empresaId = session?.user?.empresa_id;

  if (!empresaId) {
    return NextResponse.json({ error: 'Empresa não identificada. Faça login novamente.' }, { status: 403 });
  }

  try {
    // Agora filtramos TODOS os registros para mostrar apenas os da empresa do usuário logado
    const result = await sql`
      SELECT * FROM horas_extras 
      WHERE empresa_id = ${empresaId} 
      ORDER BY data DESC, hora_inicio DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}