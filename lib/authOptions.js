import GitHubProvider from 'next-auth/providers/github'
import { db } from '@/lib/db'

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
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
    async jwt({ token, profile }) {
      if (profile) {
        token.githubId = String(profile.id)
        token.username = profile.login
      }
      return token
    },
    async session({ session, token }) {
      session.user.githubId = token.githubId
      session.user.username = token.username
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}