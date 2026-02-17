'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function VideoRoom() {
  const jitsiContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Jitsi External API script
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => initJitsi()
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const initJitsi = () => {
    if (jitsiContainerRef.current && window.JitsiMeetExternalAPI) {
      // Use self-hosted Jitsi domain from environment variable
      const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.yourdomain.com'
      const options = {
        roomName: `TelemedRoom_${Date.now()}`,
        width: '100%',
        height: 600,
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 
            'fullscreen', 'fodeviceselection', 'hangup', 'chat', 
            'recording', 'settings', 'raisehand', 'videoquality', 
            'filmstrip', 'stats', 'shortcuts', 'tileview'
          ],
        },
      }

      new window.JitsiMeetExternalAPI(domain, options)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-semibold">Sala de Videoconsulta</h1>
      </header>
      <div className="flex-1 p-4">
        <div ref={jitsiContainerRef} className="w-full h-full bg-black rounded-lg" />
      </div>
    </div>
  )
}
