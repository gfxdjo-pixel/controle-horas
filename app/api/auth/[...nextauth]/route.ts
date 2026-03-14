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
    // 1. Quando o usuário loga, buscamos a empresa dele no banco de dados
    async session({ session, token }: any) {
      if (session.user) {
        try {
          // Buscamos o empresa_id e o cargo (role) na tabela que você criou
          const { rows } = await sql`
            SELECT empresa_id, role 
            FROM perfis_usuarios 
            WHERE email = ${session.user.email}
          `;

          if (rows.length > 0) {
            // Injetamos esses dados na sessão para ficarem disponíveis no Front-end e nas APIs
            session.user.empresa_id = rows[0].empresa_id;
            session.user.role = rows[0].role;
          } else {
            // Caso o usuário não esteja na tabela, definimos como null ou um valor padrão
            session.user.empresa_id = null;
            session.user.role = 'user';
          }
        } catch (error) {
          console.error("Erro ao buscar perfil do usuário:", error);
        }
      }
      return session;
    },
    // 2. Necessário para passar os dados do banco para a sessão
    async jwt({ token, user, account }: any) {
      return token;
    }
  },
  // Aumenta a segurança e ajuda na persistência da sessão
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };