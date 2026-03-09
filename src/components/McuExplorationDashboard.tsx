import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'

type Anchor = 'top' | 'bottom'
type Phase = 1 | 2 | 3 | 4 | 5 | 6
type MediaType = 'movie' | 'show'

type ImportantMeta = { anchor: Anchor; note: string }

type MovieRow = {
  id: string
  title: string
  phase: string
  release_date: string
  revenue: string
  budget: string
  poster_path: string
  imdb_id: string
  imdb_average_rating: string
  overview: string
}

type ShowRow = {
  title: string
  phase: string
  release_date: string
  imdb_id: string
  imdb_average_rating: string
  poster_path: string
}

type ReviewRow = {
  title: string
  imdb_id: string
  author: string
  date: string
  review_rating: string
  review_title: string
  review: string
  likes: string
  dislikes: string
}

type Entry = {
  id: string
  title: string
  phase: Phase
  mediaType: MediaType
  releaseDate: Date
  year: number
  imdbId: string
  rating: number | null
  revenue: number | null
  budget: number | null
  profit: number | null
  posterUrl: string | null
  overview: string
  important: boolean
  anchor?: Anchor
  note?: string
}

type Review = {
  author: string
  date: string
  rating: number | null
  title: string
  body: string
  likes: number
  dislikes: number
}

function reviewKey(review: Review) {
  return [review.author, review.date, review.title, review.body].join('||')
}

function reviewEngagement(review: Review) {
  return review.likes + review.dislikes
}

function normalizeTitle(raw: string) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function baseShowTitle(raw: string) {
  return String(raw ?? '').split('|')[0].trim()
}

type YearMetric = {
  year: number
  value: number | null
}

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

const IMPORTANT: Record<string, ImportantMeta> = {
  'Iron Man': { anchor: 'bottom', note: 'Kickstarts the MCU and defines its tone' },
  'Iron Man 2': { anchor: 'bottom', note: 'Sequel to Iron Man' },
  'Captain America: The First Avenger': { anchor: 'bottom', note: 'Introduces the Captain America' },
  'Avengers: Age of Ultron': { anchor: 'bottom', note: 'Second Avenger movie in the MCU' },
  'Spider-Man: Homecoming': { anchor: 'bottom', note: 'Introduces the Spider-Man' },
  'Thor: Love and Thunder': { anchor: 'bottom', note: 'Worst IMDB rating Thor movie' },
  'Deadpool & Wolverine': { anchor: 'bottom', note: 'Deadpool returns in the MCU + Good audience reception' },
  'The Avengers': { anchor: 'top', note: 'First major crossover event + Huge box office success' },
  'Iron Man 3': { anchor: 'bottom', note: 'Phase 2 starts' },
  'Captain America: The Winter Soldier': { anchor: 'top', note: 'Political thriller tone + Elevated storytelling' },
  'Captain America: Civil War': { anchor: 'bottom', note: 'Phase 3 starts + Setting up the next Avengers movie' },
  'Black Panther': { anchor: 'top', note: 'First superhero movie nominated for Best Picture' },
  'Avengers: Endgame': { anchor: 'bottom', note: 'Infinity Saga finale + Peak MCU + Huge cultural moment + Highest box office/IMDB rating' },
  'Black Widow': { anchor: 'top', note: 'Phase 4 starts + Weak rating/box office + Soft restart after Endgame' },
  'Spider-Man: No Way Home': { anchor: 'bottom', note: 'Global success + Last Endgame-level cultural moment' },
  'Ant-Man and the Wasp: Quantumania': { anchor: 'bottom', note: 'Phase 5 starts + Turning point in audience fatigue' },
  'The Marvels': { anchor: 'bottom', note: 'Worst profit/rating MCU movie in history' },
  'The Fantastic 4: First Steps': { anchor: 'top', note: 'Phase 6 starts + Slight underperformance in rating/box office' }
}

const YEAR_HIGHLIGHT_TITLE: Partial<Record<number, string>> = {
  2021: 'Spider-Man: No Way Home',
  2023: 'The Marvels'
}

const YEAR_TIMELINE_MESSAGE: Partial<Record<number, string>> = {
  2009: 'No MCU movie or show was released in 2009.',
  2020: 'No MCU movie or show was released in 2020.'
}

function parsePhase(raw: string): Phase | null {
  const n = Number(String(raw).trim())
  if (n >= 1 && n <= 6) return n as Phase
  return null
}

function parseDate(raw: string) {
  const d = new Date(String(raw ?? '').trim())
  return Number.isNaN(d.getTime()) ? null : d
}

function parseNumber(raw: string) {
  const cleaned = String(raw ?? '').replace(/,/g, '').trim()
  if (!cleaned) return null
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([kK])?$/)
  if (!match) return null
  const base = Number(match[1])
  if (!Number.isFinite(base)) return null
  const multiplier = match[2] ? 1_000 : 1
  const n = base * multiplier
  return Number.isFinite(n) ? n : null
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatRevenue(value: number | null) {
  if (value == null) return 'N/A'
  return `$${(value / 1_000_000_000).toFixed(2)}B`
}

