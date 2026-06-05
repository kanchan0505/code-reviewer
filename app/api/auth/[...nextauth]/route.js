import NextAuth from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { db } from '@/lib/db'

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      // save user to database on first login
      await db.user.upsert({
        where: { githubId: String(profile.id) },
        update: { username: profile.login, avatarUrl: profile.avatar_url },
        create: {
          githubId: String(profile.id),
          username: profile.login,
          avatarUrl: profile.avatar_url,
        },
      })
      return true
    },
    async session({ session, token }) {
      session.user.githubId = token.sub
      return session
    },
  },
})

export { handler as GET, handler as POST }