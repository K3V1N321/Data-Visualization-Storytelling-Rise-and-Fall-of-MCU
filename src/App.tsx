import { useState } from "react";
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { grey } from '@mui/material/colors'
import McuTimeline from './components/McuTimeline'
import McuConnections from './components/McuConnections'
import RevenueBarChart from './components/RevenueBarChart'
import McuYearDotPlot from './components/McuYearDotPlot'
import McuRatingsLineChart from './components/McuRatingsLineChart'
import McuMoviesReviews from './components/McuMoviesReviews'
import RatingsProfitScatterPlot from "./components/RatingsProfitScatterPlot";
import McuConnectionsPhase46 from './components/McuConnectionsPhase46'
import McuExplorationDashboard from './components/McuExplorationDashboard'
import McuProfitsLineChart from "./components/McuProfitLineChart";
import McuRiseNarration from "./components/McuRiseNarration";

const theme = createTheme({
  palette: {
    primary: { main: grey[700] },
    secondary: { main: grey[700] }
  }
})

function Layout() {
  const TIMELINE_HEIGHT = 500
  const CONNECTION_HEIGHT = 560
  const CONNECTION_PHASE46_HEIGHT = 560
  const BAR_CHART_HEIGHT = 400
  const DOT_PLOT_HEIGHT = 380
  const LINE_CHART_HEIGHT = 400
  const SCATTER_PLOT_HEIGHT = 400

  const [selectedReviewsYear, setReviewsYear] = useState<Number | null>(null);  
  return (
    <Box
      id="main-container"
      sx={{
        minHeight: '100vh',
        width: '100%',
        p: 1,
        overflowY: 'auto'
      }}
    >
      <Stack spacing={5} sx={{ width: '100%' }}>
        {/* ===== TIMELINE PANEL (TOP) ===== */}
        <Grid
          container
          spacing={1}
          sx={{
            height: TIMELINE_HEIGHT,
            flex: '0 0 auto'
          }}
        >
          <Grid item xs={12} sx={{ height: '100%' }}>
            {/* This wrapper forces the panel to be WIDE */}
            <Box
              sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                justifyContent: 'center' // center the card
              }}
            >
              {/* This is the actual card */}
              <Box
                sx={{
                  width: '95vw',       
                  maxWidth: 1800,       
                  height: '100%',       
                  p: 0.5,
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  bgcolor: '#fafafa',
                  display: 'flex'
                }}
              >
                {/* This ensures McuTimeline gets the full area */}
                <Box sx={{ width: '100%', height: '100%', minWidth: 0 }}>
                  <McuTimeline />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <h1>Rise of MCU</h1>

       {/* ===== CONNECTIONS PANEL ===== */}
        <Grid
          container
          spacing={1}
          sx={{
            height: CONNECTION_HEIGHT,
            flex: '0 0 auto'
          }}
        >
          <Grid item xs={12} sx={{ height: '100%' }}>
            <Box
              sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: '95vw',
                  maxWidth: 1800,
                  height: '100%',
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  bgcolor: '#fafafa',
                  display: 'flex'
                }}
              >
                <Box sx={{ width: '100%', height: '100%', minWidth: 0 }}>
                  <McuConnections />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
        <McuRiseNarration section = {"connections"}/>

        {/* ===== BOTTOM PANEL (FUTURE VIEWS) ===== */}
        <Grid container spacing = {1} sx = {{width: "50%", height: BAR_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid sx = {{width: "100%", height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
              <RevenueBarChart timePeriod = "early"/>
            </Box>
          </Grid>
        </Grid>
        <McuRiseNarration section = {"box office"}/>
        
        <h1>Fall of MCU</h1>
        <Grid container spacing = {1} sx = {{width: "50%", height: BAR_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid sx = {{width: "100%", height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
              <RevenueBarChart timePeriod = "recent"/>
            </Box>
          </Grid>
        </Grid>

        {/* ✅ ===== DOT PLOT PANEL (AFTER REVENUE) ===== */}
        <Grid container spacing={1} sx={{ height: DOT_PLOT_HEIGHT, flex: '0 0 auto' }}>
          <Grid item xs={12} sx={{ height: '100%' }}>
            <Box sx={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: '78vw',
                  maxWidth: 700,
                  maxHeight: 300,
                  height: '100%',
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  bgcolor: '#fafafa',
                  display: 'flex'
                }}
              >
                <Box sx={{ width: '100%', height: '100%', minWidth: 0 }}>
                  <McuYearDotPlot />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Grid
          container
          spacing={1}
          sx={{
            height: `${CONNECTION_PHASE46_HEIGHT}px`,
            minHeight: `${CONNECTION_PHASE46_HEIGHT}px`,
            flex: '0 0 auto'
          }}
        >
          <Grid item xs={12} sx={{ height: `${CONNECTION_PHASE46_HEIGHT}px`, minHeight: `${CONNECTION_PHASE46_HEIGHT}px` }}>
            <Box
              sx={{
                height: `${CONNECTION_PHASE46_HEIGHT}px`,
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: '95vw',
                  maxWidth: 1800,
                  height: `${CONNECTION_PHASE46_HEIGHT}px`,
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  bgcolor: '#fafafa',
                  display: 'flex'
                }}
              >
                <Box sx={{ width: '100%', height: '100%', minWidth: 0 }}>
                  <McuConnectionsPhase46 />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing = {1} sx = {{width: "100%", height: LINE_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid size = {6} sx = {{height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
                <McuRatingsLineChart selectedReviewsYear = {selectedReviewsYear} setReviewsYear = {setReviewsYear}/>
            </Box>
          </Grid>
          
          <Grid size = {4} sx = {{height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", flexDirection: "column"}}>
              <McuMoviesReviews selectedReviewsYear = {selectedReviewsYear}/>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing = {1} sx = {{width: "100%", height: LINE_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid size = {6} sx = {{height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
              <McuProfitsLineChart/>
            </Box>
          </Grid>
        </Grid>

        {/* <Grid container spacing = {1} sx = {{width: "100%", height: SCATTER_PLOT_HEIGHT, flex: "0 0 auto"}}>
          <Grid size = {4} sx = {{height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
              <RatingsProfitScatterPlot timePeriod = "early"/>
            </Box>
          </Grid>
          
          <Grid size = {4} sx = {{height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", flexDirection: "center"}}>
              <RatingsProfitScatterPlot timePeriod = "recent"/>
            </Box>
          </Grid>
        </Grid> */}

        <Grid
          container
          spacing={1}
          sx={{
            height: 'calc(100vh - 16px)',
            flex: '0 0 auto'
          }}
        >
          <Grid item xs={12} sx={{ height: '100%' }}>
            <Box
              sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: '95vw',
                  maxWidth: 1800,
                  height: '100%',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  bgcolor: '#fafafa',
                  display: 'flex'
                }}
              >
                <Box sx={{ width: '100%', height: '100%', minWidth: 0 }}>
                  <McuExplorationDashboard />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

      </Stack>
    </Box>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  )
}
