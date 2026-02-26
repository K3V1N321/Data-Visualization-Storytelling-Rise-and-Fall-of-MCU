import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { grey } from '@mui/material/colors'
import McuTimeline from './components/McuTimeline'
import RevenueBarChart from './components/RevenueBarChart'

const theme = createTheme({
  palette: {
    primary: { main: grey[700] },
    secondary: { main: grey[700] }
  }
})

function Layout() {
  const TIMELINE_HEIGHT = 550
  const BAR_CHART_HEIGHT = 500
  return (
    <Box
      id="main-container"
      sx={{
        height: '100vh',
        width: '100%',
        p: 1
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
                  width: '95vw',        // ✅ makes it wide (viewport-based)
                  maxWidth: 1800,       // ✅ cap so it doesn’t get ridiculous
                  height: '100%',       // ✅ follow panel height
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

        {/* ===== BOTTOM PANEL (FUTURE VIEWS) ===== */}
        <Grid container spacing = {1} sx = {{height: BAR_CHART_HEIGHT, flex: "0 0 auto"}}>
          <Grid item xs = {12} sx = {{height: "100%"}}>
            <Box sx = {{height: "100%", width: "100%", display: "flex", justifyContent: "center"}}>
              <Box sx = {{width: "95vw", maxWidth: 1800, height: "100%", p: 2, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#ffffff", display: "flex"}}>
                <Box sx = {{width: "100%", height: "100%", minWidth: 0}}>
                  <RevenueBarChart/>
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