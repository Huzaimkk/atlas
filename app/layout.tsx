import type { Metadata } from 'next'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MotionProvider } from '@/components/atlas/motion-provider'
import './globals.css'

// Three voices (see app/globals.css): sans is Atlas speaking, serif is
// titles and quoted source text, mono is data.
const ui = Geist({ subsets: ['latin'], variable: '--font-ui', display: 'swap' })
const data = Geist_Mono({ subsets: ['latin'], variable: '--font-data', display: 'swap' })
const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz'],
})

export const metadata: Metadata = {
  title: { default: 'Atlas — a position, not a list of links', template: '%s · Atlas' },
  description:
    'Atlas checks every funded PhD, scholarship, and fellowship in the pool against your actual profile, and tells you exactly what is blocking you — with the source quoted.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${data.variable} ${display.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        <MotionProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </MotionProvider>
      </body>
    </html>
  )
}
