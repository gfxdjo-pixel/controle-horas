import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // @ts-ignore
  const empresaId = session.user.empresa_id;
  const { data, hora_inicio, hora_fim, rota, km_inicial, km_final, numero_van } = await req.json();

  try {
    // Agora incluímos o empresa_id no INSERT
    await sql`
      INSERT INTO horas_extras 
      (user_email, data, hora_inicio, hora_fim, rota, km_inicial, km_final, numero_van, empresa_id)
      VALUES 
      (${session.user.email}, ${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${km_inicial}, ${km_final}, ${numero_van}, ${empresaId})
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Atualize o GET também para o motorista ver apenas as rotas da empresa dele
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const empresaId = session?.user?.empresa_id;

  try {
    const result = await sql`
      SELECT * FROM horas_extras 
      WHERE user_email = ${session?.user?.email} AND empresa_id = ${empresaId}
      ORDER BY data DESC, hora_inicio DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}