import { lazy, Suspense, useEffect } from 'react'
import { markRead } from '../achievements'
import type { Win } from '../store/windows'
import FolderView from './FolderView'
import Terminal from './Terminal'
import { AppFrame, ImageView, MarkdownView, PdfView, TextView, VideoView } from './Viewers'

const CvView = lazy(() => import('./CvView'))
const StatsView = lazy(() => import('./StatsView'))
const Guestbook = lazy(() => import('./Guestbook'))
const Updates = lazy(() => import('./Updates'))
const WallpaperPicker = lazy(() => import('./WallpaperPicker'))

interface RenderOpts {
  onExit: () => void
  onNavigate: (path: string) => void
  phone?: boolean
}

export function WindowContent({ win, opts }: { win: Pick<Win, 'kind' | 'path' | 'url' | 'title'>; opts: RenderOpts }) {
  useEffect(() => {
    if (win.kind === 'markdown' && win.path) markRead(win.path)
  }, [win.kind, win.path])
  switch (win.kind) {
    case 'terminal':
      return <Terminal onExit={opts.onExit} showShortcuts={opts.phone} />
    case 'folder':
      return <FolderView path={win.path ?? '/'} onNavigate={opts.onNavigate} singleClick={opts.phone} />
    case 'markdown':
      return <MarkdownView path={win.path} />
    case 'image':
      return <ImageView key={win.path} path={win.path} />
    case 'video':
      return <VideoView path={win.path} />
    case 'pdf':
      return <PdfView path={win.path} />
    case 'wallpaper':
      return (
        <Suspense fallback={<div className="appframe-loading">Loading…</div>}>
          <WallpaperPicker />
        </Suspense>
      )
    case 'stats':
      return (
        <Suspense fallback={<div className="appframe-loading">Loading…</div>}>
          <StatsView />
        </Suspense>
      )
    case 'cv':
      return (
        <Suspense fallback={<div className="appframe-loading">Loading…</div>}>
          <CvView />
        </Suspense>
      )
    case 'guestbook':
      return (
        <Suspense fallback={<div className="appframe-loading">Loading…</div>}>
          <Guestbook />
        </Suspense>
      )
    case 'updates':
      return (
        <Suspense fallback={<div className="appframe-loading">Loading…</div>}>
          <Updates />
        </Suspense>
      )
    case 'app':
      return <AppFrame url={win.url} title={win.title} />
    default:
      return <TextView path={win.path} />
  }
}
