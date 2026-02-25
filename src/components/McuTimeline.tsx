import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts'
import { ComponentSize, Margin } from '../types'

type Phase = 1 | 2 | 3 | 4 | 5

type Movie = {
  id: string
  title: string
  year: number
  phase: Phase
  posterUrl: string // placeholder for now
}

function makePosterPlaceholderDataUri(label: string) {
  // Lightweight inline SVG so we don't depend on remote assets.
  const safe = label.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="90" height="135" viewBox="0 0 90 135">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f2f2f2"/>
        <stop offset="1" stop-color="#dcdcdc"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="88" height="133" rx="10" fill="url(#g)" stroke="#bdbdbd"/>
    <text x="45" y="68" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="10" font-weight="700" fill="#5f5f5f">
      ${safe.slice(0, 16)}
    </text>
    <text x="45" y="82" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="9" fill="#777">
      Poster
    </text>
  </svg>
  `.trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function McuTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 })
  const onResize = useDebounceCallback((s: ComponentSize) => setSize(s), 50)
  useResizeObserver({ ref: containerRef as React.RefObject<HTMLDivElement>, onResize })

  
   //Using placeholders for now (no real posters).
   
  const movies: Movie[] = useMemo(() => {
    // Intentionally placeholder items (you can swap in real MCU movies later).
    // Years span 2008 → present, with multiple releases per year.
    const rows: Array<Omit<Movie, 'posterUrl'>> = [
      // Phase 1 (placeholder)
      { id: 'p1-1', title: 'Movie A', year: 2008, phase: 1 },
      { id: 'p1-2', title: 'Movie B', year: 2010, phase: 1 },
      { id: 'p1-3', title: 'Movie C', year: 2011, phase: 1 },
      { id: 'p1-4', title: 'Movie D', year: 2011, phase: 1 },
      { id: 'p1-5', title: 'Movie E', year: 2012, phase: 1 },
      { id: 'p1-6', title: 'Movie F', year: 2012, phase: 1 },

      // Phase 2 (placeholder)
      { id: 'p2-1', title: 'Movie G', year: 2013, phase: 2 },
      { id: 'p2-2', title: 'Movie H', year: 2014, phase: 2 },
      { id: 'p2-3', title: 'Movie I', year: 2014, phase: 2 },
      { id: 'p2-4', title: 'Movie J', year: 2015, phase: 2 },
      { id: 'p2-5', title: 'Movie K', year: 2015, phase: 2 },
      { id: 'p2-6', title: 'Movie L', year: 2015, phase: 2 },

      // Phase 3 (placeholder)
      { id: 'p3-1', title: 'Movie M', year: 2016, phase: 3 },
      { id: 'p3-2', title: 'Movie N', year: 2017, phase: 3 },
      { id: 'p3-3', title: 'Movie O', year: 2017, phase: 3 },
      { id: 'p3-4', title: 'Movie P', year: 2018, phase: 3 },
      { id: 'p3-5', title: 'Movie Q', year: 2018, phase: 3 },
      { id: 'p3-6', title: 'Movie R', year: 2019, phase: 3 },
      { id: 'p3-7', title: 'Movie S', year: 2019, phase: 3 },
      { id: 'p3-8', title: 'Movie T', year: 2019, phase: 3 },

      // Phase 4 (placeholder)
      { id: 'p4-1', title: 'Movie U', year: 2021, phase: 4 },
      { id: 'p4-2', title: 'Movie V', year: 2021, phase: 4 },
      { id: 'p4-3', title: 'Movie W', year: 2022, phase: 4 },
      { id: 'p4-4', title: 'Movie X', year: 2022, phase: 4 },
      { id: 'p4-5', title: 'Movie Y', year: 2022, phase: 4 },

      // Phase 5 (placeholder)
      { id: 'p5-1', title: 'Movie Z', year: 2023, phase: 5 },
      { id: 'p5-2', title: 'Movie AA', year: 2023, phase: 5 },
      { id: 'p5-3', title: 'Movie AB', year: 2024, phase: 5 },
      { id: 'p5-4', title: 'Movie AC', year: 2024, phase: 5 },
      { id: 'p5-5', title: 'Movie AD', year: 2025, phase: 5 }
    ]

    return rows
      .map(r => ({ ...r, posterUrl: makePosterPlaceholderDataUri(r.title) }))
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.title.localeCompare(b.title)))
  }, [])

  useEffect(() => {
    if (!svgRef.current) return
    if (size.width <= 0 || size.height <= 0) return
    if (!containerRef.current) return

    const root = d3.select(containerRef.current)
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Tooltip (HTML overlay) 
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
      .style('max-width', '230px')

    const margin: Margin = { top: 30, right: 40, bottom: 30, left: 40 }
    const width = size.width
    const height = size.height

    // Middle line Y
    const yMid = Math.round(height / 2)

    // Make the timeline visually centered and wide.
    const innerW = Math.max(0, width - margin.left - margin.right)
    const x0 = margin.left
    const x1 = margin.left + innerW

    const minYear = d3.min(movies, d => d.year) ?? 2008
    const maxYear = d3.max(movies, d => d.year) ?? 2025

    // Linear scale for time (years)
    const x = d3.scaleLinear().domain([minYear, maxYear]).range([x0, x1])

    // Group movies by year so we can slightly offset dots within the same year.
    const moviesByYear = d3.group(movies, d => d.year)
    const dotSpacing = 12

    const phaseColors: Record<Phase, string> = {
      1: '#1f77b4',
      2: '#ff7f0e',
      3: '#2ca02c',
      4: '#d62728',
      5: '#9467bd'
    }

    //  Styles 
    const lineColor = 'rgba(0,0,0,0.35)'
    const textColor = 'rgba(0,0,0,0.75)'

    // Title 
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', margin.top - 6)
      .style('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 800)
      .text('Marvel Cinematic Universe Timeline (2008–Present)')

    // Phase bands (subtle background bars)
    const phaseRanges: Array<{ phase: Phase; start: number; end: number }> = [
      { phase: 1, start: 2008, end: 2012 },
      { phase: 2, start: 2013, end: 2015 },
      { phase: 3, start: 2016, end: 2019 },
      { phase: 4, start: 2021, end: 2022 },
      { phase: 5, start: 2023, end: maxYear }
    ]

    svg
      .append('g')
      .selectAll('rect.phase-band')
      .data(phaseRanges)
      .join('rect')
      .attr('class', 'phase-band')
      .attr('x', d => x(d.start))
      .attr('y', yMid - 26)
      .attr('width', d => Math.max(0, x(d.end) - x(d.start)))
      .attr('height', 52)
      .attr('fill', d => phaseColors[d.phase])
      .attr('opacity', 0.08)
      .attr('rx', 14)

    // Main timeline line (thicker)
    svg
      .append('line')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', yMid)
      .attr('y2', yMid)
      .attr('stroke', lineColor)
      .attr('stroke-width', 6)
      .attr('stroke-linecap', 'round')

    // A slightly accent line underneath like infographic style
    svg
      .append('line')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', yMid)
      .attr('y2', yMid)
      .attr('stroke', 'rgba(0,0,0,0.08)')
      .attr('stroke-width', 12)
      .attr('stroke-linecap', 'round')

    // Nodes group
    const g = svg.append('g')

    const nodes = g
      .selectAll('circle.movie-dot')
      .data(movies)
      .join('circle')
      .attr('class', 'movie-dot')
      .attr('cx', d => {
        const list = moviesByYear.get(d.year) ?? [d]
        const idx = list.findIndex(m => m.id === d.id)
        const offset = (idx - (list.length - 1) / 2) * dotSpacing
        return x(d.year) + offset
      })
      .attr('cy', yMid)
      .attr('r', 6)
      .attr('fill', d => phaseColors[d.phase])
      .attr('stroke', 'rgba(0,0,0,0.28)')
      .attr('stroke-width', 1)
      .style('cursor', 'default')

    // Hover tooltip with poster + name
    const containerBox = containerRef.current.getBoundingClientRect()

    const showTooltip = (event: MouseEvent, d: Movie) => {
      tooltip
        .style('display', 'block')
        .html(
          `
          <div style="display:flex; gap:10px; align-items:center;">
            <img src="${d.posterUrl}" alt="${d.title}" style="width:54px;height:81px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);object-fit:cover;" />
            <div style="min-width:0;">
              <div style="font-weight:800; font-size:13px; color: rgba(0,0,0,0.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px;">${d.title}</div>
              <div style="font-size:12px; color: rgba(0,0,0,0.6); margin-top:2px;">${d.year} • Phase ${d.phase}</div>
            </div>
          </div>
          `.trim()
        )

      // Position near cursor ,convert viewport coords to container-local coords
      const px = event.clientX - containerBox.left
      const py = event.clientY - containerBox.top
      tooltip.style('left', `${Math.min(px + 14, containerBox.width - 250)}px`).style('top', `${Math.max(py - 10, 8)}px`)
    }

    nodes
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

    
    // Axis ticks (every 2 years)
    const tickYears = d3.range(minYear, maxYear + 1, 2)

    svg
      .append('g')
      .selectAll('text.tick')
      .data(tickYears)
      .join('text')
      .attr('class', 'tick')
      .attr('x', d => x(d))
      .attr('y', yMid + 46)
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'rgba(0,0,0,0.45)')
      .text(d => d)

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${margin.left}, ${height - margin.bottom + 6})`)
    const legendItems: Array<{ phase: Phase; label: string }> = [
      { phase: 1, label: 'Phase 1' },
      { phase: 2, label: 'Phase 2' },
      { phase: 3, label: 'Phase 3' },
      { phase: 4, label: 'Phase 4' },
      { phase: 5, label: 'Phase 5' }
    ]

    const item = legend
      .selectAll('g.item')
      .data(legendItems)
      .join('g')
      .attr('class', 'item')
      .attr('transform', (_d, i) => `translate(${i * 110}, 0)`)

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
      .style('fill', textColor)
      .text(d => d.label)
  }, [movies, size])

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