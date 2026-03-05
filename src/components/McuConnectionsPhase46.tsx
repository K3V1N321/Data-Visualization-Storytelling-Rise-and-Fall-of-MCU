import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts'
import { ComponentSize, Margin } from '../types'

type Phase = 1 | 2 | 3 | 4 | 5 | 6

type CsvRow = {
  id: string
  title: string
  phase: string
  release_date: string
  poster_path: string
}

type ShowCsvRow = {
  title: string
  phase: string
  release_date: string
  imdb_id: string
}

type MediaType = 'movie' | 'show'

type TimelineEntry = {
  id: string
  title: string
  phase: Phase
  releaseDate: Date
  releaseDateStr: string
  posterUrl: string | null
  mediaType: MediaType
}

type PhaseRange = {
  phase: Phase
  start: Date
  end: Date
}

type ArcSide = 'top' | 'bottom'
type ArcType = 'sequel' | 'crossover' | 'carryover'
type Connection = { type: ArcType; from: string; to: string; side?: ArcSide; label?: string }
type FilterMode = 'all' | ArcType

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w185'
const PHASES_TO_SHOW: Phase[] = [4, 5, 6]

// Add manual links here. Titles must exactly match the movie/show titles in the CSV files.
const CONNECTIONS: Connection[] = [
  { type: 'carryover', from: 'Captain America: Civil War', to: 'Black Widow', side: 'top' },
  { type: 'sequel', from: 'Captain America: Civil War', to: 'Captain America: Brave New World', side: 'bottom' },
  { type: 'sequel', from: 'Doctor Strange', to: 'Doctor Strange in the Multiverse of Madness', side: 'top' },
  { type: 'sequel', from: 'Guardians of the Galaxy Vol. 2', to: 'Guardians of the Galaxy Vol. 3', side: 'top' },
  { type: 'sequel', from: 'Spider-Man: Homecoming', to: 'Spider-Man: Far From Home', side: 'top' },
  { type: 'sequel', from: 'Thor: Ragnarok', to: 'Thor: Love and Thunder', side: 'top' },
  { type: 'sequel', from: 'Black Panther', to: 'Black Panther: Wakanda Forever', side: 'top' },
  { type: 'sequel', from: 'Ant-Man and the Wasp', to: 'Ant-Man and the Wasp: Quantumania', side: 'bottom' },
  { type: 'sequel', from: 'Captain Marvel', to: 'The Marvels', side: 'top' },
  { type: 'carryover', from: 'Avengers: Endgame', to: 'Spider-Man: Far From Home', side: 'top' },
  { type: 'sequel', from: 'Spider-Man: Far From Home', to: 'Spider-Man: No Way Home', side: 'bottom' },
  { type: 'carryover', from: 'WandaVision', to: 'Agatha All Along', side: 'top' },
  { type: 'carryover', from: 'WandaVision', to: 'Doctor Strange in the Multiverse of Madness', side: 'bottom' },
  { type: 'crossover', from: 'WandaVision', to: 'The Marvels', side: 'top' },
  { type: 'carryover', from: 'The Falcon and The Winter Soldier', to: 'Captain America: Brave New World', side: 'bottom' },
  { type: 'sequel', from: 'Loki | Season 1', to: 'Loki | Season 2', side: 'bottom' },
  { type: 'carryover', from: 'Hawkeye', to: 'Echo', side: 'bottom' },
  { type: 'crossover', from: 'Ms. Marvel', to: 'The Marvels', side: 'top' },
  { type: 'sequel', from: 'I am Groot | Season 1', to: 'I am Groot | Season 2', side: 'top' },
  { type: 'sequel', from: 'What If...? | Season 1', to: 'What If...? | Season 2', side: 'top' },
  { type: 'sequel', from: 'What If...? | Season 2', to: 'What If...? | Season 3', side: 'bottom' },
  { type: 'crossover', from: 'Hawkeye', to: 'Thunderbolts*', side: 'bottom' },
  { type: 'carryover', from: 'Black Widow', to: 'Thunderbolts*', side: 'top' },
  { type: 'carryover', from: 'Loki | Season 1', to: 'Ant-Man and the Wasp: Quantumania', side: 'top' }
]

function parsePhase(raw: string): Phase | null {
  const n = Number(String(raw).trim())
  if (n >= 1 && n <= 6) return n as Phase
  return null
}

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime())
}

