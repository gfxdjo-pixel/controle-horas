import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Apaga a tabela antiga se existir
    await sql`DROP TABLE IF EXISTS horas_extras;`;
    
    // Cria a nova tabela
    await sql`
      CREATE TABLE horas_extras (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fim TEXT NOT NULL,
        rota TEXT NOT NULL
      );
    `;
    return NextResponse.json({ message: 'Banco atualizado com novos campos de hora!' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar tabela' }, { status: 500 });
  }
}