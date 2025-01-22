import React, { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Paper,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface Zone {
  zone_id: string;
  name: string;
  crop_type: string;
  area_hectares: number;
}

interface ZoneListProps {
  onSelectZone: (zoneId: string) => void;
  onEditZone: (zoneId: string) => void;
  onDeleteZone: (zoneId: string) => void;
}

const ZoneList: React.FC<ZoneListProps> = ({
  onSelectZone,
  onEditZone,
  onDeleteZone,
}) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/zones');
      if (!response.ok) throw new Error('Failed to fetch zones');
      const data = await response.json();
      setZones(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (zones.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="body1" color="textSecondary">
          No zones found. Create a zone by drawing on the map.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper>
      <List>
        {zones.map((zone, index) => (
          <React.Fragment key={zone.zone_id}>
            {index > 0 && <Divider />}
            <ListItem>
              <ListItemText
                primary={zone.name}
                secondary={`${zone.crop_type} - ${zone.area_hectares.toFixed(1)} ha`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="view"
                  onClick={() => onSelectZone(zone.zone_id)}
                >
                  <VisibilityIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => onEditZone(zone.zone_id)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => onDeleteZone(zone.zone_id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default ZoneList;
