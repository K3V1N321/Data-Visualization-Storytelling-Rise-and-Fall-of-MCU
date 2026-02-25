import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts'
import { ComponentSize, Margin } from '../types'

/** =========================
 *  Manual “important movies”
 *  =========================
 *  - Key MUST match CSV `title` exactly
 *  - You manually write the note
 *  - anchor controls which side gets the ANNOTATION.
 *      - anchor = 'top'    => annotation on top, poster on bottom
 *      - anchor = 'bottom' => annotation on bottom, poster on top
 */
type Anchor = 'top' | 'bottom'
type ImportantMeta = { anchor: Anchor; note: string }
const IMPORTANT: Record<string, ImportantMeta> = {
  'Iron Man': { anchor: 'bottom', note: 'Kickstarts the MCU and defines its tone' },
  'The Avengers': { anchor: 'top', note: 'First major crossover event + Huge box office success' },
  'Iron Man 3': { anchor: 'bottom', note: 'Phase 2 starts' },
  'Captain America: The Winter Soldier': { anchor: 'top', note: 'Political thriller tone + Elevated storytelling' },
  'Captain America: Civil War': { anchor: 'bottom', note: 'Phase 3 starts + Setting up the next Avengers movie' },
  'Black Panther': { anchor: 'top', note: 'First superhero movie nominated for Best Picture' },
  'Avengers: Endgame': { anchor: 'bottom', note: 'Infinity Saga finale + Peak MCU + Huge cultural moment + Higest box office/ IMDB rating' },
  'Black Widow': { anchor: 'top', note: 'Phase 4 starts + Weak rating/box office' },
  'Spider-Man: No Way Home': { anchor: 'bottom', note: 'Global success + Last “Endgame-level” cultural moment' },
  'Ant-Man and the Wasp: Quantumania': { anchor: 'top', note: 'Phase 5 starts + Weak performance + Turning point in audience fatigue' },
  'The Marvels': { anchor: 'bottom', note: 'Worst proifit/rating MCU movie in history' },
  'The Fantastic 4: First Steps': { anchor: 'top', note: 'Phase 6 starts' }
}

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
  posterUrl: string

  important: boolean
  anchor?: Anchor
  note?: string
}

type PhaseRange = {
  phase: Phase
  start: Date
  end: Date
}

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w185' // use w342 if you want bigger posters

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

// Simple SVG text wrap into tspans (good enough for short notes)
function wrapSvgText(textSel: d3.Selection<SVGTextElement, string, any, any>, maxWidthPx: number) {
  textSel.each(function () {
    const textEl = d3.select(this)
    const full = textEl.text()
    const words = full.split(/\s+/).filter(Boolean)
    textEl.text('')

    let line: string[] = []
    let lineNumber = 0
    const lineHeightEm = 1.15
    const y = Number(textEl.attr('y') ?? 0)
    const x = Number(textEl.attr('x') ?? 0)

    let tspan = textEl.append('tspan').attr('x', x).attr('y', y).attr('dy', '0em')

    for (const w of words) {
      line.push(w)
      tspan.text(line.join(' '))
      const node = tspan.node()
      if (node && node.getComputedTextLength() > maxWidthPx && line.length > 1) {
        line.pop()
        tspan.text(line.join(' '))
        line = [w]
        lineNumber += 1
        tspan = textEl
          .append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', `${lineNumber * lineHeightEm}em`)
          .text(w)
      }
    }
  })
}

