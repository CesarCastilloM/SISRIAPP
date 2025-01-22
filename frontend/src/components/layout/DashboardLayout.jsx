import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Map,
  WaterDrop,
  Timeline,
  Settings,
  Grass as GrassIcon,
} from '@mui/icons-material';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard /> },
  { text: 'Zones', icon: <Map /> },
  { text: 'Irrigation', icon: <WaterDrop /> },
  { text: 'Analytics', icon: <Timeline /> },
  { text: 'Settings', icon: <Settings /> },
];

const DashboardLayout = ({ 
  children, 
  currentPage, 
  onPageChange,
  serverStatus,
  arduinoStatus,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleMenuClick = (text) => {
    onPageChange(text);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar 
        position="static" 
        elevation={2}
        sx={{ 
          backgroundColor: theme.palette.primary.main,
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <GrassIcon sx={{ mr: 1 }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            SISRI
          </Typography>
        </Toolbar>
      </AppBar>

      {!serverStatus && (
        <Alert severity="error" sx={{ mt: 1, mx: 2 }}>
          Server connection failed. Please check your connection.
        </Alert>
      )}

      {!arduinoStatus && serverStatus && (
        <Alert severity="warning" sx={{ mt: 1, mx: 2 }}>
          Arduino not connected. Some features may be limited.
        </Alert>
      )}

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.default,
            width: 240,
          },
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => handleMenuClick(item.text)}
              selected={currentPage === item.text}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.light + '20',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.light + '30',
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.primary.light + '10',
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: currentPage === item.text ? theme.palette.primary.main : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  color: currentPage === item.text ? theme.palette.primary.main : theme.palette.text.primary,
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          pb: isMobile ? 7 : 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
