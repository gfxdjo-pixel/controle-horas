import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Tenta adicionar a coluna. Se ela já existir, vai dar um erro inofensivo.
    await sql`ALTER TABLE horas_extras ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);`;
    
    return NextResponse.json({ message: 'Sucesso! A coluna user_email foi criada (ou já existia) no banco de dados correto.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao tentar criar coluna: ' + error.message });
  }
}