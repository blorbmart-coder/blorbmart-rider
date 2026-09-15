/*
 * Title, canonical URL and robots rule for each route.
 *
 * Only the recruitment page and the sign-up and sign-in forms are public.
 * Everything else belongs to a signed-in rider and is kept out of search
 * (robots.txt also asks crawlers not to fetch it).
 */
const SITE = 'https://rider.blorbmart.com.ng'

const PUBLIC: Record<string, { title: string; description: string }> = {
  '/join': {
    title: 'Blorbmart Rider — Earn delivering on campus, paid same day',
    description:
      'Deliver Blorbmart orders around UNIOSUN, LAUTECH, UNN or OOU between lectures and cash out to your bank the same day. Free to sign up.',
  },
  '/signup': {
    title: 'Sign up to ride | Blorbmart Rider',
    description:
      'Create your Blorbmart Rider account in about two minutes. It is free; once approved, go online between lectures and cash out the same day.',
  },
  '/login': {
    title: 'Rider sign in | Blorbmart Rider',
    description: 'Sign in to Blorbmart Rider to go online, take delivery jobs on your campus and cash out your earnings.',
  },
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (href === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export function applyRouteMeta(pathname: string): void {
  const page = PUBLIC[pathname]
  document.title = page?.title ?? 'Blorbmart Rider'
  setMeta('name', 'robots', page ? 'index, follow, max-image-preview:large' : 'noindex, nofollow')
  setCanonical(page ? SITE + pathname : null)
  if (!page) return
  setMeta('name', 'description', page.description)
  setMeta('property', 'og:url', SITE + pathname)
}
