import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Forest green
      light: '#4caf50', // Regular green
      dark: '#1b5e20', // Dark green
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#81c784', // Light green
      light: '#a5d6a7',
      dark: '#66bb6a',
      contrastText: '#000000',
    },
    background: {
      default: '#f5f9f5', // Very light green tint
      paper: '#ffffff',
    },
    success: {
      main: '#43a047',
      light: '#66bb6a',
      dark: '#2e7d32',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ffa000',
    },
    info: {
      main: '#0288d1',
    },
    text: {
      primary: '#1c2121',
      secondary: '#445555',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      color: '#2e7d32',
      fontWeight: 500,
    },
    h2: {
      color: '#2e7d32',
      fontWeight: 500,
    },
    h3: {
      color: '#2e7d32',
      fontWeight: 500,
    },
    h4: {
      color: '#2e7d32',
      fontWeight: 500,
    },
    h5: {
      color: '#2e7d32',
      fontWeight: 500,
    },
    h6: {
      color: '#2e7d32',
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(46, 125, 50, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
        contained: {
          boxShadow: '0 2px 4px rgba(46, 125, 50, 0.2)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2e7d32',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f9f5',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#66bb6a',
          '&.Mui-selected': {
            color: '#2e7d32',
          },
        },
      },
    },
  },
});

export default theme;
