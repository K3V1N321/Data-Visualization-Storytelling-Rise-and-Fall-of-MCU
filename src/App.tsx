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
import McuNarration from "./components/McuNarration";

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
  const LINE_CHART_HEIGHT = 300
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
        <McuNarration section = {"introduction"}/>

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
        <McuNarration section = {"connections"}/>

        {/* ===== BOTTOM PANEL (FUTURE VIEWS) ===== */}
        <Grid container spacing = {1} sx = {{width: "50%", height: BAR_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid sx = {{width: "100%", height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
              <RevenueBarChart timePeriod = "early"/>
            </Box>
          </Grid>
        </Grid>
        <McuNarration section = {"box office"}/>
        
        <h1>Fall of MCU</h1>
        <Grid container spacing = {1} sx = {{width: "50%", height: BAR_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid sx = {{width: "100%", height: "100%"}}>
            <Box sx = {{width: "100%", height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa", display: "flex", justifyContent: "center"}}>
              <RevenueBarChart timePeriod = "recent"/>
            </Box>
          </Grid>
        </Grid>
        <McuNarration section = {"box office fall"}/>

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
        <McuNarration section = {"oversaturation"}/>

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
        <McuNarration section = {"connection barriers"}/>
        

        <Box sx = {{width: "75%", height: LINE_CHART_HEIGHT * 2 + 10, flex: "0 0 auto", bgcolor: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 2, p: 2}}>
          <Grid container columnSpacing = {2} sx = {{height: "100%"}}>
            <Grid size = {7} sx = {{display: "flex", flexDirection: "column", gap: 2}}>

                <Box sx = {{width: "100%", height: LINE_CHART_HEIGHT, display: "flex", justifyContent: "center", bgcolor: "#ffffff", borderRadius: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.08)"}}>
                    <McuRatingsLineChart selectedReviewsYear = {selectedReviewsYear} setReviewsYear = {setReviewsYear}/>
                </Box>
                <Box sx = {{width: "100%", height: LINE_CHART_HEIGHT, display: "flex", justifyContent: "center", bgcolor: "#ffffff", borderRadius: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.08)"}}>
                  <McuProfitsLineChart/>
                </Box>
            </Grid>
            
            <Grid size = {5} sx = {{height: "100%"}}>
              <Box sx = {{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
                <McuMoviesReviews selectedReviewsYear = {selectedReviewsYear}/>
              </Box>
            </Grid>
          </Grid>
        </Box>
        <McuNarration section = {"inconsistency"}/>

        <h1>Conclusion</h1>
        <McuNarration section = {"conclusion"}/>

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
