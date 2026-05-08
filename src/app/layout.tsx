import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/global.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Inventario Materia Prima',
  description: 'Sistema de inventario de materia prima',
  icons: {
    icon: '/logonb.ico',
    apple: '/logonb.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
