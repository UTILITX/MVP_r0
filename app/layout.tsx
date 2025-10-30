import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import dynamic from "next/dynamic"

const GlobalDevBar = dynamic(() => import("./_GlobalDevBar"), { ssr: false })
const GlobalRecordTest = dynamic(() => import("./_GlobalRecordTest"), { ssr: false })

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <GlobalDevBar />
        <GlobalRecordTest />
      </body>
    </html>
  )
}
