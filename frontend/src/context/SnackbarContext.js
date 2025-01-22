import React, { createContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

export const SnackbarContext = createContext({});

export const SnackbarProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');

  const showSnackbar = (msg, sev = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar open={open} autoHideDuration={6000} onClose={() => setOpen(false)}>
        <Alert severity={severity} onClose={() => setOpen(false)}>{message}</Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
