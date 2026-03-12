# Rise and Decline of the MCU

This project is a data storytelling app about the rise and decline of the Marvel Cinematic Universe (MCU). It combines narrative text with interactive visualizations built with TypeScript, D3 and Material UI.

## Requirements

To run the app locally, make sure you have:

- `Node.js` installed
- `npm` installed
- A desktop browser such as Chrome, Edge, Firefox, or Safari

The app reads local CSV files from the `data/` folder and runs as a client-side Vite application.

## How to Run the App

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the local URL shown in the terminal. Vite usually serves the app at:

```bash
http://localhost:3000/
```

## App Structure

The page is organized into two parts:

- A guided storytelling section that explains the rise and decline of the MCU with supporting charts
- An exploration dashboard that lets users inspect the MCU timeline, yearly trends, titles, and reviews on their own

## Interactions in the Charts

### 1. MCU Timeline

- Hover over a regular movie dot to see a tooltip with the movie title, release date, phase, and poster.
- Important movies are permanently annotated on the timeline with callouts and posters.
- Timeline is colored based on the different phases

### 2. Rise of MCU Connections Chart

- Hover over a movie dot to highlight that movie and its related connections.
- Related arcs and movie labels are emphasized while unrelated items are dimmed.
- Use the buttons in the top-right corner to filter connection lines by:
  - `All lines`
  - `Direct sequel`
  - `Crossover`
  - `Carryover`

### 3. Box Office Revenue Bar Charts

- Hover over a yearly stacked bar to see a tooltip showing:
  - MCU revenue
  - non-MCU revenue
  - percentage contribution of each
- The hovered bar is visually highlighted.
- There are two views in the story:
  - an early-period view for the rise years
  - a recent-period view for the decline section

### 4. Oversaturation Dot Plot

- Each dot represents an MCU release in a year.
- Circles represent movies and triangles represent TV shows.
- Hover over any dot to see the exact movie or show title.
- The chart includes a legend for media type and shows stacked yearly release volume.

### 5. Phase 4-6 Connections Chart

- Hover over a movie or show marker to highlight directly related titles and story links.
- Movies and shows use different marker shapes.
- Use the filter buttons to show:
  - `All lines`
  - `Direct sequel`
  - `Crossover`
  - `Carryover`
- This chart is specifically focused on Phase 4 to Phase 6 relationships, including movie-to-show and show-to-movie links.

### 6. IMDb Ratings Line Chart

- Hover over a yearly point to see a tooltip with the maximum, average, and minimum IMDb rating for that year.
- Hovering also highlights the matching point in the profit chart.
- Click a year point to select that year.
- Clicking the selected point again clears the selection.
- Selecting a year updates the reviews panel to show the movies released in that year and their reviews.

### 7. Profit Line Chart

- Hover over a yearly point to see a tooltip with the maximum, average, and minimum movie profit for that year.
- Hovering also highlights the matching point in the ratings chart.
- Click a year point to select that year.
- Clicking the selected point again clears the selection.
- Year selection is shared with the ratings chart and the reviews panel.

### 8. Movie Reviews Panel

- This panel reacts to the selected year from either the ratings or profit chart.
- Click a movie card to expand or collapse its list of top IMDb review titles.
- Click a review entry to expand or collapse the full review body.
- If no year is selected, the panel remains empty.

### 9. MCU Exploration Dashboard

This section is the most interactive part of the app.

- Use the timeline slider to move year by year across the MCU timeline.
- Hover over timeline markers to see a tooltip with the title name.
- The selected year updates:
  - the timeline information card
  - the yearly rating mini-chart
  - the yearly profit mini-chart
  - the poster gallery
  - the title details panel
  - the top user reviews panel
- Click a poster in the Poster Gallery to select a movie or show from the chosen year.
- The Selected Title Details panel updates with:
  - poster
  - media type
  - phase
  - release date
  - IMDb rating
  - revenue
  - profit
  - overview
- In the "Top User Reviews" panel, click a review card to expand or collapse the full review text.

## Data Sources in the Repository

The app loads its data from local CSV files in `data/`, including:

- `data/marvel_movies_tmdb.csv`
- `data/marvel_shows_data.csv`
- `data/marvel_movies_imdb_reviews.csv`
- `data/marvel_shows_imdb_reviews.csv`
- `data/top10_movies_2008_2025.csv`

Some scraping scripts used to collect data are included in `scraper_code/`.
