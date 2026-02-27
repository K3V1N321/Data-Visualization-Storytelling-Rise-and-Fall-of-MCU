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

const theme = createTheme({
  palette: {
    primary: { main: grey[700] },
    secondary: { main: grey[700] }
  }
})

function Layout() {
  const TIMELINE_HEIGHT = 500
  const CONNECTION_HEIGHT = 400
  const BAR_CHART_HEIGHT = 500
  const DOT_PLOT_HEIGHT = 380

  const [selectedReviewsYear, setReviewsYear] = useState<Number | null>(null);  
  return (
    <Box
      id="main-container"
      sx={{
        height: '100vh',
        width: '100%',
        p: 1,
        overflowY: 'auto'
      }}
    >
      <Stack spacing={5} sx={{ height: '100%', width: '100%' }}>
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
                  p: 2,
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

        {/* ===== BOTTOM PANEL (FUTURE VIEWS) ===== */}
        <Grid container spacing = {1} sx = {{width: "50%", height: BAR_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid sx = {{width: "100%", height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
              <RevenueBarChart/>
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
                  maxWidth: 1200,
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

        <Grid container spacing = {1} sx = {{width: "100%", height: BAR_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid size = {6} sx = {{height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
                <McuRatingsLineChart selectedReviewsYear = {selectedReviewsYear} setReviewsYear = {setReviewsYear}/>
            </Box>
          </Grid>
          
          <Grid size = {6} sx = {{height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", flexDirection: "column"}}>
              <McuMoviesReviews selectedReviewsYear = {selectedReviewsYear}/>
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