function formatRating(value: number | null) {
  if (value == null) return 'N/A'
  return value.toFixed(1)
}

function chartPath(
  data: YearMetric[],
  width: number,
  height: number,
  maxValue: number
) {
  const padding = { top: 18, right: 16, bottom: 28, left: 36 }
  const valid = data.filter((d): d is { year: number; value: number } => d.value !== null)
  if (valid.length === 0) return ''

  const x = d3
    .scaleLinear()
    .domain([data[0].year, data[data.length - 1].year])
    .range([padding.left, width - padding.right])

  const y = d3
    .scaleLinear()
    .domain([0, maxValue || 1])
    .range([height - padding.bottom, padding.top])

  return d3.line<{ year: number; value: number }>()
    .x(d => x(d.year))
    .y(d => y(d.value))(valid) ?? ''
}

function pointPosition(
  year: number,
  value: number,
  years: [number, number],
  minValue: number,
  maxValue: number,
  width: number,
  height: number
) {
  const padding = { top: 18, right: 16, bottom: 28, left: 36 }
  const x = d3.scaleLinear().domain(years).range([padding.left, width - padding.right])
  const y = d3
    .scaleLinear()
    .domain([minValue, maxValue || 1])
    .range([height - padding.bottom, padding.top])
  return { x: x(year), y: y(value) }
}

