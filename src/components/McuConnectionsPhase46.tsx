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

type ArcSide = 'top' | 'bottom'
type ArcType = 'sequel' | 'crossover' | 'carryover'
type Connection = { type: ArcType; from: string; to: string; side?: ArcSide; label?: string }
type FilterMode = 'all' | ArcType

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w185'
const PHASES_TO_SHOW: Phase[] = [4, 5, 6]

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

export default function McuConnectionsPhase46() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 })
  const onResize = useDebounceCallback((s: ComponentSize) => setSize(s), 50)
  useResizeObserver({ ref: containerRef as React.RefObject<HTMLDivElement>, onResize })

  const [entries, setEntries] = useState<TimelineEntry[]>([])
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

      if (!cancelled) setEntries(parsed)
    }

    load().catch(err => {
      console.error('Failed to load connection CSVs:', err)
      if (!cancelled) setEntries([])
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

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin: Margin = { top: 42, right: 70, bottom: 24, left: 70 }
    const width = size.width
    const height = size.height
    const yMid = 270

    const x0 = margin.left
    const x1 = width - margin.right
    const topSafeY = -12

    const minDate = entries[0].releaseDate
    const maxDate = entries[entries.length - 1].releaseDate
    const orderedTitles = entries.map(e => e.title)
    const x = d3.scalePoint<string>().domain(orderedTitles).range([x0, x1]).padding(0.0)
    const xPos = (title: string) => x(title) ?? x0
    const pointStep = orderedTitles.length > 1 ? xPos(orderedTitles[1]) - xPos(orderedTitles[0]) : 0

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
      sequel: { label: 'Direct sequels', stroke: 'rgba(35,35,35,0.72)', strokeWidth: 1.9, dash: null, opacity: 0.92 },
      crossover: { label: 'Crossovers', stroke: 'rgba(55,55,55,0.62)', strokeWidth: 1.7, dash: '9,5', opacity: 0.82 },
      carryover: { label: 'Major story carryovers', stroke: 'rgba(70,70,70,0.58)', strokeWidth: 1.6, dash: '2,4', opacity: 0.78 }
    }

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
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

    const phaseSegments = PHASES_TO_SHOW
      .map(phase => {
        const list = entries.filter(entry => entry.phase === phase)
        if (list.length === 0) return null
        return { phase, startTitle: list[0].title, endTitle: list[list.length - 1].title }
      })
      .filter((d): d is { phase: Phase; startTitle: string; endTitle: string } => d !== null)

    svg
      .append('g')
      .selectAll('line.phase-line')
      .data(phaseSegments)
      .join('line')
      .attr('class', 'phase-line')
      .attr('x1', (d, i) => {
        const xStart = xPos(d.startTitle)
        return i === 0 ? xStart : xStart - pointStep / 2
      })
      .attr('x2', (d, i) => {
        const xEnd = xPos(d.endTitle)
        return i === phaseSegments.length - 1 ? xEnd : xEnd + pointStep / 2
      })
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

        const x1p = xPos(a.title)
        const x2p = xPos(b.title)
        const leftX = Math.min(x1p, x2p)
        const rightX = Math.max(x1p, x2p)
        const side: ArcSide = 'top'

        return { ...c, side, a, b, x1: x1p, x2: x2p, leftX, rightX, span: rightX - leftX }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((p, q) => p.leftX - q.leftX || q.span - p.span)

    const resolvedVisible = resolvedAll.filter(d => (filterMode === 'all' ? true : d.type === filterMode))

    function assignLanes(list: typeof resolvedVisible, minGap = 14) {
      const laneRightEnds: number[] = []
      const sorted = [...list].sort((a, b) => b.span - a.span || a.leftX - b.leftX)
      return sorted.map(d => {
        let lane = 0
        while (lane < laneRightEnds.length && d.leftX <= laneRightEnds[lane] + minGap) lane++
        if (lane === laneRightEnds.length) laneRightEnds.push(d.rightX)
        else laneRightEnds[lane] = d.rightX
        return { ...d, lane }
      })
    }

    const sequelArcs = assignLanes(resolvedVisible.filter(d => d.type === 'sequel'), 14)
    const crossoverArcs = assignLanes(resolvedVisible.filter(d => d.type === 'crossover'))
    const carryoverArcs = assignLanes(resolvedVisible.filter(d => d.type === 'carryover'))
    const arcsWithLane = [...sequelArcs, ...crossoverArcs, ...carryoverArcs]

    const sequelAdj = new Map<string, Set<string>>()
    for (const link of resolvedAll) {
      if (link.type !== 'sequel') continue
      if (!sequelAdj.has(link.from)) sequelAdj.set(link.from, new Set())
      if (!sequelAdj.has(link.to)) sequelAdj.set(link.to, new Set())
      sequelAdj.get(link.from)!.add(link.to)
      sequelAdj.get(link.to)!.add(link.from)
    }

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
        const base = 10
        const laneLift = d.lane * 4
        const spanLift = Math.max(16, Math.min(400, Math.pow(dx, 0.87) * 0.8))
        const rawArcHeight = base + laneLift + spanLift
        const maxArcHeight = Math.max(24, yMid - topSafeY)
        const arcHeight = Math.min(rawArcHeight, maxArcHeight)
        const cy = yMid - arcHeight
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
      .attr('transform', d => `translate(${xPos(d.title)}, ${yMid})`)
      .attr('fill', d => dotFill[d.mediaType])
      .attr('stroke', d => dotStroke[d.mediaType])
      .attr('stroke-width', dotStrokeW)
      .style('cursor', 'pointer')

    svg
      .append('g')
      .selectAll('text.media-name')
      .data(entries)
      .join('text')
      .attr('class', 'media-name')
      .attr('x', d => xPos(d.title))
      .attr('y', yMid + 14)
      .attr('transform', d => `rotate(70, ${xPos(d.title)}, ${yMid + 14})`)
      .style('font-size', '9px')
      .style('fill', 'rgba(0,0,0,0.72)')
      .style('text-anchor', 'start')
      .text(d => d.title)

    const DOT_DIM_OPACITY = 0.18
    const ARC_DIM_OPACITY = 0.1

    const baseArcOpacity = (d: (typeof arcsWithLane)[number]) => arcStyle[d.type].opacity
    const baseArcStrokeW = (d: (typeof arcsWithLane)[number]) => arcStyle[d.type].strokeWidth

    function clearHighlight() {
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

      svg
        .selectAll<SVGTextElement, TimelineEntry>('text.media-name')
        .interrupt()
        .style('fill', 'rgba(0,0,0,0.72)')
        .style('font-weight', '400')
        .style('opacity', 1)
    }

    function applyHighlight(hoverTitle: string) {
      const highlightTitles = new Set<string>([hoverTitle])
      const sequelSeriesTitles = new Set<string>([hoverTitle])
      let highlightArc: (d: (typeof arcsWithLane)[number]) => boolean

      if (filterMode === 'sequel' || filterMode === 'all') {
        const queue = [hoverTitle]
        while (queue.length > 0) {
          const cur = queue.shift()!
          const neighbors = sequelAdj.get(cur)
          if (!neighbors) continue
          for (const n of neighbors) {
            if (sequelSeriesTitles.has(n)) continue
            sequelSeriesTitles.add(n)
            highlightTitles.add(n)
            queue.push(n)
          }
        }

        if (filterMode === 'sequel') {
          highlightArc = d => d.type === 'sequel' && sequelSeriesTitles.has(d.from) && sequelSeriesTitles.has(d.to)
        } else {
          const relatedNonSequel = arcsWithLane.filter(
            d => d.type !== 'sequel' && (d.from === hoverTitle || d.to === hoverTitle)
          )
          for (const a of relatedNonSequel) {
            highlightTitles.add(a.from)
            highlightTitles.add(a.to)
          }

          highlightArc = d =>
            (d.type === 'sequel' && sequelSeriesTitles.has(d.from) && sequelSeriesTitles.has(d.to)) ||
            (d.type !== 'sequel' && (d.from === hoverTitle || d.to === hoverTitle))
        }
      } else {
        const outgoing = arcsWithLane.filter(d => d.from === hoverTitle)
        for (const a of outgoing) highlightTitles.add(a.to)
        highlightArc = d => d.from === hoverTitle
      }

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
        .filter(d => highlightArc(d))
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

      svg
        .selectAll<SVGTextElement, TimelineEntry>('text.media-name')
        .interrupt()
        .style('opacity', 0.28)

      svg
        .selectAll<SVGTextElement, TimelineEntry>('text.media-name')
        .filter(d => highlightTitles.has(d.title))
        .style('opacity', 1)
        .style('fill', d => (d.title === hoverTitle ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.84)'))
        .style('font-weight', d => (d.title === hoverTitle ? '700' : '600'))
    }

    svg
      .selectAll<SVGPathElement, TimelineEntry>('path.media-dot')
      .on('mouseenter', (_evt, d) => applyHighlight(d.title))
      .on('mouseleave', () => clearHighlight())

    const phaseLegendY = 530
    const arcLegendY = phaseLegendY - 5

    const arcLegend = svg.append('g').attr('transform', `translate(${margin.left}, ${arcLegendY})`)
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

    const phaseLegend = svg.append('g').attr('transform', `translate(${margin.left}, ${phaseLegendY})`)
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
  }, [entries, size, filterMode])

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
          top: 30,
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
