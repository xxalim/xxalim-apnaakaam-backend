import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { sendChatMessage } from './api'
import './Chat.css'

export default function Chat({ token }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef()
  const socketRef = useRef(null)
  const roomName = 'apnakaam-general'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.emit('join', roomName)

    socket.on('message', (payload) => {
      const text = payload?.message || ''
      if (!text) return
      const senderName = payload?.sender || 'Guest'
      const formatted = senderName === 'You' ? text : `${senderName}: ${text}`
      setMessages((current) => [...current, { role: senderName === 'You' ? 'user' : 'assistant', text: formatted }])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userMsg }])

    if (socketRef.current?.connected) {
      socketRef.current.emit('message', { room: roomName, message: userMsg, sender: 'You' })
    }

    setSending(true)
    try {
      const res = await sendChatMessage(userMsg, token)
      const reply = res?.reply || 'No reply.'
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Error sending message.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`chat-widget ${open ? 'open' : ''}`}>
      <button className="chat-toggle" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Chat'}</button>

      {open ? (
        <div className="chat-panel">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="chat-text">{m.text}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="chat-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              placeholder="Type a message..."
            />
            <button onClick={handleSend} disabled={sending}>{sending ? '...' : 'Send'}</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