function midpoint(a: Date, b: Date) {
  return new Date((a.getTime() + b.getTime()) / 2)
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function overlaps(a: DOMRect, b: DOMRect, pad = 6) {
  return !(a.right + pad < b.left || a.left > b.right + pad || a.bottom + pad < b.top || a.top > b.bottom)
}

function resolveBandVerticalLayout(
  nodes: Array<{ el: HTMLDivElement; cx: number }>,
  baseTop: number,
  direction: 'up' | 'down',
  containerH: number,
  gap = 4
) {
  nodes.sort((p, q) => p.cx - q.cx)

  for (const n of nodes) n.el.style.top = `${baseTop}px`

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    let moved = true
    let guard = 0

    while (moved && guard++ < 60) {
      moved = false
      const aRect = a.el.getBoundingClientRect()

      for (let j = 0; j < i; j++) {
        const b = nodes[j]
        const bRect = b.el.getBoundingClientRect()

        if (overlaps(aRect, bRect, gap)) {
          const currentTop = parseFloat(a.el.style.top || '0')
          const pushFactor = 0.6
          const pushBy = (direction === 'up' ? -1 : 1) * (bRect.height + gap) * pushFactor

          let nextTop = currentTop + pushBy

          const minTop = 6
          const maxTop = containerH - aRect.height - 6
          nextTop = clamp(nextTop, minTop, maxTop)

          a.el.style.top = `${nextTop}px`
          moved = true
          break
        }
      }
    }
  }
}

