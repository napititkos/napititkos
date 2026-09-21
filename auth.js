import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { RedisAdapter } from './lib/authAdapter';
import { kv } from './lib/kv';
import { verifyPassword } from './lib/password';
import { sendMagicLinkEmail } from './lib/mailer';

// Saját e-mail provider a Resend REST API-jával, a Nodemailer/SMTP
// kényszer kikerülésével.
const EmailProvider = {
  id: 'email',
  type: 'email',
  name: 'Email',
  from: process.env.RESEND_FROM || 'Titkosírás <titkositas@napititkos.hu>',
  maxAge: 15 * 60,
  allowDangerousEmailAccountLinking: true,
  async sendVerificationRequest({ identifier, url }) {
    await sendMagicLinkEmail(identifier, url);
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: RedisAdapter(),
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider,
    Credentials({
      name: 'Jelszó',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Jelszó', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email || '').toString().toLowerCase().trim();
        const password = (credentials?.password || '').toString();
        if (!email || !password) return null;
        const id = await kv.get(`au:userByEmail:${email}`);
        if (!id) return null;
        const user = await kv.get(`au:user:${id}`);
        if (!user || !user.passwordHash) return null;
        const valid = verifyPassword(password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          emailVerified: user.emailVerified || null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // A Google (és az email-linkes) bejelentkezés már önmagában igazolja az
      // email-cím tulajdonjogát, ezért ezeknél sosem kérünk külön visszaigazolást -
      // akkor sem, ha a fiók korábban (ennek a logikának a bevezetése előtt) jött létre.
      if ((account?.provider === 'google' || account?.provider === 'email') && user?.email) {
        const id = await kv.get(`au:userByEmail:${user.email}`);
        if (id) {
          const existing = await kv.get(`au:user:${id}`);
          if (existing && !existing.emailVerified) {
            // Megerősítetlen fiókon lévő jelszót a címet nem birtokló is beállíthatta
            // (előre-regisztráció), ezért amint a valódi tulajdonos belép, töröljük.
            delete existing.passwordHash;
            existing.emailVerified = new Date().toISOString();
            await kv.set(`au:user:${id}`, existing);
          }
          if (existing?.emailVerified) {
            // Azonnal frissítjük az aktuális bejelentkezési kérés user objektumát is,
            // hogy már ugyanebben a lépésben, ne csak a következő belépéskor
            // érvényesüljön a megerősített állapot.
            user.emailVerified = existing.emailVerified;
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || 'user';
        token.uid = user.id;
        token.verified = !!user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role || 'user';
        session.user.id = token.uid;
        session.user.verified = !!token.verified;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
