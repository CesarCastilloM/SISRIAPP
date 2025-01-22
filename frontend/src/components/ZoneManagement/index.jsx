import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper } from '@mui/material';
import ZoneList from './ZoneList';
import ZoneDetails from './ZoneDetails';
import ZoneCreation from './ZoneCreation';
import FieldMap from '../FieldMap';

const ZoneManagement = () => {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [showZoneCreation, setShowZoneCreation] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    // Fetch zones when component mounts
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      if (!response.ok) throw new Error('Failed to fetch zones');
      const data = await response.json();
      setZones(data.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleZoneSelect = (zoneId) => {
    setSelectedZoneId(zoneId);
  };

  const handleZoneEdit = (zoneId) => {
    // TODO: Implement zone editing
    console.log('Edit zone:', zoneId);
  };

  const handleZoneDelete = async (zoneId) => {
    try {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete zone');
      await fetchZones(); // Refresh the zone list
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  const handleZoneCreated = (newZone) => {
    console.log('New zone drawn:', newZone);
    setDrawnGeometry(newZone);
    setShowZoneCreation(true);
  };

  const handleZoneCreationSuccess = async () => {
    setShowZoneCreation(false);
    await fetchZones(); // Refresh the zone list
  };

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper>
            <ZoneList
              onSelectZone={handleZoneSelect}
              onEditZone={handleZoneEdit}
              onDeleteZone={handleZoneDelete}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper style={{ height: '500px' }}>
            <FieldMap
              zones={zones}
              selectedZone={selectedZoneId}
              onZoneSelect={handleZoneSelect}
              editMode={true}
              onZoneCreated={handleZoneCreated}
            />
          </Paper>
        </Grid>

        {selectedZoneId && (
          <Grid item xs={12}>
            <ZoneDetails zoneId={selectedZoneId} />
          </Grid>
        )}
      </Grid>

      {showZoneCreation && drawnGeometry && (
        <ZoneCreation
          geometry={drawnGeometry}
          onClose={() => setShowZoneCreation(false)}
          onSuccess={handleZoneCreationSuccess}
        />
      )}
    </Box>
  );
};

export default ZoneManagement;
