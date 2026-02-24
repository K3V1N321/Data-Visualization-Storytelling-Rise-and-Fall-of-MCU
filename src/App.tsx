
import React from 'react'
import { useState } from 'react'

import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { grey } from '@mui/material/colors'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const theme = createTheme({
  palette: {
    primary: { main: grey[700] },
    secondary: { main: grey[700] }
  }
})

function Layout() {
  return (
    <Box id='main-container'>
      <Stack spacing={1} sx={{ height: '100%' }}>
        {/* Top row: Example component taking about 60% width */}
        <Grid container spacing={1} sx={{ height: '60%' }}>
          <Grid size={7}>
        
          </Grid>
          
          <Grid size="grow" />
        </Grid>
        {/* Bottom row: Notes component taking full width */}
        <Grid size={12} sx={{ height: '40%' }}>
          
         
        </Grid>
      </Stack>
    </Box>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  )
}

export default App