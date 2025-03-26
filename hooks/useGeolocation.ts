import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false
      }));
      return;
    }

    const successHandler = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false
      });
    };

    const errorHandler = (error: GeolocationPositionError) => {
      setState(prev => ({
        ...prev,
        error: `Unable to retrieve your location: ${error.message}`,
        loading: false
      }));
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      successHandler,
      errorHandler,
      options
    );

  }, []);

  return state;
}

export default useGeolocation; 