export default function McuTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 })
  const onResize = useDebounceCallback((s: ComponentSize) => setSize(s), 50)
  useResizeObserver({ ref: containerRef as React.RefObject<HTMLDivElement>, onResize })

  const [movies, setMovies] = useState<Movie[]>([])
  const [phaseRanges, setPhaseRanges] = useState<PhaseRange[]>([])

  // Load CSV once
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
          if (title === 'The Incredible Hulk') return null // exclude

          const meta = IMPORTANT[title]
          const posterPath = (r.poster_path ?? '').trim()
          const posterUrl = posterPath ? `${TMDB_POSTER_BASE}${posterPath}` : ''

          return {
            id: String(r.id),
            title,
            phase,
            releaseDate: date,
            releaseDateStr: r.release_date,
            posterUrl,

            important: !!meta,
            anchor: meta?.anchor,
            note: meta?.note
          } satisfies Movie
        })
        .filter((x): x is Movie => x !== null)
        .sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime())

      // Compute CONTIGUOUS phase ranges (no gaps) via midpoints between phase ends/starts.
      const grouped = d3.group(parsed, d => d.phase)
      const firstOf: Partial<Record<Phase, Date>> = {}
      const lastOf: Partial<Record<Phase, Date>> = {}

      ;([1, 2, 3, 4, 5, 6] as Phase[]).forEach(p => {
        const list = grouped.get(p)
        if (!list || list.length === 0) return
        firstOf[p] = list[0].releaseDate
        lastOf[p] = list[list.length - 1].releaseDate
      })

      const overallStart = parsed[0]?.releaseDate
      const overallEnd = parsed[parsed.length - 1]?.releaseDate

      const ranges: PhaseRange[] = []
      if (overallStart && overallEnd) {
        const phases = ([1, 2, 3, 4, 5, 6] as Phase[]).filter(p => firstOf[p] && lastOf[p])
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
        setMovies(parsed)
        setPhaseRanges(ranges)
      }
    }

    load().catch(err => {
      console.error('Failed to load CSV:', err)
      if (!cancelled) {
        setMovies([])
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
    if (movies.length === 0) return

    const root = d3.select(containerRef.current)
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin: Margin = { top: 36, right: 70, bottom: 44, left: 70 }
    const width = size.width
    const height = size.height
    const yMid = Math.round(height / 2)

    const x0 = margin.left
    const x1 = width - margin.right

    const minDate = movies[0].releaseDate
    const maxDate = movies[movies.length - 1].releaseDate

    const x = d3.scaleTime().domain([minDate, maxDate]).range([x0, x1])

    // Colors
    const phaseColors: Record<Phase, string> = {
      1: '#1f77b4',
      2: '#ff7f0e',
      3: '#2ca02c',
      4: '#d62728',
      5: '#9467bd',
      6: '#8c564b'
    }
    const dotColor = '#FFCC00'

    // Split important / normal
    const importantMovies = movies.filter(m => m.important)
    const normalMovies = movies.filter(m => !m.important)

    // Slight jitter for normal movies with same year+phase
    const yearBucket = (d: Movie) => d.releaseDate.getFullYear()
    const bucketKey = (d: Movie) => `${d.phase}-${yearBucket(d)}`
    const moviesByBucket = d3.group(normalMovies, bucketKey)
    const dotSpacing = 14

    // Tooltip (ONLY for normal movies)
    const tooltip = root
      .selectAll<HTMLDivElement, unknown>('div.mcu-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'mcu-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('z-index', '20')
      .style('display', 'none')
      .style('background', 'rgba(255,255,255,0.98)')
      .style('border', '1px solid rgba(0,0,0,0.12)')
      .style('border-radius', '12px')
      .style('box-shadow', '0 10px 22px rgba(0,0,0,0.12)')
      .style('padding', '10px')
      .style('max-width', '260px')

    const containerBox = containerRef.current.getBoundingClientRect()
    const showTooltip = (event: MouseEvent, d: Movie) => {
      const imgHtml = d.posterUrl
        ? `<img src="${d.posterUrl}" alt="${d.title}" style="width:54px;height:81px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);object-fit:cover;" />`
        : `<div style="width:54px;height:81px;border-radius:10px;border:1px dashed rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(0,0,0,0.5);">No poster</div>`

      tooltip
        .style('display', 'block')
        .html(
          `
          <div style="display:flex; gap:10px; align-items:center;">
            ${imgHtml}
            <div style="min-width:0;">
              <div style="font-weight:800; font-size:13px; color: rgba(0,0,0,0.85); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px;">${d.title}</div>
              <div style="font-size:12px; color: rgba(0,0,0,0.65); margin-top:2px;">${d.releaseDateStr} • Phase ${d.phase}</div>
            </div>
          </div>
          `.trim()
        )

      const px = event.clientX - containerBox.left
      const py = event.clientY - containerBox.top
      tooltip.style('left', `${Math.min(px + 14, containerBox.width - 270)}px`).style('top', `${Math.max(py - 10, 8)}px`)
    }

    // Title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', margin.top - 14)
      .style('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 900)
      .text('Marvel Cinematic Universe Timeline (2008–Present)')

    // Base shadow line
    svg
      .append('line')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', yMid)
      .attr('y2', yMid)
      .attr('stroke', 'rgba(0,0,0,0.10)')
      .attr('stroke-width', 22)
      .attr('stroke-linecap', 'round')

    // ===== Timeline start/end year labels =====

    const yearLabelPad = 10

    // Left year (start) — text ends exactly at x0
    svg
      .append('text')
      .attr('x', x0 - yearLabelPad - 5)
      .attr('y', yMid + 5)
      .style('text-anchor', 'end')
      .style('font-size', '13px')
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.65)')
      .text('2008')

    // Right year (end) — text starts right after x1
    svg
      .append('text')
      .attr('x', x1 + yearLabelPad + 5 )
      .attr('y', yMid + 5)
      .style('text-anchor', 'start')
      .style('font-size', '13px')
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.65)')
      .text('2026')

    // Phase line segments (contiguous)
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
      .attr('stroke-width', 16)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.92)

    // Dots group
    const gDots = svg.append('g').attr('class', 'dots')

    // Normal dots (with jitter) + tooltip hover
    const normalNodes = gDots
      .selectAll('circle.movie-dot')
      .data(normalMovies)
      .join('circle')
      .attr('class', 'movie-dot')
      // .attr('cx', d => {
      //   const key = bucketKey(d)
      //   const list = moviesByBucket.get(key) ?? [d]
      //   const idx = list.findIndex(m => m.id === d.id)
      //   const offset = (idx - (list.length - 1) / 2) * dotSpacing
      //   return x(d.releaseDate) + offset
      // })
      .attr('cx', d => x(d.releaseDate))
      .attr('cy', yMid)
      .attr('r', 6)
      .attr('fill', dotColor)
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5)
      .style('cursor', 'default')

    normalNodes
      .on('mouseenter', function (event, d) {
        showTooltip(event as unknown as MouseEvent, d)
        d3.select(this).attr('r', 7)
      })
      .on('mousemove', function (event, d) {
        showTooltip(event as unknown as MouseEvent, d)
      })
      .on('mouseleave', function () {
        tooltip.style('display', 'none')
        d3.select(this).attr('r', 6)
      })

    // Important dots (NO hover handlers)
    gDots
      .selectAll('circle.important-dot')
      .data(importantMovies)
      .join('circle')
      .attr('class', 'important-dot')
      .attr('cx', d => x(d.releaseDate))
      .attr('cy', yMid)
      .attr('r', 6)
      .attr('fill', dotColor)
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5)

    // ===== Important posters + annotations (opposite sides) =====
    const posterW = 48
    const posterH = 72
    const gap = 10
    const labelW = 80 // thinner (try 100–120)
    const labelH = 88  // taller so text fits
    const labelPadX = 10

    const labelGap = 25 // closer to the timeline

    // helper: poster Y (opposite side of annotation)
    const posterY = (d: Movie) => {
      const annoTop = (d.anchor ?? 'top') === 'top'
      // if annotation is top -> poster is bottom
      return annoTop ? yMid + 20 : yMid - 20 - posterH
    }

    // helper: label Y (annotation side)
    const labelY = (d: Movie) => {
      const annoTop = (d.anchor ?? 'top') === 'top'
      return annoTop
        ? yMid - labelGap - labelH // close above line
        : yMid + labelGap          // close below line
    }

    // helper: anchor point where connector ends (top/bottom center of poster)
    const posterAnchorY = (d: Movie) => {
      const y = posterY(d)
      const annoTop = (d.anchor ?? 'top') === 'top'
      // If poster is bottom, connect to its TOP edge; if poster is top, connect to its BOTTOM edge
      return annoTop ? y : y + posterH
    }

    const gAnno = svg.append('g').attr('class', 'important-annotations')

    // Connector line: ONLY dot -> poster (not to label)
    gAnno
      .selectAll('line.connector')
      .data(importantMovies)
      .join('line')
      .attr('class', 'connector')
      .attr('x1', d => x(d.releaseDate))
      .attr('x2', d => x(d.releaseDate))
      .attr('y1', yMid)
      .attr('y2', d => posterAnchorY(d))
      .attr('stroke', 'rgba(0,0,0,0.18)')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')

    // one group per important movie (x translated only)
    const anno = gAnno
      .selectAll('g.anno')
      .data(importantMovies)
      .join('g')
      .attr('class', 'anno')
      .attr('transform', d => `translate(${x(d.releaseDate)}, 0)`)

    // Poster placeholder rect
    anno
      .append('rect')
      .attr('x', -posterW / 2)
      .attr('y', d => posterY(d))
      .attr('width', posterW)
      .attr('height', posterH)
      .attr('rx', 8)
      .attr('fill', 'rgba(240,240,240,1)')
      .attr('stroke', 'rgba(0,0,0,0.14)')

    // Poster image
    anno
      .append('image')
      .attr('href', d => d.posterUrl)
      .attr('x', -posterW / 2)
      .attr('y', d => posterY(d))
      .attr('width', posterW)
      .attr('height', posterH)
      .attr('preserveAspectRatio', 'xMidYMid slice')

    // // Label card background (annotation side)
    // anno
    //   .append('rect')
    //   .attr('x', -labelW / 2)
    //   .attr('y', d => labelY(d))
    //   .attr('width', labelW)
    //   .attr('height', labelH)
    //   .attr('rx', 12)
    //   .attr('fill', 'rgba(255,255,255,0.96)')
    //   .attr('stroke', 'rgba(0,0,0,0.14)')

   // --- Title (wrapped) ---
    const titleStartY = 2
    const titleFontSize = 9
    const titleLineEm = 1.15

    const titleText = anno
      .append('text')
      .attr('x', 0)
      .attr('y', d => labelY(d) + titleStartY )
      .style('text-anchor', 'middle')
      .style('font-size', `${titleFontSize}px`)
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.85)')
      .text(d => d.title)

    // Wrap the title into multiple tspans
    titleText.call(sel => wrapSvgText(sel as any, labelW - 1 * labelPadX))

    // Add year on the NEXT line (and store how many title lines we used)
    titleText.each(function (d) {
      const textNode = d3.select(this)
      const lineCount = textNode.selectAll('tspan').size()

      ;(d as any).__titleLines = lineCount

      textNode
        .append('tspan')
        .attr('x', 0)
        .attr('dy', `${titleLineEm}em`) // ✅ just one extra line down
        .style('font-size', '9px')
        .style('font-weight', 500)
        .style('fill', 'rgba(0,0,0,0.55)')
        .text(String(d.releaseDate.getFullYear()))
    })

    addTextHalo(titleText as any, 3)

    // --- Note (wrapped), positioned AFTER title+year dynamically ---
    const noteFontSize = 9
    const noteLinePx = noteFontSize * 1.15
    const noteTopPadPx = -9

    const noteText = anno
      .append('text')
      .attr('x', 0)
      .attr('y', d => {
        const titleLines = (d as any).__titleLines ?? 1
        // title block height = (titleLines + 1 year line) * title line height (px-ish)
        const titleBlockPx = (titleLines + 1) * (titleFontSize * 1.15)
        return labelY(d) + titleStartY + titleBlockPx + noteTopPadPx + noteLinePx
      })
      .style('text-anchor', 'middle')
      .style('font-size', `${noteFontSize}px`)
      .style('font-weight', 600)
      .style('fill', 'rgba(0,0,0,0.65)')
      .text(d => d.note ?? '')

    noteText.call(sel => wrapSvgText(sel as any, labelW - 2 * labelPadX))
    addTextHalo(noteText as any, 3)

    function addTextHalo(sel: d3.Selection<SVGTextElement, any, any, any>, strokeWidth = 4) {
      sel
        .clone(true)
        .lower()
        .style('fill', 'none')
        .style('stroke', 'rgba(255,255,255,0.95)')
        .style('stroke-width', strokeWidth)
        .style('stroke-linejoin', 'round')
    }

    // ===== Legend =====
    const legend = svg.append('g').attr('transform', `translate(${margin.left}, ${height - margin.bottom + 10})`)
    const legendItems: Array<{ phase: Phase; label: string }> = [
      { phase: 1, label: 'Phase 1' },
      { phase: 2, label: 'Phase 2' },
      { phase: 3, label: 'Phase 3' },
      { phase: 4, label: 'Phase 4' },
      { phase: 5, label: 'Phase 5' },
      { phase: 6, label: 'Phase 6' }
    ]

    const item = legend
      .selectAll('g.item')
      .data(legendItems)
      .join('g')
      .attr('class', 'item')
      .attr('transform', (_d, i) => `translate(${i * 120}, 0)`)

    item
      .append('circle')
      .attr('r', 5)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('fill', d => phaseColors[d.phase])
      .attr('stroke', 'rgba(0,0,0,0.25)')
      .attr('stroke-width', 1)

    item
      .append('text')
      .attr('x', 10)
      .attr('y', 4)
      .style('font-size', '12px')
      .style('fill', 'rgba(0,0,0,0.75)')
      .text(d => d.label)
  }, [movies, phaseRanges, size])

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
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  )
}