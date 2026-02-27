import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts'
import { ComponentSize, Margin } from '../types'

type MovieRow = {
  id: string
  title: string
  phase: string
  release_date: string
}

type ShowRow = {
  title: string
  phase: string
  release_date: string
  imdb_id: string
  imdb_average_rating: string
  imdb_vote_count: string
}

type YearBin = {
  year: number
  movies: number
  shows: number
  total: number
}

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime())
}

function parseYear(dateStr: string): number | null {
  const d = new Date(String(dateStr ?? '').trim())
  if (!isValidDate(d)) return null
  return d.getFullYear()
}

export default function McuYearDotPlot() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 })
  const onResize = useDebounceCallback((s: ComponentSize) => setSize(s), 50)
  useResizeObserver({ ref: containerRef as React.RefObject<HTMLDivElement>, onResize })

  const [bins, setBins] = useState<YearBin[]>([])
  const [yearDomain, setYearDomain] = useState<{ minYear: number; maxYear: number } | null>(null)

  // =========================
  // Load CSVs + build year bins
  // =========================
  useEffect(() => {
    let cancelled = false

    async function load() {
      const [movieRows, showRows] = await Promise.all([
        d3.csv('/data/marvel_movies_tmdb.csv') as unknown as Promise<MovieRow[]>,
        d3.csv('/data/marvel_shows_data.csv') as unknown as Promise<ShowRow[]>
      ])

      const movieYears = movieRows
        .filter(r => r.title !== 'The Incredible Hulk')
        .map(r => parseYear(r.release_date))
        .filter((y): y is number => y !== null)

      const showYears = showRows
        .map(r => parseYear(r.release_date))
        .filter((y): y is number => y !== null)

      if (movieYears.length === 0 && showYears.length === 0) {
        if (!cancelled) {
          setBins([])
          setYearDomain(null)
        }
        return
      }

      const minYear = Math.min(
        ...(movieYears.length ? movieYears : [9999]),
        ...(showYears.length ? showYears : [9999])
      )
      const maxYear = Math.max(
        ...(movieYears.length ? movieYears : [0]),
        ...(showYears.length ? showYears : [0])
      )

      const movieCount = d3.rollup(movieYears, v => v.length, y => y)
      const showCount = d3.rollup(showYears, v => v.length, y => y)

      const out: YearBin[] = []
      for (let y = minYear; y <= maxYear; y++) {
        const m = movieCount.get(y) ?? 0
        const s = showCount.get(y) ?? 0
        out.push({ year: y, movies: m, shows: s, total: m + s })
      }

      if (!cancelled) {
        setBins(out)
        setYearDomain({ minYear, maxYear })
      }
    }

    load().catch(err => {
      console.error('Failed to load dot-plot CSVs:', err)
      if (!cancelled) {
        setBins([])
        setYearDomain(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  // =========================
  // Draw
  // =========================
  useEffect(() => {
    if (!svgRef.current) return
    if (!containerRef.current) return
    if (size.width <= 0 || size.height <= 0) return
    if (bins.length === 0) return
    if (!yearDomain) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin: Margin = { top: 24, right: 24, bottom: 34, left: 24 }
    const width = size.width
    const height = size.height

    const x0 = margin.left
    const x1 = width - margin.right

    // Put the baseline low-ish but leave space for labels
    const yLine = height - margin.bottom - 10
    const yYearLabel = yLine + 22

    const yearToDate = (y: number) => new Date(y, 0, 1)

    // X scale spanning full width
    const xTime = d3
      .scaleTime()
      .domain([yearToDate(yearDomain.minYear), yearToDate(yearDomain.maxYear)])
      .range([x0, x1])

    // --- stacking layout
    const maxTotal = d3.max(bins, d => d.total) ?? 1
    const maxUsableStackPx = Math.max(80, height * 0.62)
    const dotStep = Math.max(7, Math.min(14, (maxUsableStackPx - 18) / Math.max(1, maxTotal)))
    const dotR = Math.max(2.6, Math.min(6, dotStep * 0.42))
    const typeGap = Math.max(2, dotStep * 0.35)

    // --- baseline line
    svg
      .append('line')
      .attr('x1', x0)
      .attr('x2', x1)
      .attr('y1', yLine)
      .attr('y2', yLine)
      .attr('stroke', 'rgba(0,0,0,0.35)')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')

    // --- year ticks/labels (auto-downsample so it doesn’t crowd)
    const years = bins.map(d => d.year)
    const minYear = d3.min(years) ?? yearDomain.minYear
    const maxYear = d3.max(years) ?? yearDomain.maxYear

    const approxLabelCount = Math.floor((x1 - x0) / 60)
    const yearStep = Math.max(1, Math.ceil((maxYear - minYear + 1) / Math.max(1, approxLabelCount)))

    const tickYears: number[] = d3.range(minYear, maxYear + 1)
    for (let y = minYear; y <= maxYear; y += yearStep) tickYears.push(y)
    if (tickYears[tickYears.length - 1] !== maxYear) tickYears.push(maxYear)

    // tick marks
    svg
      .append('g')
      .selectAll('line.year-mark')
      .data(tickYears)
      .join('line')
      .attr('class', 'year-mark')
      .attr('x1', d => xTime(yearToDate(d)))
      .attr('x2', d => xTime(yearToDate(d)))
      .attr('y1', yLine + 3)
      .attr('y2', yLine + 12)
      .attr('stroke', 'rgba(0,0,0,0.25)')
      .attr('stroke-width', 1)

    // labels
    svg
      .append('g')
      .selectAll('text.year-tick')
      .data(tickYears)
      .join('text')
      .attr('class', 'year-tick')
      .attr('x', d => xTime(yearToDate(d)))
      .attr('y', yYearLabel)
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 700)
      .style('fill', 'rgba(0,0,0,0.7)')
      .text(d => String(d))

    // --- legend (optional but small + useful)
    const MOVIE_FILL = 'rgba(255, 204, 0, 0.95)'
    const SHOW_FILL = 'rgba(0, 0, 0, 0.65)'

    const legend = svg.append('g').attr('transform', `translate(${x0}, ${margin.top})`)
    const legendItems = [
      { label: 'Movies', fill: MOVIE_FILL, stroke: 'rgba(0,0,0,0.45)' },
      { label: 'TV Shows', fill: SHOW_FILL, stroke: 'rgba(0,0,0,0.35)' }
    ]

    const li = legend
      .selectAll('g.li')
      .data(legendItems)
      .join('g')
      .attr('class', 'li')
      .attr('transform', (_d, i) => `translate(${i * 110}, 0)`)

    li.append('circle')
      .attr('r', 4.5)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('fill', d => d.fill)
      .attr('stroke', d => d.stroke)
      .attr('stroke-width', 1)

    li.append('text')
      .attr('x', 10)
      .attr('y', 4)
      .style('font-size', '12px')
      .style('fill', 'rgba(0,0,0,0.75)')
      .text(d => d.label)

    // --- dots stacked above the line
    const gDots = svg.append('g').attr('class', 'year-stacks')

    for (const b of bins) {
      const cx = xTime(yearToDate(b.year))

      // movies closest to baseline
      gDots
        .selectAll(`circle.movie-${b.year}`)
        .data(d3.range(b.movies))
        .join('circle')
        .attr('cx', cx)
        .attr('cy', i => yLine - (i + 1) * dotStep)
        .attr('r', dotR)
        .attr('fill', MOVIE_FILL)
        .attr('stroke', 'rgba(0,0,0,0.55)')
        .attr('stroke-width', 1)

      // shows above movies, with a small gap between groups
      const showOffset = b.movies > 0 ? b.movies * dotStep + typeGap : 0
      gDots
        .selectAll(`circle.show-${b.year}`)
        .data(d3.range(b.shows))
        .join('circle')
        .attr('cx', cx)
        .attr('cy', i => yLine - showOffset - (i + 1) * dotStep)
        .attr('r', dotR)
        .attr('fill', SHOW_FILL)
        .attr('stroke', 'rgba(0,0,0,0.35)')
        .attr('stroke-width', 1)
    }
  }, [bins, yearDomain, size])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}
    >
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  )
}