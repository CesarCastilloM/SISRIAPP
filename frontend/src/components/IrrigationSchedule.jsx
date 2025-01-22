import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  WaterDrop,
  Schedule,
  CalendarToday,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const IrrigationSchedule = ({ schedule = [], isConnected, onScheduleUpdate }) => {
  const [open, setOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const waterUsageData = [
    { day: 'Mon', amount: 250 },
    { day: 'Tue', amount: 300 },
    { day: 'Wed', amount: 200 },
    { day: 'Thu', amount: 350 },
    { day: 'Fri', amount: 280 },
    { day: 'Sat', amount: 220 },
    { day: 'Sun', amount: 270 },
  ];

  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setOpen(true);
  };

  const handleEditSchedule = (scheduleItem) => {
    setEditingSchedule(scheduleItem);
    setOpen(true);
  };

  const handleSave = (formData) => {
    // Handle save logic
    setOpen(false);
  };

  const getStatusChip = (status) => {
    const statusColors = {
      active: 'success',
      pending: 'warning',
      completed: 'default',
      failed: 'error',
    };
    return (
      <Chip
        size="small"
        color={statusColors[status.toLowerCase()]}
        label={status}
        sx={{ textTransform: 'capitalize' }}
      />
    );
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
            Irrigation Schedule
          </Typography>
          {isConnected && (
            <IconButton color="primary" onClick={handleAddSchedule}>
              <AddIcon />
            </IconButton>
          )}
        </Box>

        {/* Water Usage Chart */}
        <Box mb={3} height={200}>
          <Typography variant="subtitle2" gutterBottom>
            Weekly Water Usage (Liters)
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterUsageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#2196f3" name="Water Usage" />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Schedule Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Zone</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Water Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedule.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell>{item.zone}</TableCell>
                  <TableCell>{item.startTime}</TableCell>
                  <TableCell>{item.duration} min</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <WaterDrop color="primary" sx={{ mr: 0.5 }} fontSize="small" />
                      {item.waterAmount}L
                    </Box>
                  </TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>
                    {isConnected && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleEditSchedule(item)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {schedule.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {isConnected ? 'No schedules set' : 'System offline'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Schedule Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>
            {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Zone</InputLabel>
                <Select label="Zone">
                  <MenuItem value={1}>Zone 1</MenuItem>
                  <MenuItem value={2}>Zone 2</MenuItem>
                  <MenuItem value={3}>Zone 3</MenuItem>
                  <MenuItem value={4}>Zone 4</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Start Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Duration (minutes)"
                type="number"
                fullWidth
              />
              <TextField
                label="Water Amount (Liters)"
                type="number"
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default IrrigationSchedule;
