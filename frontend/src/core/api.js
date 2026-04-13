import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Drone API
export const uploadDroneVideo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await api.post('/drone/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading drone video:', error);
    throw error;
  }
};

// Satellite API
export const uploadSatelliteImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await api.post('/satellite/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading satellite image:', error);
    throw error;
  }
};

// Sensor API
export const getSensorData = async () => {
  try {
    const response = await api.get('/sensor/simulate');
    return response.data;
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }
};

// Fusion API
export const getFusionData = async () => {
  try {
    const response = await api.get('/fusion');
    return response.data;
  } catch (error) {
    console.error('Error fetching fusion data:', error);
    throw error;
  }
};

// Threat API
export const getThreatData = async () => {
  try {
    const response = await api.get('/threat');
    return response.data;
  } catch (error) {
    console.error('Error fetching threat data:', error);
    throw error;
  }
};

// Report API
export const getReport = async () => {
  try {
    const response = await api.get('/report');
    return response.data;
  } catch (error) {
    console.error('Error fetching report:', error);
    throw error;
  }
};

// Query API
export const queryAI = async (question) => {
  try {
    const response = await api.get('/query', {
      params: { q: question },
    });
    return response.data;
  } catch (error) {
    console.error('Error querying AI:', error);
    throw error;
  }
};