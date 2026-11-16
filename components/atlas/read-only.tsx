'use client'

import { createContext, useContext } from 'react'

/**
 * True inside the sample-data demo (/demo). Views read this to disable
 * the controls that write — status changes, referee updates, declines,
 * uploads — instead of letting them fire a request that can only fail.
 */
const ReadOnlyContext = createContext(false)

export const ReadOnlyProvider = ReadOnlyContext.Provider

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext)
}
