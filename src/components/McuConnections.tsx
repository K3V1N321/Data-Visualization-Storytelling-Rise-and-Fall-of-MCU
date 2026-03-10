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

type Movie = {
  id: string
  title: string
  phase: Phase
  releaseDate: Date
  releaseDateStr: string
  posterUrl: string | null
}

type ArcSide = 'top' | 'bottom'
type ArcType = 'sequel' | 'crossover' | 'carryover'
type Connection = { type: ArcType; from: string; to: string; side?: ArcSide; label?: string }

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

const CONNECTIONS: Connection[] = [
  { type: 'sequel', from: 'Iron Man', to: 'Iron Man 2', side: 'top' },
  { type: 'sequel', from: 'Iron Man 2', to: 'Iron Man 3', side: 'bottom' },
  { type: 'crossover', from: 'Iron Man 2', to: 'The Avengers', side: 'top' },
  { type: 'sequel', from: 'Thor', to: 'Thor: The Dark World', side: 'bottom' },
  { type: 'crossover', from: 'Thor', to: 'The Avengers', side: 'bottom' },
  { type: 'sequel', from: 'Captain America: The First Avenger', to: 'Captain America: The Winter Soldier', side: 'top' },
  { type: 'crossover', from: 'Captain America: The First Avenger', to: 'The Avengers', side: 'top' },
  { type: 'sequel', from: 'The Avengers', to: 'Avengers: Age of Ultron', side: 'top' },
  { type: 'carryover', from: 'The Avengers', to: 'Thor: The Dark World', side: 'bottom' },
  { type: 'carryover', from: 'The Avengers', to: 'Captain America: The Winter Soldier', side: 'top' },
  { type: 'crossover', from: 'Iron Man 3', to: 'Avengers: Age of Ultron', side: 'top' },
  { type: 'sequel', from: 'Thor: The Dark World', to: 'Thor: Ragnarok', side: 'bottom' },
  { type: 'crossover', from: 'Thor: The Dark World', to: 'Avengers: Age of Ultron', side: 'top' },
  { type: 'sequel', from: 'Captain America: The Winter Soldier', to: 'Captain America: Civil War', side: 'bottom' },
  { type: 'crossover', from: 'Captain America: The Winter Soldier', to: 'Avengers: Age of Ultron', side: 'top' },
  { type: 'carryover', from: 'Captain America: The Winter Soldier', to: 'Avengers: Age of Ultron', side: 'bottom' },
  { type: 'sequel', from: 'Guardians of the Galaxy', to: 'Guardians of the Galaxy Vol. 2', side: 'top' },
  { type: 'sequel', from: 'Avengers: Age of Ultron', to: 'Avengers: Infinity War', side: 'top' },
  { type: 'carryover', from: 'Avengers: Age of Ultron', to: 'Captain America: Civil War', side: 'top' },
  { type: 'sequel', from: 'Ant-Man', to: 'Ant-Man and the Wasp', side: 'bottom' },
  { type: 'crossover', from: 'Ant-Man', to: 'Captain America: Civil War', side: 'top' },
  { type: 'crossover', from: 'Captain America: Civil War', to: 'Avengers: Infinity War', side: 'top' },
  { type: 'carryover', from: 'Captain America: Civil War', to: 'Black Widow', side: 'top' },
  { type: 'sequel', from: 'Captain America: Civil War', to: 'Captain America: Brave New World', side: 'bottom' },
  { type: 'carryover', from: 'Captain America: Civil War', to: 'Spider-Man: Homecoming', side: 'bottom' },
  { type: 'carryover', from: 'Captain America: Civil War', to: 'Black Panther', side: 'top' },
  { type: 'sequel', from: 'Doctor Strange', to: 'Doctor Strange in the Multiverse of Madness', side: 'top' },
  { type: 'crossover', from: 'Doctor Strange', to: 'Avengers: Infinity War', side: 'bottom' },
  { type: 'sequel', from: 'Guardians of the Galaxy Vol. 2', to: 'Guardians of the Galaxy Vol. 3', side: 'top' },
  { type: 'crossover', from: 'Guardians of the Galaxy Vol. 2', to: 'Avengers: Infinity War', side: 'top' },
  { type: 'sequel', from: 'Spider-Man: Homecoming', to: 'Spider-Man: Far From Home', side: 'top' },
  { type: 'crossover', from: 'Spider-Man: Homecoming', to: 'Avengers: Infinity War', side: 'bottom' },
  { type: 'sequel', from: 'Thor: Ragnarok', to: 'Thor: Love and Thunder', side: 'top' },
  { type: 'crossover', from: 'Thor: Ragnarok', to: 'Avengers: Infinity War', side: 'bottom' },
  { type: 'sequel', from: 'Black Panther', to: 'Black Panther: Wakanda Forever', side: 'top' },
  { type: 'crossover', from: 'Black Panther', to: 'Avengers: Infinity War', side: 'top' },
  { type: 'sequel', from: 'Avengers: Infinity War', to: 'Avengers: Endgame', side: 'top' },
  { type: 'sequel', from: 'Ant-Man and the Wasp', to: 'Ant-Man and the Wasp: Quantumania', side: 'bottom' },
  { type: 'carryover', from: 'Ant-Man and the Wasp', to: 'Avengers: Endgame', side: 'top' },
  { type: 'sequel', from: 'Captain Marvel', to: 'The Marvels', side: 'top' },
  { type: 'crossover', from: 'Captain Marvel', to: 'Avengers: Endgame', side: 'bottom' },
  { type: 'carryover', from: 'Avengers: Endgame', to: 'Spider-Man: Far From Home', side: 'top' },
  { type: 'sequel', from: 'Spider-Man: Far From Home', to: 'Spider-Man: No Way Home', side: 'bottom' },
  { type: 'carryover', from: 'Black Widow', to: 'Thunderbolts*', side: 'top' },
]

