import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts'
import { ComponentSize, Margin } from '../types'

/** =========================
 *  Manual “important movies”
 *  =========================
 *  Key MUST match CSV `title` exactly
 *  manually write the note
 *  anchor controls which side gets the ANNOTATION.
 *       anchor = 'top'    => annotation on top, poster on bottom
 *       anchor = 'bottom' => annotation on bottom, poster on top
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
  'Avengers: Endgame': {anchor: 'bottom', note: 'Infinity Saga finale + Peak MCU + Huge cultural moment + Higest box office/ IMDB rating'},
  'Black Widow': { anchor: 'top', note: 'Phase 4 starts + Weak rating/box office + Weak start after Endgame' },
  'Spider-Man: No Way Home': { anchor: 'bottom', note: 'Global success + Last “Endgame-level” cultural moment' },
  'Ant-Man and the Wasp: Quantumania': { anchor: 'bottom', note: 'Phase 5 starts + Weak Performance + Turning point in audience fatigue' },
  'The Marvels': { anchor: 'bottom', note: 'Worst proifit/rating MCU movie in history' },
  'The Fantastic 4: First Steps': { anchor: 'top', note: 'Phase 6 starts + Slight underperformance in rating/box office' }
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

    const margin: Margin = { top: 36, right: 70, bottom: 20, left: 70 }
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

    const showTooltip = (event: MouseEvent, d: Movie) => {
    const containerBox = containerRef.current!.getBoundingClientRect()

    const imgHtml = d.posterUrl
      ? `<img src="${d.posterUrl}" alt="${d.title}" style="width:54px;height:81px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);object-fit:cover;" />`
      : `<div style="width:54px;height:81px;border-radius:10px;border-radius:10px;border:1px dashed rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(0,0,0,0.5);">No poster</div>`

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

    tooltip
      .style('left', `${Math.min(px + 14, containerBox.width - 270)}px`)
      .style('top', `${Math.max(py - 10, 8)}px`)
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

    svg
      .append('text')
      .attr('x', x0 - yearLabelPad - 5)
      .attr('y', yMid + 5)
      .style('text-anchor', 'end')
      .style('font-size', '13px')
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.65)')
      .text('2008')

    svg
      .append('text')
      .attr('x', x1 + yearLabelPad + 5)
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
    const dotR = 6
    const dotStrokeW = 1.5
    const dotOuterR = dotR + dotStrokeW / 2

    // connector styling + spacing so the line starts OUTSIDE the dot
    const connectorPosterW = 2
    const connectorLabelW = 1.5
    const connectorGap = 1.5 // extra pixels outside the dot edge

    // end dots at connector endpoints
    const endDotR = 2.6

    // padding between end dot and poster edge
    const posterEndPad = 8 // px gap between poster and end-dot/line

    // small padding for annotation connector endpoints
    const annoEndPadTop = 0    // when annotation is on top: dot sits a bit below note (toward timeline)
    const annoEndPadBottom = 15  // when annotation is on bottom: dot sits a bit ABOVE title start (toward timeline)

    // Normal dots + tooltip hover
    const normalNodes = gDots
      .selectAll('circle.movie-dot')
      .data(normalMovies)
      .join('circle')
      .attr('class', 'movie-dot')
      .attr('cx', d => x(d.releaseDate))
      .attr('cy', yMid)
      .attr('r', dotR)
      .attr('fill', dotColor)
      .attr('stroke', 'black')
      .attr('stroke-width', dotStrokeW)
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

    // ===== Important posters + annotations (opposite sides) =====
    const posterW = 48
    const posterH = 72
    const labelW = 80
    const labelH = 88
    const labelPadX = 10
    const labelGap = 35

    // =========================
    // Lane assignment (IMPORTANT only)
    // =========================
    type LaneDatum = Movie & { __laneTop?: number; __laneBottom?: number }
    const importantWithLanes: LaneDatum[] = importantMovies.map(d => d as LaneDatum)

    const xPad = 10
    const lanePad = 10
    const laneStep = Math.max(labelH, posterH) + lanePad

    function assignLanes(items: LaneDatum[], getHalfWidth: (d: LaneDatum) => number, side: 'top' | 'bottom') {
      const lanes: number[] = []
      const sorted = [...items].sort((a, b) => x(a.releaseDate) - x(b.releaseDate))

      for (const d of sorted) {
        const cx = x(d.releaseDate)
        const half = getHalfWidth(d) + xPad
        const left = cx - half
        const right = cx + half

        let lane = 0
        while (lane < lanes.length && left <= lanes[lane]) lane++

        if (lane === lanes.length) lanes.push(right)
        else lanes[lane] = right

        if (side === 'top') d.__laneTop = lane
        else d.__laneBottom = lane
      }
    }

    // TOP side: label if annoTop else poster
    assignLanes(
      importantWithLanes,
      d => {
        const annoTop = (d.anchor ?? 'top') === 'top'
        const w = annoTop ? labelW : posterW
        return w / 2
      },
      'top'
    )

    // BOTTOM side: poster if annoTop else label
    assignLanes(
      importantWithLanes,
      d => {
        const annoTop = (d.anchor ?? 'top') === 'top'
        const w = annoTop ? posterW : labelW
        return w / 2
      },
      'bottom'
    )

    const getTopLane = (d: LaneDatum) => d.__laneTop ?? 0
    const getBottomLane = (d: LaneDatum) => d.__laneBottom ?? 0

    // helper: poster Y (opposite side of annotation) + lanes
    const posterY = (d: LaneDatum) => {
      const annoTop = (d.anchor ?? 'top') === 'top'
      const posterOnBottom = annoTop
      if (posterOnBottom) {
        const lane = getBottomLane(d)
        return yMid + 40 + lane * laneStep
      } else {
        const lane = getTopLane(d)
        return yMid - 40 - posterH - lane * laneStep
      }
    }

    // helper: label Y (annotation side) + lanes
    const labelY = (d: LaneDatum) => {
      const annoTop = (d.anchor ?? 'top') === 'top'
      if (annoTop) {
        const lane = getTopLane(d)
        return yMid - labelGap - labelH - lane * laneStep
      } else {
        const lane = getBottomLane(d)
        return yMid + labelGap + lane * laneStep
      }
    }

    // Start connector slightly outside the dot (accounts for dot stroke + line cap)
    const dotEdgeY = (d: LaneDatum, strokeW: number) => {
      const annoTop = (d.anchor ?? 'top') === 'top'
      const pad = dotOuterR + strokeW / 2 + connectorGap
      return annoTop ? yMid - pad : yMid + pad
    }

    // ===== EXACT connector endpoints based on poster/label geometry =====
    const posterTopY = (d: LaneDatum) => posterY(d)
    const posterBottomY = (d: LaneDatum) => posterY(d) + posterH

    const labelTopY = (d: LaneDatum) => labelY(d)
    const labelBottomY = (d: LaneDatum) => labelY(d) + labelH

    // poster endpoint on the edge facing the timeline
    const posterEndY = (d: LaneDatum) => {
      const annoTop = (d.anchor ?? 'top') === 'top'
      const posterIsBottom = annoTop // annoTop => poster on bottom

      // edge facing the timeline, but pulled away from poster by posterEndPad
      return posterIsBottom
        ? posterTopY(d) - posterEndPad           // poster below timeline: pull endpoint UP
        : posterBottomY(d) + posterEndPad        // poster above timeline: pull endpoint DOWN
    }

    // label endpoint on the edge facing the timeline
    const labelEndY = (d: LaneDatum) => {
      const annoTop = (d.anchor ?? 'top') === 'top'

      // fallbacks in case bbox isn't available for some reason
      const titleTop = (d as any).__titleTopY ?? labelTopY(d)
      const noteBottom = (d as any).__noteBottomY ?? labelBottomY(d)

      if (annoTop) {
        // annotation is TOP: end at the END of the annotation text (note bottom),
        // plus a tiny pad toward the timeline
        return noteBottom + annoEndPadTop - 5
      } else {
        // annotation is BOTTOM: end BEFORE the title starts (slightly above title top)
        return titleTop - annoEndPadBottom
      }
    }

    // Important dots (WITH hover handlers)
    const importantNodes = gDots
      .selectAll('circle.important-dot')
      .data(importantWithLanes)
      .join('circle')
      .attr('class', 'important-dot')
      .attr('cx', d => x(d.releaseDate))
      .attr('cy', yMid)
      .attr('r', dotR)
      .attr('fill', dotColor)
      .attr('stroke', 'black')
      .attr('stroke-width', dotStrokeW)
      .style('cursor', 'default')

    importantNodes
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

    // Annotations group (behind dots)
    const gAnno = svg.append('g').attr('class', 'important-annotations')
    gAnno.lower()

    // Connector: dot -> poster
    gAnno
      .selectAll('line.connector-poster')
      .data(importantWithLanes)
      .join('line')
      .attr('class', 'connector-poster')
      .attr('x1', d => x(d.releaseDate))
      .attr('x2', d => x(d.releaseDate))
      .attr('y1', d => dotEdgeY(d, connectorPosterW))
      .attr('y2', d => posterEndY(d))
      .attr('stroke', 'rgba(0,0,0,0.18)')
      .attr('stroke-width', connectorPosterW)
      .attr('stroke-linecap', 'round')

    // End dot: poster connector
    gAnno
      .selectAll('circle.connector-poster-end')
      .data(importantWithLanes)
      .join('circle')
      .attr('class', 'connector-poster-end')
      .attr('cx', d => x(d.releaseDate))
      .attr('cy', d => posterEndY(d))
      .attr('r', endDotR)
      .attr('fill', 'black')
      .attr('stroke', 'none')

    // Connector: dot -> annotation (label)
    gAnno
      .selectAll('line.connector-label')
      .data(importantWithLanes)
      .join('line')
      .attr('class', 'connector-label')
      .attr('x1', d => x(d.releaseDate))
      .attr('x2', d => x(d.releaseDate))
      .attr('y1', d => dotEdgeY(d, connectorLabelW))
      .attr('y2', d => labelEndY(d))
      .attr('stroke', 'rgba(0,0,0,0.12)')
      .attr('stroke-width', connectorLabelW)
      .attr('stroke-linecap', 'round')

    // End dot: label connector
    gAnno
      .selectAll('circle.connector-label-end')
      .data(importantWithLanes)
      .join('circle')
      .attr('class', 'connector-label-end')
      .attr('cx', d => x(d.releaseDate))
      .attr('cy', d => labelEndY(d))
      .attr('r', endDotR)
      .attr('fill', 'black')
      .attr('stroke', 'none')

    // one group per important movie (x translated only)
    const anno = gAnno
      .selectAll('g.anno')
      .data(importantWithLanes)
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

    // --- Title (wrapped) ---
    const titleStartY = -2
    const titleFontSize = 9
    const titleLineEm = 1.15

    const titleText = anno
      .append('text')
      .attr('x', 0)
      .attr('y', d => labelY(d) + titleStartY)
      .style('text-anchor', 'middle')
      .style('font-size', `${titleFontSize}px`)
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.85)')
      .text(d => d.title)

    titleText.call(sel => wrapSvgText(sel as any, labelW - 1 * labelPadX))

    titleText.each(function (d: any) {
      const textNode = d3.select(this)
      const lineCount = textNode.selectAll('tspan').size()
      d.__titleLines = lineCount

      textNode
        .append('tspan')
        .attr('x', 0)
        .attr('dy', `${titleLineEm}em`)
        .style('font-size', '9px')
        .style('font-weight', 500)
        .style('fill', 'rgba(0,0,0,0.55)')
        .text(String(d.releaseDate.getFullYear()))
    })

    // measure title top (for bottom-annotation endpoint)
    titleText.each(function (d: any) {
      const bb = (this as SVGTextElement).getBBox()
      d.__titleTopY = bb.y
    })

    addTextHalo(titleText as any, 3)

    // --- Note (wrapped), positioned AFTER title+year dynamically ---
    const noteFontSize = 9
    const noteLinePx = noteFontSize * 1.15
    const noteTopPadPx = -7

    const noteText = anno
      .append('text')
      .attr('x', 0)
      .attr('y', d => {
        const titleLines = (d as any).__titleLines ?? 1
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

    // measure note bottom (for top-annotation endpoint)
    noteText.each(function (d: any) {
      const bb = (this as SVGTextElement).getBBox()
      d.__noteBottomY = bb.y + bb.height
    })

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