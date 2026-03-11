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
  const SECTION_TITLE_PL = 17
  const h2TitleSx = {
    pl: SECTION_TITLE_PL,
    mb: 0,
    display: 'inline-block',
    alignSelf: 'flex-start',
    textDecoration: 'underline',
    textDecorationThickness: '3px',
    textUnderlineOffset: '8px',
    textDecorationColor: 'rgba(0,0,0,0.55)'
  }
  const h3TitleSx = {
    pl: SECTION_TITLE_PL,
    mb: 0
  }

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
        <Box
          sx={{
            width: '100%',
            textAlign: 'center',
            pt: 1,
            pb: 1
          }}
        >
          <Box
            component="h1"
            sx={{
              m: 0,
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '0.01em',
              color: 'rgba(0,0,0,0.88)'
            }}
          >
            Rise and Decline of the MCU
          </Box>
        </Box>

        <McuNarration section = {"intro above timeline"}/>

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
                  maxWidth: 2000,       
                  height: '100%',       
                  ml: 3,
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

        <Box component="h2" sx={h2TitleSx}>
          Rise of MCU
        </Box>

        <McuNarration section = {"RiseofMCUIntro"}/>

        <Box component="h3" sx={h3TitleSx}>
          1. Interconnected Storytelling
        </Box>
        <McuNarration section = {"connections intro above chart"}/>

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
                  ml: 1.5,
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

        <Box component="h3" sx={h3TitleSx}>
          2. Global Appeal and Box Office Success
        </Box>
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Box
            sx={{
              width: '95vw',
              maxWidth: 1800,
              display: 'flex',
              gap: 1,
              alignItems: 'stretch'
            }}
          >
            <Box
              sx={{
                flex: '0 0 45%',
                minWidth: 0,
                ml: 13,
                height: BAR_CHART_HEIGHT,
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                bgcolor: '#fafafa',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <RevenueBarChart timePeriod = "early"/>
            </Box>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'block',
                pt: 1,
                pl: 4,
                pr: 14
              }}
            >
              <McuNarration section = {"box office"} />
            </Box>
          </Box>
        </Box>
        
        <Box component="h2" sx={h2TitleSx}>
          Decline of MCU
        </Box>
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Box
            sx={{
              width: '95vw',
              maxWidth: 1800,
              display: 'flex',
              gap: 1,
              alignItems: 'stretch'
            }}
          >
            <Box
              sx={{
                flex: '0 0 51%',
                minWidth: 0,
                ml: 13,
                height: BAR_CHART_HEIGHT,
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                bgcolor: '#fafafa',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <RevenueBarChart timePeriod = "recent"/>
            </Box>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'block',
                pt: 1,
                pr: 14,
                pl: 4
              }}
            >
              <McuNarration section = {"box office fall"}/>
            </Box>
          </Box>
        </Box>

        <Box component="h3" sx={h3TitleSx}>
          1. Oversaturation of MCU Movies and Shows
        </Box>
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Box
            sx={{
              width: '95vw',
              maxWidth: 1800,
              display: 'flex',
              gap: 3,
              alignItems: 'stretch'
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'block',
                pt: 1,
                pl: 14,
                pr: 0
              }}
            >
              <McuNarration section = {"oversaturation"} />
            </Box>
            <Box
              sx={{
                flex: '0 0 46%',
                minWidth: 0,
                ml: 2,
                height: DOT_PLOT_HEIGHT,
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
        </Box>

        <Box component="h3" sx={h3TitleSx}>
          2. "Lack" of Interconnection in Recent Phases
        </Box>
        <McuNarration section = {"connection barriers above chart"}/>
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
                  ml: 1.5,
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
        

        <Box component="h3" sx={h3TitleSx}>
          3. Inconsistent Quality
        </Box>
        <McuNarration section = {"inconsistency above charts"}/>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Box sx = {{width: "75%", height: LINE_CHART_HEIGHT * 2 + 10, flex: "0 0 auto", bgcolor: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 2, p: 2}}>
            <Grid container columnSpacing = {2} sx = {{height: "100%"}}>
              <Grid size = {7} sx = {{display: "flex", flexDirection: "column", gap: 2}}>

                  <Box sx = {{width: "100%", height: LINE_CHART_HEIGHT, display: "flex", justifyContent: "center", bgcolor: "#ffffff", borderRadius: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.08)"}}>
                      <McuRatingsLineChart selectedReviewsYear = {selectedReviewsYear} setReviewsYear = {setReviewsYear}/>
                  </Box>
                  <Box sx = {{width: "100%", height: LINE_CHART_HEIGHT, display: "flex", justifyContent: "center", bgcolor: "#ffffff", borderRadius: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.08)"}}>
                    <McuProfitsLineChart selectedReviewsYear = {selectedReviewsYear} setReviewsYear = {setReviewsYear}/>
                  </Box>
              </Grid>
              
              <Grid size = {5} sx = {{height: "100%"}}>
                <Box sx = {{width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
                  <McuMoviesReviews selectedReviewsYear = {selectedReviewsYear}/>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
        <McuNarration section = {"inconsistency"}/>

        <Box component="h2" sx={h2TitleSx}>
          Conclusion
        </Box>
        <McuNarration section = {"conclusion"}/>

        <Box component="h2" sx={{ mb: 0, textAlign: 'center' }}>
          Explore the MCU Changes Yourself!
        </Box>
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
                  ml: 3,
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
