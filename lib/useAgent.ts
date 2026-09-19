'use client'

import { useState, useCallback } from 'react'

interface UseAgentOptions {
  agentType: string
  onComplete?: (text: string) => void
}

export function useAgent({ agentType, onComplete }: UseAgentOptions) {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(async (userMessage: string) => {
    setLoading(true)
    setError('')
    setOutput('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType, userMessage, stream: true })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'API error')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              // Handle both streaming formats
              const text = 
                parsed.delta?.text || 
                parsed.content?.[0]?.text ||
                parsed.choices?.[0]?.delta?.content ||
                ''
              
              if (text) {
                fullText += text
                setOutput(prev => prev + text)
              }
            } catch {
              // Non-JSON lines, skip
            }
          }
        }
      }

      onComplete?.(fullText)

    } catch (e) {
      // Fallback to non-streaming if streaming fails
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentType, userMessage, stream: false })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setOutput(data.text || '')
        onComplete?.(data.text || '')
      } catch (e2) {
        setError(String(e2))
      }
    } finally {
      setLoading(false)
    }
  }, [agentType, onComplete])

  const clear = useCallback(() => {
    setOutput('')
    setError('')
  }, [])

  return { output, loading, error, run, clear }
}