function MetricChart({
  title,
  data,
  selectedYear,
  formatter,
  stroke,
  yDomainMode = 'zero-based'
}: {
  title: string
  data: YearMetric[]
  selectedYear: number
  formatter: (value: number | null) => string
  stroke: string
  yDomainMode?: 'zero-based' | 'tight'
}) {
  const width = 360
  const height = 145
  const finiteValues = data.map(d => d.value).filter((v): v is number => v !== null)
  const minDataValue = finiteValues.length > 0 ? d3.min(finiteValues) ?? 0 : 0
  const maxDataValue = finiteValues.length > 0 ? d3.max(finiteValues) ?? 1 : 1
  let minValue = 0
  let domainMax = 1
  if (yDomainMode === 'tight') {
    const span = Math.max(0.2, maxDataValue - minDataValue)
    const pad = Math.max(0.12, span * 0.25)
    minValue = clamp(minDataValue - pad, 0, 10)
    domainMax = clamp(maxDataValue + pad, 0, 10)
    if (domainMax <= minValue) domainMax = Math.min(10, minValue + 1)
  } else {
    minValue = Math.min(0, minDataValue)
    domainMax = Math.max(maxDataValue, minValue + 1)
  }
  const selectedPoint = data.find(d => d.year === selectedYear && d.value !== null)
  const years: [number, number] = [data[0]?.year ?? selectedYear, data[data.length - 1]?.year ?? selectedYear]
  const activePoints = data.filter((d): d is { year: number; value: number } => d.value !== null && d.year <= selectedYear)
  const selectedPosition =
    selectedPoint && selectedPoint.value !== null
      ? pointPosition(selectedPoint.year, selectedPoint.value, years, minValue, domainMax, width, height)
      : null

  return (
    <div
      style={{
        border: '1px solid #e6e6e6',
        borderRadius: 16,
        background: '#fff',
        padding: 12,
        boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
          {selectedYear}: {formatter(selectedPoint?.value ?? null)}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="145">
        <line x1="36" x2="344" y1="162" y2="162" stroke="rgba(0,0,0,0.18)" />
        <line x1="36" x2="36" y1="18" y2="162" stroke="rgba(0,0,0,0.18)" />
        {activePoints.slice(1).map((point, index) => {
          const prev = activePoints[index]
          const p1 = pointPosition(prev.year, prev.value, years, minValue, domainMax, width, height)
          const p2 = pointPosition(point.year, point.value, years, minValue, domainMax, width, height)
          return (
            <line
              key={`${prev.year}-${point.year}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={stroke}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )
        })}
        {data
          .filter((d): d is { year: number; value: number } => d.value !== null)
          .map(point => {
            const pos = pointPosition(point.year, point.value, years, minValue, domainMax, width, height)
            const active = point.year <= selectedYear
            return (
              <circle
                key={point.year}
                cx={pos.x}
                cy={pos.y}
                r={point.year === selectedYear ? 5.5 : 4}
                fill={active ? stroke : 'rgba(0,0,0,0.14)'}
                stroke="#fff"
                strokeWidth="1.5"
              />
            )
          })}
        {selectedPosition ? (
          <>
            <line
              x1={selectedPosition.x}
              x2={selectedPosition.x}
              y1="18"
              y2="162"
              stroke={stroke}
              strokeDasharray="4,4"
              opacity="0.45"
            />
            <text x={selectedPosition.x} y="178" textAnchor="middle" fontSize="11" fill="rgba(0,0,0,0.72)">
              {selectedYear}
            </text>
          </>
        ) : (
          <text x="190" y="178" textAnchor="middle" fontSize="11" fill="rgba(0,0,0,0.5)">
            No movie release data for {selectedYear}
          </text>
        )}
      </svg>
    </div>
  )
}

export default function McuExplorationDashboard() {
  const TIMELINE_SIDE_PADDING = 28
  const TIMELINE_THUMB_SIZE = 16
  const TIMELINE_BASE_TOP_PERCENT = 80
  const TIMELINE_STACK_STEP = 13
  const TIMELINE_TYPE_GAP_UNITS = 0.3
  const TIMELINE_INFO_TOP_OFFSET = 220
  const [entries, setEntries] = useState<Entry[]>([])
  const [reviewsByImdbId, setReviewsByImdbId] = useState<Map<string, Review[]>>(new Map())
  const [reviewsByTitle, setReviewsByTitle] = useState<Map<string, Review[]>>(new Map())
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [expandedReviewKey, setExpandedReviewKey] = useState<string | null>(null)
  const [timelineHover, setTimelineHover] = useState<{ title: string; left: number; top: number } | null>(null)
  const [hoveredTimelineMarkerId, setHoveredTimelineMarkerId] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const timelineTooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [movieRows, showRows, movieReviewRows, showReviewRows] = await Promise.all([
        d3.csv('/data/marvel_movies_tmdb.csv') as unknown as Promise<MovieRow[]>,
        d3.csv('/data/marvel_shows_data.csv') as unknown as Promise<ShowRow[]>,
        d3.csv('/data/marvel_movies_imdb_reviews.csv') as unknown as Promise<ReviewRow[]>,
        (d3.csv('/data/marvel_shows_imdb_reviews.csv').catch(() => []) as unknown as Promise<ReviewRow[]>)
      ])

      const movies = movieRows
        .map((row): Entry | null => {
          const phase = parsePhase(row.phase)
          const releaseDate = parseDate(row.release_date)
          if (!phase || !releaseDate) return null

          const title = String(row.title ?? '').trim()
          if (!title || title === 'The Incredible Hulk') return null

          const meta = IMPORTANT[title]
          const posterPath = String(row.poster_path ?? '').trim()
          const revenue = parseNumber(row.revenue)
          const budget = parseNumber(row.budget)
          return {
            id: `movie-${row.id}`,
            title,
            phase,
            mediaType: 'movie',
            releaseDate,
            year: releaseDate.getFullYear(),
            imdbId: String(row.imdb_id ?? '').trim(),
            rating: parseNumber(row.imdb_average_rating),
            revenue,
            budget,
            profit: revenue !== null && budget !== null ? revenue - budget : null,
            posterUrl: posterPath ? `${TMDB_POSTER_BASE}${posterPath}` : null,
            overview: String(row.overview ?? '').trim(),
            important: !!meta,
            anchor: meta?.anchor,
            note: meta?.note
          }
        })
        .filter((entry): entry is Entry => entry !== null)

      const shows = showRows
        .map((row, index): Entry | null => {
          const phase = parsePhase(row.phase)
          const releaseDate = parseDate(row.release_date)
          if (!phase || !releaseDate) return null

          const title = String(row.title ?? '').trim()
          if (!title) return null

          const posterPath = String(row.poster_path ?? '').trim()
          return {
            id: `show-${row.id || index}`,
            title,
            phase,
            mediaType: 'show',
            releaseDate,
            year: releaseDate.getFullYear(),
            imdbId: String(row.imdb_id ?? '').trim(),
            rating: parseNumber(row.imdb_average_rating),
            revenue: null,
            budget: null,
            profit: null,
            posterUrl: posterPath ? `${TMDB_POSTER_BASE}${posterPath}` : null,
            overview: String(row.overview ?? '').trim(),
            important: false
          }
        })
        .filter((entry): entry is Entry => entry !== null)

      const allEntries = [...movies, ...shows].sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime())
      const allReviewRows = [...movieReviewRows, ...showReviewRows]
      const dedupe = new Set<string>()
      const parsedReviews = allReviewRows
        .map(row => {
          const review: Review = {
            author: String(row.author ?? 'Anonymous').trim() || 'Anonymous',
            date: String(row.date ?? '').trim(),
            rating: parseNumber(row.review_rating),
            title: String(row.review_title ?? '').trim(),
            body: String(row.review ?? '').trim(),
            likes: parseNumber(row.likes) ?? 0,
            dislikes: parseNumber(row.dislikes) ?? 0
          }
          const imdbId = String(row.imdb_id ?? '').trim()
          const titleKey = normalizeTitle(baseShowTitle(String(row.title ?? '')))
          const fingerprint = [
            imdbId,
            titleKey,
            review.author,
            review.date,
            review.title,
            review.body
          ].join('||')

          if (dedupe.has(fingerprint)) return null
          dedupe.add(fingerprint)

          return { imdbId, titleKey, review }
        })
        .filter((entry): entry is { imdbId: string; titleKey: string; review: Review } => entry !== null)

      const normalizedReviewsByImdbId = new Map<string, Review[]>()
      d3.group(
        parsedReviews.filter(entry => !!entry.imdbId),
        entry => entry.imdbId
      ).forEach((items, imdbId) => {
        normalizedReviewsByImdbId.set(
          imdbId,
          items
            .map(item => item.review)
            .sort((a, b) => reviewEngagement(b) - reviewEngagement(a))
        )
      })

      const normalizedReviewsByTitle = new Map<string, Review[]>()
      d3.group(
        parsedReviews.filter(entry => !!entry.titleKey),
        entry => entry.titleKey
      ).forEach((items, titleKey) => {
        normalizedReviewsByTitle.set(
          titleKey,
          items
            .map(item => item.review)
            .sort((a, b) => reviewEngagement(b) - reviewEngagement(a))
        )
      })

      if (!cancelled) {
        setEntries(allEntries)
        setReviewsByImdbId(normalizedReviewsByImdbId)
        setReviewsByTitle(normalizedReviewsByTitle)
        if (allEntries.length > 0) {
          setSelectedYear(allEntries[0].year)
          setSelectedEntryId(allEntries[0].id)
        }
      }
    }

    load().catch(err => {
      console.error('Failed to load exploration dashboard data:', err)
      if (!cancelled) {
        setEntries([])
        setReviewsByImdbId(new Map())
        setReviewsByTitle(new Map())
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const minYear = entries[0]?.year ?? 2008
  const maxYear = entries[entries.length - 1]?.year ?? 2025
  const currentYear = selectedYear ?? minYear

  const yearEntries = useMemo(
    () => entries.filter(entry => entry.year === currentYear),
    [entries, currentYear]
  )

  useEffect(() => {
    if (yearEntries.length === 0) {
      setSelectedEntryId(null)
      return
    }
    if (!yearEntries.some(entry => entry.id === selectedEntryId)) {
      setSelectedEntryId(yearEntries[0].id)
    }
  }, [yearEntries, selectedEntryId])

  useEffect(() => {
    setExpandedReviewKey(null)
  }, [selectedEntryId, currentYear])

  const selectedEntry = yearEntries.find(entry => entry.id === selectedEntryId) ?? yearEntries[0] ?? null
  const selectedReviews = useMemo(() => {
    if (!selectedEntry) return []

    const baseTitle = selectedEntry.mediaType === 'show' ? baseShowTitle(selectedEntry.title) : selectedEntry.title
    const titleKey = normalizeTitle(baseTitle)
    const imdbReviews = selectedEntry.imdbId ? reviewsByImdbId.get(selectedEntry.imdbId) ?? [] : []
    const titleReviews = reviewsByTitle.get(titleKey) ?? []

    const merged = [...imdbReviews, ...titleReviews]
    const dedupe = new Set<string>()
    return merged
      .filter(review => {
        const fingerprint = reviewKey(review)
        if (dedupe.has(fingerprint)) return false
        dedupe.add(fingerprint)
        return true
      })
      .sort((a, b) => reviewEngagement(b) - reviewEngagement(a))
      .slice(0, 4)
  }, [selectedEntry, reviewsByImdbId, reviewsByTitle])

  const moviesOnly = useMemo(
    () => entries.filter(entry => entry.mediaType === 'movie'),
    [entries]
  )

  const ratingData = useMemo(() => {
    const out: YearMetric[] = []
    for (let year = minYear; year <= maxYear; year++) {
      const yearMovies = moviesOnly.filter(movie => movie.year === year && movie.rating !== null)
      out.push({
        year,
        value: yearMovies.length > 0 ? d3.mean(yearMovies, movie => movie.rating ?? 0) ?? null : null
      })
    }
    return out
  }, [moviesOnly, minYear, maxYear])

  const profitData = useMemo(() => {
    const out: YearMetric[] = []
    for (let year = minYear; year <= maxYear; year++) {
      const yearMovies = moviesOnly.filter(movie => movie.year === year && movie.profit !== null)
      out.push({
        year,
        value: yearMovies.length > 0 ? d3.mean(yearMovies, movie => movie.profit ?? 0) ?? null : null
      })
    }
    return out
  }, [moviesOnly, minYear, maxYear])

  const yearSpan = Math.max(1, maxYear - minYear)
  const phaseColors: Record<Phase, string> = {
    1: '#1f77b4',
    2: '#ff7f0e',
    3: '#2ca02c',
    4: '#d62728',
    5: '#9467bd',
    6: '#8c564b'
  }

  const phaseRanges = useMemo(() => {
    const phases = ([1, 2, 3, 4, 5, 6] as Phase[])
      .map(phase => {
        const phaseEntries = entries.filter(entry => entry.phase === phase)
        if (phaseEntries.length === 0) return null
        return {
          phase,
          startDate: phaseEntries[0].releaseDate,
          endDate: phaseEntries[phaseEntries.length - 1].releaseDate
        }
      })
      .filter((item): item is { phase: Phase; startDate: Date; endDate: Date } => item !== null)

    if (phases.length === 0) return []

    const boundaries: Date[] = [phases[0].startDate]
    for (let i = 0; i < phases.length - 1; i++) {
      const current = phases[i]
      const next = phases[i + 1]
      boundaries.push(new Date((current.endDate.getTime() + next.startDate.getTime()) / 2))
    }
    boundaries.push(phases[phases.length - 1].endDate)

    return phases.map((phase, index) => ({
      phase: phase.phase,
      startDate: boundaries[index],
      endDate: boundaries[index + 1]
    }))
  }, [entries])

  const timelineLeftForYear = (year: number) => `${((year - minYear) / yearSpan) * 100}%`
  const minTime = entries[0]?.releaseDate.getTime() ?? 0
  const maxTime = entries[entries.length - 1]?.releaseDate.getTime() ?? 1
  const timeSpan = Math.max(1, maxTime - minTime)
  const timelineOffset = (ratio: number) =>
    `calc(${(ratio * 100).toFixed(6)}% + ${(TIMELINE_SIDE_PADDING - 2 * TIMELINE_SIDE_PADDING * ratio).toFixed(3)}px)`
  const timelineWidth = (ratio: number) =>
    `calc(${(ratio * 100).toFixed(6)}% - ${(2 * TIMELINE_SIDE_PADDING * ratio).toFixed(3)}px)`

  const selectedTimelineHighlight = useMemo(() => {
    const preferredTitle = YEAR_HIGHLIGHT_TITLE[currentYear]
    if (preferredTitle) {
      const preferred = entries.find(entry => entry.year === currentYear && entry.title === preferredTitle)
      if (preferred) return preferred
    }
    return entries.find(entry => entry.year === currentYear && entry.important && entry.mediaType === 'movie') ?? null
  }, [currentYear, entries])

  const selectedTimelineMessage = YEAR_TIMELINE_MESSAGE[currentYear] ?? null
  const fantasticFourEntry = useMemo(
    () => entries.find(entry => entry.title === 'The Fantastic 4: First Steps') ?? null,
    [entries]
  )
  const timelineMarkers = useMemo(() => {
    const byYear = d3.group(entries, entry => entry.year)
    const out: Array<{ id: string; title: string; mediaType: MediaType; ratio: number; stackUnit: number }> = []

    for (let year = minYear; year <= maxYear; year++) {
      const list = (byYear.get(year) ?? []).slice().sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime())
      const movies = list.filter(entry => entry.mediaType === 'movie')
      const shows = list.filter(entry => entry.mediaType === 'show')

      movies.forEach((entry, index) => {
        out.push({
          id: entry.id,
          title: entry.title,
          mediaType: entry.mediaType,
          ratio: (year - minYear) / yearSpan,
          stackUnit: index + 1
        })
      })

      shows.forEach((entry, index) => {
        out.push({
          id: entry.id,
          title: entry.title,
          mediaType: entry.mediaType,
          ratio: (year - minYear) / yearSpan,
          stackUnit: movies.length + TIMELINE_TYPE_GAP_UNITS + (index + 1)
        })
      })
    }

    return out
  }, [entries, maxYear, minYear, yearSpan, TIMELINE_TYPE_GAP_UNITS])
  const updateTimelineHover = (event: React.MouseEvent, title: string) => {
    const box = timelineRef.current?.getBoundingClientRect()
    if (!box) return

    const px = event.clientX - box.left
    const py = event.clientY - box.top
    const gapX = 14
    const gapY = 12
    const tipW = timelineTooltipRef.current?.offsetWidth ?? 160
    const tipH = timelineTooltipRef.current?.offsetHeight ?? 34

    let left = px + gapX
    if (left + tipW > box.width - 8) left = px - tipW - gapX
    left = clamp(left, 8, box.width - tipW - 8)

    let top = py - tipH / 2
    if (top < 8) top = py + gapY
    if (top + tipH > box.height - 8) top = py - tipH - gapY
    top = clamp(top, 8, box.height - tipH - 8)

    setTimelineHover({ title, left, top })
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 20,
        background: 'linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)',
        padding: 20,
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>MCU Exploration Dashboard</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', maxWidth: 760, lineHeight: 1.3 }}>
            Click, hold and slide the black dot through the MCU timeline, inspect year-by-year rating and profit trends, and click any movie or show released in the selected year at Poster Gallery to view the details.
          </div>
        </div>
      </div>

        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'minmax(0, 0.48fr) minmax(0, 0.52fr)',
          gap: 12,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '7fr 3fr',
            gap: 12,
            minHeight: 0
          }}
        >
          <div
            style={{
              border: '1px solid #e6e6e6',
              borderRadius: 18,
              background: '#fff',
              padding: 12,
              boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateRows: '1fr',
              minHeight: 0
            }}
          >
            <div
              ref={timelineRef}
              style={{
                position: 'relative',
                height: '100%',
                borderRadius: 14,
                background: 'linear-gradient(180deg, #fcfcfc 0%, #f6f6f6 100%)',
                overflow: 'hidden',
                minHeight: 0
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  zIndex: 6,
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.96)',
                  padding: '8px 12px',
                  minWidth: 110,
                  boxShadow: '0 10px 22px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>Selected year</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{currentYear}</div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: TIMELINE_SIDE_PADDING,
                  right: TIMELINE_SIDE_PADDING,
                  top: `${TIMELINE_BASE_TOP_PERCENT}%`,
                  height: 12,
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: 999
                }}
              />

              {phaseRanges.map(range => {
                const leftRatio = (range.startDate.getTime() - minTime) / timeSpan
                const widthRatio = (range.endDate.getTime() - range.startDate.getTime()) / timeSpan
                return (
                  <div
                    key={range.phase}
                    style={{
                      position: 'absolute',
                      left: timelineOffset(leftRatio),
                      width: timelineWidth(widthRatio),
                      top: `${TIMELINE_BASE_TOP_PERCENT}%`,
                      height: 12,
                      transform: 'translateY(-50%)',
                      background: phaseColors[range.phase],
                      borderRadius: 999,
                      opacity: 0.9
                    }}
                  />
                )
              })}

              {fantasticFourEntry ? (
                <div
                  style={{
                    position: 'absolute',
                    left: `calc(${timelineOffset((fantasticFourEntry.releaseDate.getTime() - minTime) / timeSpan)} - 10px)`,
                    top: `${TIMELINE_BASE_TOP_PERCENT}%`,
                    right: TIMELINE_SIDE_PADDING,
                    height: 12,
                    transform: 'translateY(-50%)',
                    borderRadius: 999,
                    background: phaseColors[6],
                    zIndex: 2
                  }}
                />
              ) : null}

              {timelineMarkers.map(marker => {
                const isHovered = hoveredTimelineMarkerId === marker.id
                return (
                <div
                  key={marker.id}
                  onMouseEnter={event => {
                    setHoveredTimelineMarkerId(marker.id)
                    updateTimelineHover(event, marker.title)
                  }}
                  onMouseMove={event => updateTimelineHover(event, marker.title)}
                  onMouseLeave={() => {
                    setTimelineHover(null)
                    setHoveredTimelineMarkerId(null)
                  }}
                  style={{
                    position: 'absolute',
                    left: timelineOffset(marker.ratio),
                    top: `calc(${TIMELINE_BASE_TOP_PERCENT}% - ${marker.stackUnit * TIMELINE_STACK_STEP + 8}px)`,
                    transform: `translate(-50%, -50%) scale(${isHovered ? 1.24 : 1})`,
                    width: 12,
                    height: 12,
                    borderRadius: marker.mediaType === 'movie' ? '50%' : 0,
                    clipPath: marker.mediaType === 'show' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                    background: '#FFCC00',
                    border: `${isHovered ? 1.4 : 1}px solid rgba(0,0,0,0.78)`,
                    boxShadow: isHovered ? '0 5px 12px rgba(0,0,0,0.35)' : 'none',
                    boxSizing: 'border-box',
                    zIndex: isHovered ? 11 : 8,
                    cursor: 'pointer',
                    transition: 'transform 120ms ease, box-shadow 120ms ease, border-width 120ms ease'
                  }}
                />
                )
              })}

              {timelineHover ? (
                <div
                  ref={timelineTooltipRef}
                  style={{
                    position: 'absolute',
                    left: timelineHover.left,
                    top: timelineHover.top,
                    pointerEvents: 'none',
                    zIndex: 12,
                    background: 'rgba(255,255,255,0.97)',
                    border: '1px solid rgba(0,0,0,0.14)',
                    borderRadius: 10,
                    boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
                    padding: '7px 9px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'rgba(0,0,0,0.84)',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {timelineHover.title}
                </div>
              ) : null}

              {selectedTimelineMessage ? (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: `calc(${TIMELINE_BASE_TOP_PERCENT}% - ${TIMELINE_INFO_TOP_OFFSET}px)`,
                    transform: 'translateX(-50%)',
                    width: 220,
                    padding: 12,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.96)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                    zIndex: 5
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2, marginBottom: 6 }}>
                    {currentYear}
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.35, color: 'rgba(0,0,0,0.74)' }}>
                    {selectedTimelineMessage}
                  </div>
                </div>
              ) : selectedTimelineHighlight ? (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: `calc(${TIMELINE_BASE_TOP_PERCENT}% - ${TIMELINE_INFO_TOP_OFFSET}px)`,
                    transform: 'translateX(-50%)',
                    width: 220,
                    display: 'flex',
                    gap: 10,
                    padding: 10,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.96)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                    zIndex: 5
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      minWidth: 54,
                      height: 78,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#ececec'
                    }}
                  >
                    {selectedTimelineHighlight.posterUrl ? (
                      <img
                        src={selectedTimelineHighlight.posterUrl}
                        alt={selectedTimelineHighlight.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2, marginBottom: 4 }}>
                      {selectedTimelineHighlight.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.58)', marginBottom: 6 }}>
                      Phase {selectedTimelineHighlight.phase} • {selectedTimelineHighlight.year}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.3, color: 'rgba(0,0,0,0.74)' }}>
                      {selectedTimelineHighlight.note}
                    </div>
                  </div>
                </div>
              ) : null}

              <div style={{ position: 'absolute', left: TIMELINE_SIDE_PADDING, bottom: 22, display: 'flex', gap: 12, alignItems: 'center', fontSize: 11, flexWrap: 'wrap' }}>
                {([1, 2, 3, 4, 5, 6] as Phase[]).map(phase => (
                  <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: phaseColors[phase],
                        border: '1px solid rgba(0,0,0,0.18)',
                        display: 'inline-block'
                      }}
                    />
                    <span>{`Phase ${phase}`}</span>
                  </div>
                ))}
                <div style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.2)', margin: '0 4px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#FFCC00',
                      border: '1px solid rgba(0,0,0,0.72)',
                      display: 'inline-block'
                    }}
                  />
                  <span>Movie</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      background: '#FFCC00',
                      border: '1px solid rgba(0,0,0,0.72)',
                      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                      display: 'inline-block'
                    }}
                  />
                  <span>TV Show</span>
                </div>
              </div>

              <input
                className="timeline-slider"
                type="range"
                min={minYear}
                max={maxYear}
                step={1}
                value={currentYear}
                onChange={event => setSelectedYear(Number(event.target.value))}
                style={{
                  position: 'absolute',
                  left: TIMELINE_SIDE_PADDING - TIMELINE_THUMB_SIZE / 2,
                  right: TIMELINE_SIDE_PADDING - TIMELINE_THUMB_SIZE / 2,
                  top: `${TIMELINE_BASE_TOP_PERCENT}%`,
                  transform: 'translateY(-50%)',
                  width: `calc(100% - ${TIMELINE_SIDE_PADDING * 2 - TIMELINE_THUMB_SIZE}px)`,
                  margin: 0,
                  zIndex: 4,
                  background: 'transparent',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, minHeight: 0 }}>
            <MetricChart
              title="Average IMDb Rating for MCU Movie over Years"
              data={ratingData}
              selectedYear={currentYear}
              formatter={formatRating}
              stroke="#111"
              yDomainMode="tight"
            />
            <MetricChart
              title="Average MCU Movie Profit over Years"
              data={profitData}
              selectedYear={currentYear}
              formatter={formatRevenue}
              stroke="#d62828"
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              minHeight: 0
            }}
          >
            <div
              style={{
                border: '1px solid #e6e6e6',
                borderRadius: 18,
                background: '#fff',
                padding: 14,
                boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Poster Gallery</div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
                  {yearEntries.length} release{yearEntries.length === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, overflowY: 'auto', paddingRight: 4 }}>
                {yearEntries.map(entry => {
                  const active = selectedEntry?.id === entry.id
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntryId(entry.id)}
                      style={{
                        border: active ? '2px solid #111' : '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 14,
                        background: active ? 'rgba(0,0,0,0.04)' : '#fafafa',
                        padding: 8,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div
                        style={{
                          height: 132,
                          borderRadius: 10,
                          overflow: 'hidden',
                          background: entry.posterUrl
                            ? '#ececec'
                            : entry.mediaType === 'show'
                              ? 'linear-gradient(135deg, #1a1a1a, #4e4e4e)'
                              : '#ececec',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 13,
                          padding: 10,
                          boxSizing: 'border-box'
                        }}
                      >
                        {entry.posterUrl ? (
                          <img src={entry.posterUrl} alt={entry.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{entry.mediaType === 'show' ? 'TV SHOW' : 'NO POSTER'}</span>
                        )}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>{entry.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.58)' }}>
                        {entry.mediaType === 'movie' ? 'Movie' : 'TV Show'} • Phase {entry.phase}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                border: '1px solid #e6e6e6',
                borderRadius: 18,
                background: '#fff',
                padding: 14,
                boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                overflow: 'hidden',
                minHeight: 0
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800 }}>Selected Title Details</div>
              {selectedEntry ? (
                <div style={{ display: 'grid', gap: 14, overflowY: 'auto', paddingRight: 4 }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div
                      style={{
                        width: 108,
                        minWidth: 108,
                        height: 160,
                        borderRadius: 12,
                        overflow: 'hidden',
                        background: selectedEntry.posterUrl
                          ? '#ececec'
                          : selectedEntry.mediaType === 'show'
                            ? 'linear-gradient(135deg, #1a1a1a, #4e4e4e)'
                            : '#ececec',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 800,
                        padding: 10,
                        boxSizing: 'border-box'
                      }}
                    >
                      {selectedEntry.posterUrl ? (
                        <img src={selectedEntry.posterUrl} alt={selectedEntry.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>{selectedEntry.mediaType === 'show' ? 'TV SHOW' : 'NO POSTER'}</span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{selectedEntry.title}</div>
                      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.64)' }}>
                        {selectedEntry.mediaType === 'movie' ? 'Movie' : 'TV Show'} • Phase {selectedEntry.phase}
                      </div>
                      <div style={{ fontSize: 13 }}><strong>Release date:</strong> {selectedEntry.releaseDate.toLocaleDateString()}</div>
                      <div style={{ fontSize: 13 }}><strong>IMDb rating:</strong> {formatRating(selectedEntry.rating)}</div>
                      <div style={{ fontSize: 13 }}><strong>Revenue:</strong> {selectedEntry.mediaType === 'movie' ? formatRevenue(selectedEntry.revenue) : 'N/A'}</div>
                      <div style={{ fontSize: 13 }}><strong>Profit:</strong> {selectedEntry.mediaType === 'movie' ? formatRevenue(selectedEntry.profit) : 'N/A'}</div>
                    </div>
                  </div>

                  {selectedEntry.overview ? (
                    <div style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(0,0,0,0.76)' }}>
                      {selectedEntry.overview}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>No release is available for the selected year.</div>
              )}
            </div>

            <div
              style={{
                border: '1px solid #e6e6e6',
                borderRadius: 18,
                background: '#fff',
                padding: 14,
                boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Top User Reviews</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)' }}>Click a review to expand/collapse</div>
              </div>
              {selectedEntry ? (
                selectedReviews.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 }}>
                    {selectedReviews.map((review, index) => {
                      const key = reviewKey(review)
                      const expanded = expandedReviewKey === key
                      return (
                      <button
                        type="button"
                        onClick={() => setExpandedReviewKey(expanded ? null : key)}
                        key={`${key}-${index}`}
                        style={{
                          cursor: 'pointer',
                          border: '1px solid rgba(0,0,0,0.1)',
                          borderRadius: 12,
                          padding: 10,
                          background: expanded ? '#f3f3f3' : '#fafafa',
                          textAlign: 'left',
                          display: 'block',
                          width: '100%',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          overflowX: 'hidden',
                          minHeight: expanded ? 260 : 170
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{review.title || 'Untitled review'}</div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', margin: '4px 0 6px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <span>{review.author}</span>
                          <span>•</span>
                          <span>{review.date || 'Unknown date'}</span>
                          <span>•</span>
                          <span>Rating {formatRating(review.rating)}</span>
                          <span>•</span>
                          <span>Likes {review.likes}</span>
                          <span>•</span>
                          <span>Dislikes {review.dislikes}</span>
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.4, color: 'rgba(0,0,0,0.76)' }}>
                          {expanded ? (
                            <div
                              style={{
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word',
                                maxHeight: 150,
                                overflowY: 'auto',
                                paddingRight: 2
                              }}
                            >
                              {review.body || 'No review text available.'}
                            </div>
                          ) : (
                            <span
                              style={{
                                display: '-webkit-box',
                                maxWidth: '100%',
                                whiteSpace: 'normal',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical'
                              }}
                            >
                              {review.body || 'No review text available.'}
                            </span>
                          )}
                        </div>
                      </button>
                    )})}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
                    No review data is available for this title.
                  </div>
                )
              ) : (
                <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>No release is available for the selected year.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .timeline-slider::-webkit-slider-runnable-track {
          height: 0;
          background: transparent;
          border: none;
        }

        .timeline-slider::-moz-range-track {
          height: 0;
          background: transparent;
          border: none;
        }

        .timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #111111;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.95);
          cursor: pointer;
          margin-top: -7px;
          transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
        }

        .timeline-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #111111;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.95);
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
        }

        .timeline-slider:hover::-webkit-slider-thumb {
          transform: scale(1.12);
          box-shadow: 0 0 0 3px rgba(17,17,17,0.18);
          background: #2b2b2b;
        }

        .timeline-slider:hover::-moz-range-thumb {
          transform: scale(1.12);
          box-shadow: 0 0 0 3px rgba(17,17,17,0.18);
          background: #2b2b2b;
        }
      `}</style>
    </div>
  )
}