function parsePhase(raw: string): Phase | null {
  const n = Number(String(raw).trim())
  if (n >= 1 && n <= 6) return n as Phase
  return null
}

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime())
}

type FilterMode = 'all' | ArcType

export default function McuConnections() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 })
  const onResize = useDebounceCallback((s: ComponentSize) => setSize(s), 50)
  useResizeObserver({ ref: containerRef as React.RefObject<HTMLDivElement>, onResize })

  const [movies, setMovies] = useState<Movie[]>([])
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const rows = (await d3.csv('/data/marvel_movies_tmdb.csv')) as unknown as CsvRow[]

      const parsed: Movie[] = rows
        .map(r => {
          const phase = parsePhase(r.phase)
          const date = new Date(r.release_date)
          if (!phase) return null
          if (!isValidDate(date)) return null

          const title = (r.title ?? '').trim()
          if (!title) return null
          if (title === 'The Incredible Hulk') return null

          const posterPath = (r.poster_path ?? '').trim()
          const posterUrl = posterPath ? `${TMDB_POSTER_BASE}${posterPath}` : null

          return {
            id: String(r.id),
            title,
            phase,
            releaseDate: date,
            releaseDateStr: r.release_date,
            posterUrl
          } satisfies Movie
        })
        .filter((x): x is Movie => x !== null)
        .sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime())

      if (!cancelled) {
        setMovies(parsed)
      }
    }

    load().catch(err => {
      console.error('Failed to load CSV:', err)
      if (!cancelled) {
        setMovies([])
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
    if (movies.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin: Margin = { top: 42, right: 70, bottom: 24, left: 70 }
    const width = size.width
    const height = size.height
    const yMid = 272

    const x0 = margin.left
    const x1 = width - margin.right
    const topSafeY = -42

    const minDate = movies[0].releaseDate
    const maxDate = movies[movies.length - 1].releaseDate
    const orderedTitles = movies.map(m => m.title)
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

    const dotColor = '#FFCC00'
    const dotR = 5
    const dotStrokeW = 1.5

    const arcStyle: Record<
      ArcType,
      { label: string; stroke: string; strokeWidth: number; dash: string | null; opacity: number }
    > = {
      sequel: { label: 'Direct sequels', stroke: 'rgba(35,35,35,0.72)', strokeWidth: 1.9, dash: null, opacity: 0.92 },
      crossover: { label: 'Crossovers', stroke: 'rgba(55,55,55,0.62)', strokeWidth: 1.7, dash: '9,5', opacity: 0.82 },
      carryover: { label: 'Major story carryovers', stroke: 'rgba(70,70,70,0.58)', strokeWidth: 1.6, dash: '2,4', opacity: 0.78 }
    }

    // Title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 46)
      .style('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 900)
      .text('MCU Movies Connections')

    // base line shadow
    svg
      .append('line')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', yMid)
      .attr('y2', yMid)
      .attr('stroke', 'rgba(0,0,0,0.10)')
      .attr('stroke-width', 18)
      .attr('stroke-linecap', 'round')

    // phase segments based on order on the timeline (equal spacing by title order)
    const phaseSegments = ([1, 2, 3, 4, 5, 6] as Phase[])
      .map(phase => {
        const list = movies.filter(movie => movie.phase === phase)
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

    // year labels
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

    // Resolve connections
    const byTitle = new Map<string, Movie>()
    movies.forEach(m => byTitle.set(m.title, m))

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

    function assignLanes(list: typeof resolvedVisible, minGap = 18) {
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

    const sequelArcs = assignLanes(resolvedVisible.filter(d => d.type === 'sequel'), 10)
    const crossoverArcsRaw = assignLanes(resolvedVisible.filter(d => d.type === 'crossover'))
    const carryoverArcsRaw = assignLanes(resolvedVisible.filter(d => d.type === 'carryover'))
    const crossoverArcs = crossoverArcsRaw
    const carryoverArcs = carryoverArcsRaw
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
        const laneLift = d.lane * 6
        const spanLift = Math.max(16, Math.min(400, Math.pow(dx, 0.9) * 0.8))
        const rawArcHeight = base + laneLift + spanLift
        const maxArcHeight = Math.max(24, yMid - topSafeY)
        const arcHeight = Math.min(rawArcHeight, maxArcHeight)
        const cy = yMid - arcHeight
        return `M ${d.x1} ${yMid} Q ${(d.x1 + d.x2) / 2} ${cy} ${d.x2} ${yMid}`
      })

    // Dots
    const gDots = svg.append('g').attr('class', 'dots')

    gDots
      .selectAll('circle.movie-dot')
      .data(movies)
      .join('circle')
      .attr('class', 'movie-dot')
      .attr('data-title', d => d.title)
      .attr('cx', d => xPos(d.title))
      .attr('cy', yMid)
      .attr('r', dotR)
      .attr('fill', dotColor)
      .attr('stroke', 'black')
      .attr('stroke-width', dotStrokeW)
      .style('cursor', 'pointer')

    // movie names at the bottom of timeline
    svg
      .append('g')
      .selectAll('text.movie-name')
      .data(movies)
      .join('text')
      .attr('class', 'movie-name')
      .attr('x', d => xPos(d.title))
      .attr('y', yMid + 14)
      .attr('transform', d => `rotate(70, ${xPos(d.title)}, ${yMid + 14})`)
      .style('font-size', '9px')
      .style('fill', 'rgba(0,0,0,0.72)')
      .style('text-anchor', 'start')
      .text(d => d.title)

    // Hover highlight
    const DOT_DIM_OPACITY = 0.18
    const ARC_DIM_OPACITY = 0.1

    const baseArcOpacity = (d: (typeof arcsWithLane)[number]) => arcStyle[d.type].opacity
    const baseArcStrokeW = (d: (typeof arcsWithLane)[number]) => arcStyle[d.type].strokeWidth

    function clearHighlight() {
      svg
        .selectAll<SVGCircleElement, Movie>('circle.movie-dot')
        .interrupt()
        .attr('r', dotR)
        .attr('opacity', 1)
        .attr('stroke-width', dotStrokeW)

      svg
        .selectAll<SVGPathElement, (typeof arcsWithLane)[number]>('path.arc')
        .interrupt()
        .attr('opacity', d => baseArcOpacity(d))
        .attr('stroke-width', d => baseArcStrokeW(d))

      svg
        .selectAll<SVGTextElement, Movie>('text.movie-name')
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

      // dim all
      svg
        .selectAll<SVGCircleElement, Movie>('circle.movie-dot')
        .interrupt()
        .attr('opacity', DOT_DIM_OPACITY)
        .attr('r', dotR)
        .attr('stroke-width', dotStrokeW)

      svg
        .selectAll<SVGPathElement, (typeof arcsWithLane)[number]>('path.arc')
        .interrupt()
        .attr('opacity', ARC_DIM_OPACITY)
        .attr('stroke-width', d => baseArcStrokeW(d))

      // highlight outgoing arcs
      svg
        .selectAll<SVGPathElement, (typeof arcsWithLane)[number]>('path.arc')
        .filter(d => highlightArc(d))
        .attr('opacity', d => Math.min(1, baseArcOpacity(d) + 0.15))
        .attr('stroke-width', d => baseArcStrokeW(d) + 1.2)

      // highlight dots
      svg
        .selectAll<SVGCircleElement, Movie>('circle.movie-dot')
        .filter(d => highlightTitles.has(d.title))
        .attr('opacity', 1)
        .attr('r', d => (d.title === hoverTitle ? dotR + 3 : dotR + 1))

      svg
        .selectAll<SVGCircleElement, Movie>('circle.movie-dot')
        .filter(d => d.title === hoverTitle)
        .attr('stroke-width', dotStrokeW + 1.2)

      svg
        .selectAll<SVGTextElement, Movie>('text.movie-name')
        .interrupt()
        .style('opacity', 0.28)

      svg
        .selectAll<SVGTextElement, Movie>('text.movie-name')
        .filter(d => highlightTitles.has(d.title))
        .style('opacity', 1)
        .style('fill', d => (d.title === hoverTitle ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.84)'))
        .style('font-weight', d => (d.title === hoverTitle ? '700' : '600'))
    }

    svg
      .selectAll<SVGCircleElement, Movie>('circle.movie-dot')
      .on('mouseenter', (_evt, d) => applyHighlight(d.title))
      .on('mouseleave', () => clearHighlight())

    // Legends (unchanged)
    const phaseLegendY = 516
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
      { phase: 1, label: 'Phase 1' },
      { phase: 2, label: 'Phase 2' },
      { phase: 3, label: 'Phase 3' },
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
  }, [movies, size, filterMode])

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
          top: 34,
          left: 20,
          zIndex: 20,
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: '0.01em',
          color: 'rgba(0,0,0,0.58)'
        }}
      >
        Hover over the dot to highlight related movies
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 18,
          zIndex: 20,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.01em',
          color: 'rgba(0,0,0,0.52)'
        }}
      >
        Click the buttons to filter the connection lines
      </div>

      <div
        style={{
          position: 'absolute',
          top: 46,
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

      {/* SVG must be above overlay */}
      <svg ref={svgRef} width="100%" height="100%" style={{ position: 'relative', zIndex: 10 }} />
    </div>
  )
}
