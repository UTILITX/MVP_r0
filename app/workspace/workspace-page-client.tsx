"use client"

import dynamic from "next/dynamic"
import WorkspaceWrapper from "./workspace-wrapper"

const DevTestBar = dynamic(() => import("./_DevTestBar"), { ssr: false })

export default function WorkspacePageClient() {
  return (
    <>
      <DevTestBar />
      <WorkspaceWrapper />
    </>
  )
}
