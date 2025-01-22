import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface ZoneCreationProps {
  geometry: any;
  onClose: () => void;
  onSuccess: () => void;
}

const CROP_TYPES = [
  'corn',
  'cotton',
  'alfalfa',
  'wheat',
  'sorghum',
  'soybeans',
  'other'
];

const SOIL_TYPES = [
  'loam',
  'sandy loam',
  'clay loam',
  'sandy clay loam',
  'silt loam',
  'other'
];

const IRRIGATION_TYPES = [
  'sprinkler',
  'drip',
  'flood',
  'center pivot',
  'other'
];

const ZoneCreation: React.FC<ZoneCreationProps> = ({ geometry, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    crop_type: '',
    soil_type: '',
    irrigation_type: '',
    planting_date: null as Date | null,
    expected_harvest: null as Date | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/zones/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          geometry,
          planting_date: formData.planting_date?.toISOString(),
          expected_harvest: formData.expected_harvest?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create zone');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Zone</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Zone Name"
                value={formData.name}
                onChange={handleChange('name')}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Crop Type"
                value={formData.crop_type}
                onChange={handleChange('crop_type')}
                required
              >
                {CROP_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Soil Type"
                value={formData.soil_type}
                onChange={handleChange('soil_type')}
                required
              >
                {SOIL_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Irrigation Type"
                value={formData.irrigation_type}
                onChange={handleChange('irrigation_type')}
                required
              >
                {IRRIGATION_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Planting Date"
                  value={formData.planting_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, planting_date: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Expected Harvest Date"
                  value={formData.expected_harvest}
                  onChange={(date) => setFormData(prev => ({ ...prev, expected_harvest: date }))}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            {error && (
              <Grid item xs={12}>
                <Typography color="error">{error}</Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Zone'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ZoneCreation;
