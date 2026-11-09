import { marked } from 'marked'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getNode } from '../fs'
import { contact, CV_PATH, localTime, PDF_PATH } from '../shell/contact'

function cvHtml() {
  const node = getNode(CV_PATH)
  // Same trust as the other viewers: this is the repo's own content/ folder.
  return node?.type === 'file' && node.text ? (marked.parse(node.text.replace(/<!--[\s\S]*?-->/g, '')) as string) : ''
}

function Clock({ timezone, city }: { timezone: string; city: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  const { time, gap } = localTime(timezone, now)
  return (
    <span className="chip cv-clock">
      <span className="cv-dot" aria-hidden="true" />
      {time} in {city} <span className="cv-gap">· {gap}</span>
    </span>
  )
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      className="pill"
      onClick={() => navigator.clipboard?.writeText(email).then(() => setCopied(true), () => {})}
      aria-live="polite"
    >
      {copied ? 'Copied ✓' : 'Copy address'}
    </button>
  )
}

/** The CV & contact window: a contact card on top, the CV as a printable sheet below. */
export default function CvView() {
  const c = contact()
  // The card above already shows the name, so the sheet starts at the summary.
  const html = useMemo(() => cvHtml().replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, ''), [])
  const pdf = getNode(PDF_PATH)
  const pdfUrl = pdf?.type === 'file' ? pdf.src : undefined
  const city = c.location?.split(',')[0]
  const [printing, setPrinting] = useState(false)

  // Print just the sheet: it's portalled next to #root, and print CSS hides the desktop.
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    const t = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', done)
    }
  }, [printing])

  return (
    <div className="cv-wrap">
      <section className="cv-card" aria-label="Contact">
        <span className="cv-avatar" aria-hidden="true">
          da
        </span>
        <div className="cv-who">
          <h1>{c.name}</h1>
          <p>{[c.role, c.location].filter(Boolean).join(' · ')}</p>
          {c.timezone && city && <Clock timezone={c.timezone} city={city} />}
        </div>
        <div className="cv-actions">
          {c.email && (
            <>
              <a className="pill pill-dark" href={`mailto:${c.email}`}>
                {c.email}
              </a>
              <CopyEmail email={c.email} />
            </>
          )}
          {c.links.map((l) => (
            <a key={l.url} className="pill" href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
      </section>

      {html && (
        <>
          <div className="cv-sheet-bar">
            <span className="cv-file">cv.md</span>
            {pdfUrl ? (
              <a className="pill" href={pdfUrl} download="Danish-Ali-CV.pdf">
                Download PDF
              </a>
            ) : (
              <button type="button" className="pill" onClick={() => setPrinting(true)}>
                Print or save as PDF
              </button>
            )}
          </div>
          <article className="doc cv-sheet" dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
      {printing &&
        createPortal(
          <div className="cv-print doc">
            <h1>{c.name}</h1>
            <p className="cv-print-contact">
              {[c.location, c.email, ...c.links.map((l) => l.url.replace(/^https?:\/\/(www\.)?/, ''))].filter(Boolean).join('  ·  ')}
            </p>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>,
          document.body,
        )}
    </div>
  )
}