export default function McuConnectionsPhase46() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 })
  const onResize = useDebounceCallback((s: ComponentSize) => setSize(s), 50)
  useResizeObserver({ ref: containerRef as React.RefObject<HTMLDivElement>, onResize })

  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [phaseRanges, setPhaseRanges] = useState<PhaseRange[]>([])
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [movieRows, showRows] = await Promise.all([
        d3.csv('/data/marvel_movies_tmdb.csv') as unknown as Promise<CsvRow[]>,
        d3.csv('/data/marvel_shows_data.csv') as unknown as Promise<ShowCsvRow[]>
      ])

      const parsedMovies: TimelineEntry[] = movieRows
        .map((r): TimelineEntry | null => {
          const phase = parsePhase(r.phase)
          const date = new Date(r.release_date)
          if (!phase || !PHASES_TO_SHOW.includes(phase)) return null
          if (!isValidDate(date)) return null

          const title = (r.title ?? '').trim()
          if (!title || title === 'The Incredible Hulk') return null

          const posterPath = (r.poster_path ?? '').trim()
          const posterUrl = posterPath ? `${TMDB_POSTER_BASE}${posterPath}` : null

          return {
            id: String(r.id),
            title,
            phase,
            releaseDate: date,
            releaseDateStr: r.release_date,
            posterUrl,
            mediaType: 'movie'
          } satisfies TimelineEntry
        })
        .filter((x): x is TimelineEntry => x !== null)

      const parsedShows: TimelineEntry[] = showRows
        .map((r): TimelineEntry | null => {
          const phase = parsePhase(r.phase)
          const date = new Date(r.release_date)
          if (!phase || !PHASES_TO_SHOW.includes(phase)) return null
          if (!isValidDate(date)) return null

          const title = (r.title ?? '').trim()
          if (!title) return null

          return {
            id: `show-${String(r.imdb_id ?? title)}`,
            title,
            phase,
            releaseDate: date,
            releaseDateStr: r.release_date,
            posterUrl: null,
            mediaType: 'show'
          } satisfies TimelineEntry
        })
        .filter((x): x is TimelineEntry => x !== null)

      const parsed = [...parsedMovies, ...parsedShows].sort((a, b) => {
        const byDate = a.releaseDate.getTime() - b.releaseDate.getTime()
        if (byDate !== 0) return byDate
        if (a.mediaType !== b.mediaType) return a.mediaType === 'movie' ? -1 : 1
        return a.title.localeCompare(b.title)
      })

      const grouped = d3.group(parsed, d => d.phase)
      const firstOf: Partial<Record<Phase, Date>> = {}
      const lastOf: Partial<Record<Phase, Date>> = {}

      PHASES_TO_SHOW.forEach(p => {
        const list = grouped.get(p)
        if (!list || list.length === 0) return
        firstOf[p] = list[0].releaseDate
        lastOf[p] = list[list.length - 1].releaseDate
      })

      const overallStart = parsed[0]?.releaseDate
      const overallEnd = parsed[parsed.length - 1]?.releaseDate

      const ranges: PhaseRange[] = []
      if (overallStart && overallEnd) {
        const phases = PHASES_TO_SHOW.filter(p => firstOf[p] && lastOf[p])
        if (phases.length > 0) {
          const boundaries: Date[] = [overallStart]
          for (let i = 0; i < phases.length - 1; i++) {
            const p = phases[i]
            const next = phases[i + 1]
            boundaries.push(midpoint(lastOf[p]!, firstOf[next]!))
          }
          boundaries.push(overallEnd)

          for (let i = 0; i < phases.length; i++) {
            ranges.push({ phase: phases[i], start: boundaries[i], end: boundaries[i + 1] })
          }
        }
      }

      if (!cancelled) {
        setEntries(parsed)
        setPhaseRanges(ranges)
      }
    }

    load().catch(err => {
      console.error('Failed to load connection CSVs:', err)
      if (!cancelled) {
        setEntries([])
        setPhaseRanges([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!svgRef.current) return
    if (!containerRef.current) return
    if (size.width <= 0 || size.height <= 0) return
    if (entries.length === 0) return

    const root = d3.select(containerRef.current)
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const overlay = root
      .selectAll<HTMLDivElement, unknown>('div.mcu-multi-tooltips')
      .data([null])
      .join('div')
      .attr('class', 'mcu-multi-tooltips')
      .style('position', 'absolute')
      .style('left', '0px')
      .style('top', '0px')
      .style('width', '100%')
      .style('height', '100%')
      .style('pointer-events', 'none')
      .style('z-index', '5')

    const margin: Margin = { top: 36, right: 70, bottom: 42, left: 70 }
    const width = size.width
    const height = size.height
    const yMid = Math.round(height / 2)

    const x0 = margin.left
    const x1 = width - margin.right

    const minDate = entries[0].releaseDate
    const maxDate = entries[entries.length - 1].releaseDate
    const x = d3.scaleTime().domain([minDate, maxDate]).range([x0, x1])

    const phaseColors: Record<Phase, string> = {
      1: '#1f77b4',
      2: '#ff7f0e',
      3: '#2ca02c',
      4: '#d62728',
      5: '#9467bd',
      6: '#8c564b'
    }

    const dotR = 5
    const dotStrokeW = 1.5
    const dotFill: Record<MediaType, string> = {
      movie: '#FFCC00',
      show: '#FFCC00'
    }
    const dotStroke: Record<MediaType, string> = {
      movie: 'black',
      show: 'rgba(0,0,0,0.9)'
    }
    const markerPath = (mediaType: MediaType, radius: number) =>
      d3
        .symbol()
        .type(mediaType === 'movie' ? d3.symbolCircle : d3.symbolTriangle)
        .size(mediaType === 'movie' ? Math.PI * radius * radius : Math.PI * radius * radius * 0.64)()

    const arcStyle: Record<
      ArcType,
      { label: string; stroke: string; strokeWidth: number; dash: string | null; opacity: number }
    > = {
      sequel: { label: 'Direct sequels', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 2.2, dash: null, opacity: 0.9 },
      crossover: { label: 'Crossovers', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 2.0, dash: '9,5', opacity: 0.85 },
      carryover: { label: 'Major story carryovers', stroke: 'rgba(0,0,0,0.40)', strokeWidth: 2.0, dash: '2,4', opacity: 0.8 }
    }

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', margin.top - 14)
      .style('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 900)
      .text('MCU Phase 4-6 Connections')

    svg
      .append('line')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', yMid)
      .attr('y2', yMid)
      .attr('stroke', 'rgba(0,0,0,0.10)')
      .attr('stroke-width', 18)
      .attr('stroke-linecap', 'round')

    svg
      .append('g')
      .selectAll('line.phase-line')
      .data(phaseRanges)
      .join('line')
      .attr('class', 'phase-line')
      .attr('x1', d => x(d.start))
      .attr('x2', d => x(d.end))
      .attr('y1', yMid)
      .attr('y2', yMid)
      .attr('stroke', d => phaseColors[d.phase])
      .attr('stroke-width', 12)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.92)

    svg
      .append('text')
      .attr('x', x0 - 12)
      .attr('y', yMid + 5)
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.65)')
      .text(String(minDate.getFullYear()))

    svg
      .append('text')
      .attr('x', x1 + 12)
      .attr('y', yMid + 5)
      .style('text-anchor', 'start')
      .style('font-size', '12px')
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.65)')
      .text(String(maxDate.getFullYear()))

    const byTitle = new Map<string, TimelineEntry>()
    entries.forEach(entry => byTitle.set(entry.title, entry))

    const resolvedAll = CONNECTIONS
      .map(c => {
        const a = byTitle.get(c.from)
        const b = byTitle.get(c.to)
        if (!a || !b) return null

        const x1p = x(a.releaseDate)
        const x2p = x(b.releaseDate)
        const leftX = Math.min(x1p, x2p)
        const rightX = Math.max(x1p, x2p)
        const side: ArcSide = c.side ?? 'top'

        return { ...c, side, a, b, x1: x1p, x2: x2p, leftX, rightX, span: rightX - leftX }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((p, q) => p.leftX - q.leftX || q.span - p.span)

    const resolvedVisible = resolvedAll.filter(d => (filterMode === 'all' ? true : d.type === filterMode))

    function assignLanes(list: typeof resolvedVisible) {
      const laneRightEnds: number[] = []
      return list.map(d => {
        let lane = 0
        while (lane < laneRightEnds.length && d.leftX <= laneRightEnds[lane] + 8) lane++
        if (lane === laneRightEnds.length) laneRightEnds.push(d.rightX)
        else laneRightEnds[lane] = d.rightX
        return { ...d, lane }
      })
    }

    const arcsTop = assignLanes(resolvedVisible.filter(d => d.side === 'top'))
    const arcsBottom = assignLanes(resolvedVisible.filter(d => d.side === 'bottom'))
    const arcsWithLane = [...arcsTop, ...arcsBottom]

    const gArcs = svg.append('g').attr('class', 'arcs')

    gArcs
      .selectAll('path.arc')
      .data(arcsWithLane)
      .join('path')
      .attr('class', d => `arc arc-${d.type} arc-${d.side}`)
      .attr('fill', 'none')
      .attr('stroke', d => arcStyle[d.type].stroke)
      .attr('stroke-width', d => arcStyle[d.type].strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('opacity', d => arcStyle[d.type].opacity)
      .attr('stroke-dasharray', d => arcStyle[d.type].dash ?? null)
      .attr('d', d => {
        const dx = Math.abs(d.x2 - d.x1)
        const base = 26
        const laneLift = d.lane * 18
        const spanLift = Math.max(18, Math.min(140, dx * 0.35))
        const arcHeight = base + laneLift + spanLift
        const cy = d.side === 'top' ? yMid - arcHeight : yMid + arcHeight
        return `M ${d.x1} ${yMid} Q ${(d.x1 + d.x2) / 2} ${cy} ${d.x2} ${yMid}`
      })

    const gDots = svg.append('g').attr('class', 'dots')

    gDots
      .selectAll('path.media-dot')
      .data(entries)
      .join('path')
      .attr('class', 'media-dot')
      .attr('data-title', d => d.title)
      .attr('d', d => markerPath(d.mediaType, dotR))
      .attr('transform', d => `translate(${x(d.releaseDate)}, ${yMid})`)
      .attr('fill', d => dotFill[d.mediaType])
      .attr('stroke', d => dotStroke[d.mediaType])
      .attr('stroke-width', dotStrokeW)
      .style('cursor', 'pointer')

    function clearMultiTooltips() {
      overlay.selectAll('div.mcu-label').remove()
    }

    function renderMultiTooltips(highlightTitles: Set<string>, anchorTitle: string) {
      const items: TimelineEntry[] = []
      for (const t of highlightTitles) {
        const m = byTitle.get(t)
        if (m) items.push(m)
      }
      items.sort((a, b) => x(a.releaseDate) - x(b.releaseDate))

      const cardData = items.map((m, i) => {
        const isAnchor = m.title === anchorTitle
        const top = isAnchor ? true : i % 2 === 0
        return { m, top, isAnchor, i }
      })

      const containerBox = containerRef.current!.getBoundingClientRect()

      const card = overlay
        .selectAll<HTMLDivElement, { m: TimelineEntry; top: boolean; isAnchor: boolean; i: number }>('div.mcu-label')
        .data(cardData, d => d.m.id)

      card.exit().remove()

      const enter = card
        .enter()
        .append('div')
        .attr('class', 'mcu-label')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(255,255,255,0.92)')
        .style('border', '1px solid rgba(0,0,0,0.12)')
        .style('border-radius', '10px')
        .style('box-shadow', '0 8px 18px rgba(0,0,0,0.12)')
        .style('padding', '8px 10px')
        .style('transform', 'translate(-50%, 0)')
        .style('font-size', '13px')
        .style('font-weight', '800')
        .style('color', 'rgba(0,0,0,0.85)')
        .style('white-space', 'nowrap')
        .style('max-width', '260px')
        .style('overflow', 'hidden')
        .style('text-overflow', 'ellipsis')

      const merged = enter.merge(card)
      merged
        .style('border-left', '4px solid rgba(0,0,0,0.25)')
        .text(d => d.m.title)

      const cardW = 260
      const topBase = yMid - 80
      const bottomBase = yMid + 18

      merged.each(function (d) {
        const cx = x(d.m.releaseDate)
        const left = clamp(cx, 10 + cardW / 2, containerBox.width - 10 - cardW / 2)

        d3.select(this).style('left', `${left}px`).style('top', `${d.top ? topBase : bottomBase}px`)
      })

      const topNodes: Array<{ el: HTMLDivElement; cx: number }> = []
      const bottomNodes: Array<{ el: HTMLDivElement; cx: number }> = []

      merged.each(function (d) {
        const el = this as HTMLDivElement
        const cx = x(d.m.releaseDate)
        if (d.top) topNodes.push({ el, cx })
        else bottomNodes.push({ el, cx })
      })

      resolveBandVerticalLayout(topNodes, topBase, 'up', containerBox.height, 4)
      resolveBandVerticalLayout(bottomNodes, bottomBase, 'down', containerBox.height, 4)
    }

    const DOT_DIM_OPACITY = 0.18
    const ARC_DIM_OPACITY = 0.1

    const baseArcOpacity = (d: (typeof arcsWithLane)[number]) => arcStyle[d.type].opacity
    const baseArcStrokeW = (d: (typeof arcsWithLane)[number]) => arcStyle[d.type].strokeWidth

    function clearHighlight() {
      clearMultiTooltips()

      svg
        .selectAll<SVGPathElement, TimelineEntry>('path.media-dot')
        .interrupt()
        .attr('d', d => markerPath(d.mediaType, dotR))
        .attr('opacity', 1)
        .attr('stroke-width', dotStrokeW)

      svg
        .selectAll<SVGPathElement, (typeof arcsWithLane)[number]>('path.arc')
        .interrupt()
        .attr('opacity', d => baseArcOpacity(d))
        .attr('stroke-width', d => baseArcStrokeW(d))
    }

    function applyHighlight(hoverTitle: string) {
      const outgoing = arcsWithLane.filter(d => d.from === hoverTitle)

      const highlightTitles = new Set<string>([hoverTitle])
      for (const a of outgoing) highlightTitles.add(a.to)

      renderMultiTooltips(highlightTitles, hoverTitle)

      svg
        .selectAll<SVGPathElement, TimelineEntry>('path.media-dot')
        .interrupt()
        .attr('opacity', DOT_DIM_OPACITY)
        .attr('d', d => markerPath(d.mediaType, dotR))
        .attr('stroke-width', dotStrokeW)

      svg
        .selectAll<SVGPathElement, (typeof arcsWithLane)[number]>('path.arc')
        .interrupt()
        .attr('opacity', ARC_DIM_OPACITY)
        .attr('stroke-width', d => baseArcStrokeW(d))

      svg
        .selectAll<SVGPathElement, (typeof arcsWithLane)[number]>('path.arc')
        .filter(d => d.from === hoverTitle)
        .attr('opacity', d => Math.min(1, baseArcOpacity(d) + 0.15))
        .attr('stroke-width', d => baseArcStrokeW(d) + 1.2)

      svg
        .selectAll<SVGPathElement, TimelineEntry>('path.media-dot')
        .filter(d => highlightTitles.has(d.title))
        .attr('opacity', 1)
        .attr('d', d => markerPath(d.mediaType, d.title === hoverTitle ? dotR + 3 : dotR + 1))

      svg
        .selectAll<SVGPathElement, TimelineEntry>('path.media-dot')
        .filter(d => d.title === hoverTitle)
        .attr('stroke-width', dotStrokeW + 1.2)
    }

    svg
      .selectAll<SVGPathElement, TimelineEntry>('path.media-dot')
      .on('mouseenter', (_evt, d) => applyHighlight(d.title))
      .on('mouseleave', () => clearHighlight())

    const arcLegend = svg.append('g').attr('transform', `translate(${margin.left}, ${height - margin.bottom + 0})`)
    const arcLegendItems: Array<{ type: ArcType }> = [{ type: 'sequel' }, { type: 'crossover' }, { type: 'carryover' }]

    const aItem = arcLegend
      .selectAll('g.arc-item')
      .data(arcLegendItems)
      .join('g')
      .attr('class', 'arc-item')
      .attr('transform', (_d, i) => `translate(${i * 260}, 0)`)

    aItem
      .append('line')
      .attr('x1', 0)
      .attr('x2', 46)
      .attr('y1', -20)
      .attr('y2', -20)
      .attr('stroke', d => arcStyle[d.type].stroke)
      .attr('stroke-width', d => arcStyle[d.type].strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('opacity', d => arcStyle[d.type].opacity)
      .attr('stroke-dasharray', d => arcStyle[d.type].dash ?? null)

    aItem
      .append('text')
      .attr('x', 56)
      .attr('y', -16)
      .style('font-size', '12px')
      .style('fill', 'rgba(0,0,0,0.75)')
      .text(d => arcStyle[d.type].label)

    const mediaLegend = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top + 50})`)
    const mediaLegendItems: Array<{ type: MediaType; label: string }> = [
      { type: 'movie', label: 'Movie' },
      { type: 'show', label: 'TV Show' }
    ]

    const mItem = mediaLegend
      .selectAll('g.media-item')
      .data(mediaLegendItems)
      .join('g')
      .attr('class', 'media-item')
      .attr('transform', (_d, i) => `translate(0, ${8 + i * 18})`)

    mItem
      .filter(d => d.type === 'movie')
      .append('circle')
      .attr('r', 5)
      .attr('cx', 0)
      .attr('cy', -20)
      .attr('fill', d => dotFill[d.type])
      .attr('stroke', d => dotStroke[d.type])
      .attr('stroke-width', 1.2)

    mItem
      .filter(d => d.type === 'show')
      .append('path')
      .attr('d', d3.symbol().type(d3.symbolTriangle).size(24))
      .attr('transform', 'translate(0, -20)')
      .attr('fill', d => dotFill[d.type])
      .attr('stroke', d => dotStroke[d.type])
      .attr('stroke-width', 1.2)

    mItem
      .append('text')
      .attr('x', 10)
      .attr('y', -16)
      .style('font-size', '12px')
      .style('fill', 'rgba(0,0,0,0.75)')
      .text(d => d.label)

    const phaseLegend = svg.append('g').attr('transform', `translate(${margin.left}, ${height - margin.bottom + 18})`)
    const phaseLegendItems: Array<{ phase: Phase; label: string }> = [
      { phase: 4, label: 'Phase 4' },
      { phase: 5, label: 'Phase 5' },
      { phase: 6, label: 'Phase 6' }
    ]

    const pItem = phaseLegend
      .selectAll('g.item')
      .data(phaseLegendItems)
      .join('g')
      .attr('class', 'item')
      .attr('transform', (_d, i) => `translate(${i * 120}, 0)`)

    pItem
      .append('circle')
      .attr('r', 5)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('fill', d => phaseColors[d.phase])
      .attr('stroke', 'rgba(0,0,0,0.25)')
      .attr('stroke-width', 1)

    pItem
      .append('text')
      .attr('x', 10)
      .attr('y', 4)
      .style('font-size', '12px')
      .style('fill', 'rgba(0,0,0,0.75)')
      .text(d => d.label)

    return () => {
      clearMultiTooltips()
    }
  }, [entries, phaseRanges, size, filterMode])

  const btnStyle = (active: boolean): React.CSSProperties => ({
    border: '1px solid rgba(0,0,0,0.18)',
    background: active ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
    color: active ? 'white' : 'rgba(0,0,0,0.8)',
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none'
  })

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 30,
          display: 'flex',
          gap: 8,
          padding: 8,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
        }}
      >
        <button style={btnStyle(filterMode === 'all')} onClick={() => setFilterMode('all')}>
          All lines
        </button>
        <button style={btnStyle(filterMode === 'sequel')} onClick={() => setFilterMode('sequel')}>
          Direct sequel
        </button>
        <button style={btnStyle(filterMode === 'crossover')} onClick={() => setFilterMode('crossover')}>
          Crossover
        </button>
        <button style={btnStyle(filterMode === 'carryover')} onClick={() => setFilterMode('carryover')}>
          Carryover
        </button>
      </div>

      <svg ref={svgRef} width="100%" height="100%" style={{ position: 'relative', zIndex: 10 }} />
    </div>
  )
}
