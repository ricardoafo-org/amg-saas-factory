'use client';

import { useState } from 'react';

export function CopyHtmlButton({ html }: { html: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available (e.g. non-secure context)
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? '#16a34a' : '#374151',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 14px',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {copied ? '✓ Copiado' : 'Copiar HTML'}
    </button>
  );
}
