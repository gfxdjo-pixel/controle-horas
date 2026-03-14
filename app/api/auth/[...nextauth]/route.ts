import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { sql } from '@vercel/postgres';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    // 1. O JWT roda apenas quando o token é criado ou atualizado.
    // É aqui que devemos fazer a busca no banco (mais rápido e seguro).
    async jwt({ token, user }: any) {
      if (user || token.email) {
        try {
          const { rows } = await sql`
            SELECT empresa_id, role 
            FROM perfis_usuarios 
            WHERE email = ${token.email}
          `;

          if (rows.length > 0) {
            token.empresa_id = rows[0].empresa_id;
            token.role = rows[0].role;
          } else {
            token.empresa_id = null;
            token.role = 'user';
          }
        } catch (error) {
          console.error("Erro ao buscar perfil do usuário no JWT:", error);
        }
      }
      return token;
    },
    // 2. A sessão apenas "lê" os dados que o JWT já buscou no banco.
    async session({ session, token }: any) {
      if (session.user) {
        session.user.empresa_id = token.empresa_id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };