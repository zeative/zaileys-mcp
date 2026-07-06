import type { ReactNode } from 'react'

const paths: Record<string, string> = {
  home: 'M3 9.5 12 3l9 6.5M5 9.5V21h14V9.5M9 21v-6h6v6',
  rocket: 'M5 13c-1.5 1.5-2 5-2 5s3.5-.5 5-2m4.5-8.5a8 8 0 0 1 4 4l-5 3-2-2zM15 9a2 2 0 1 0 0-.01M14 4l6 6c0 4-3 7-7 9l-3-3-3-3c2-4 5-7 9-7z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  wrench: 'M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.7-.5-.5-2.7 2.7-2.6z',
  brain: 'M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 4 3 3 0 0 0 4 2 3 3 0 0 0 6 0 3 3 0 0 0 4-2 3 3 0 0 0 1-4 3 3 0 0 0-2-5 3 3 0 0 0-3-3 3 3 0 0 0-6 0zM12 3v18',
  plug: 'M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8zM12 16v6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function item(icon: string, label: string): { title: ReactNode } {
  return {
    title: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}>
        <Icon d={paths[icon]} />
        {label}
      </span>
    ),
  }
}

export default {
  '-- start': { type: 'separator', title: 'Getting Started' },
  index: item('home', 'Introduction'),
  'getting-started': item('rocket', 'Getting Started'),
  configuration: item('sliders', 'Configuration'),

  '-- reference': { type: 'separator', title: 'Reference' },
  tools: item('wrench', 'Tools'),
  'tool-strategy': item('brain', 'Tool Strategy'),
  embed: item('plug', 'Embed in your bot'),

  '-- ops': { type: 'separator', title: 'Operations' },
  safety: item('shield', 'Safety'),
  troubleshooting: item('help', 'Troubleshooting & FAQ'),
}
