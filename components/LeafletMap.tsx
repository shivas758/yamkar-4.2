"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from 'next/dynamic';
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import { EmployeeLocation, fetchEmployeeLocations, fetchLatestEmployeeLocation } from '@/lib/supabaseClient';

// Fix Leaflet marker icon paths
const fixLeafletIcons = () => {
  // Only fix once
  if ((L.Icon.Default as any).initialized) return;
  
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
  
  (L.Icon.Default as any).initialized = true;
};

interface LeafletMapProps {
  employeeId: string;
  location?: { lat: number; lng: number } | string | null;
  showPath?: boolean;
  attendanceLogId?: string;
  containerType?: 'current-location' | 'movement-path'; // Add this prop to identify which tab this is
}

const DEFAULT_LOCATION = { lat: 23.0225, lng: 72.5714 }; // Ahmedabad

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  employeeId,
  location,
  showPath = false,
  attendanceLogId,
  containerType = 'current-location' // Default to current location
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapInstanceId = useRef<string>(Math.random().toString(36).substring(2, 9)); // Unique ID for this instance
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [employeeLocations, setEmployeeLocations] = useState<EmployeeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [noLocationData, setNoLocationData] = useState(false);
  const [todayLocationsCount, setTodayLocationsCount] = useState<number | null>(null);
  const [visibilityKey, setVisibilityKey] = useState<number>(Date.now()); // Add a key for visibility changes
  const mounted = useRef(false);
  const lastMapUpdate = useRef<number>(0);
  const [isEmergencyMapActive, setIsEmergencyMapActive] = useState(false);

  // Improve containerType handling with a ref to persist during state updates
  const containerTypeRef = useRef(containerType);
  
  // Log the container type immediately on creation to help with debugging
  console.log(`LeafletMap created with explicit containerType: ${containerType}`);
  
  // Update ref whenever prop changes
  useEffect(() => {
    if (containerTypeRef.current !== containerType) {
      console.log(`Container type changed from ${containerTypeRef.current} to ${containerType}`);
      containerTypeRef.current = containerType;
    }
  }, [containerType]);

  // Listen for visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log(`Tab became visible, forcing map redraw for containerType: ${containerTypeRef.current}`);
        
        // Force close any existing popups right away
        document.querySelectorAll('.leaflet-popup').forEach(popup => {
          popup.remove();
        });
        
        // Force any existing maps to be removed
        document.querySelectorAll('.leaflet-container').forEach(element => {
          try {
            element.remove();
          } catch (e) { /* ignore */ }
        });
        
        // Brute force DOM manipulation first - reset map container
        try {
          const mapContainers = document.querySelectorAll('[data-map-id]');
          mapContainers.forEach(container => {
            console.log("Resetting map container:", container);
            (container as HTMLElement).style.display = 'block';
            (container as HTMLElement).style.visibility = 'visible';
            (container as HTMLElement).style.height = '350px';
            (container as HTMLElement).innerHTML = ''; // Clear any remaining map elements
          });
        } catch (e) {
          console.error("Error resetting containers:", e);
        }
        
        // Destroy existing map
        if (mapRef.current) {
          try {
            console.log("Destroying old map on visibility change");
            mapRef.current.remove();
            mapRef.current = null;
          } catch (err) {
            console.error('Error removing map during visibility change:', err);
          }
        }
        
        // CRITICAL FIX: First ensure the container exists before proceeding
        // If container doesn't exist, we need to recreate it
        if (!document.querySelector(`[data-map-id="${mapInstanceId.current}"]`)) {
          console.log("Map container missing! Creating replacement container");
          
          // Find the wrapper element
          const wrapper = document.getElementById(`map-wrapper-${visibilityKey}`);
          if (!wrapper) {
            // If we can't find the wrapper, try to find any suitable container
            const fallbackContainer = document.querySelector('.h-full.w-full');
            if (fallbackContainer) {
              console.log("Using fallback container");
              const newContainer = document.createElement('div');
              newContainer.setAttribute('data-map-id', mapInstanceId.current);
              newContainer.className = 'h-full w-full';
              newContainer.style.width = '100%';
              newContainer.style.height = '350px';
              newContainer.style.position = 'relative';
              newContainer.style.display = 'block';
              newContainer.style.visibility = 'visible';
              newContainer.style.zIndex = '1000';
              newContainer.style.backgroundColor = '#f0f0f0';
              newContainer.style.overflow = 'hidden';
              
              fallbackContainer.appendChild(newContainer);
            }
          } else {
            console.log("Found wrapper, recreating container");
            // Clear wrapper content
            wrapper.innerHTML = '';
            
            // Create new container
            const newContainer = document.createElement('div');
            newContainer.setAttribute('data-map-id', mapInstanceId.current);
            newContainer.className = 'h-full w-full';
            newContainer.style.width = '100%';
            newContainer.style.height = '350px';
            newContainer.style.position = 'relative';
            newContainer.style.display = 'block';
            newContainer.style.visibility = 'visible';
            newContainer.style.zIndex = '1000';
            newContainer.style.backgroundColor = '#f0f0f0';
            newContainer.style.overflow = 'hidden';
            
            wrapper.appendChild(newContainer);
          }
        }
        
        // Immediately attempt to create emergency map with delay
        setTimeout(() => {
          try {
            // Get cached data if available
            if (showPath && attendanceLogId) {
              const cacheKey = `map_locations_${attendanceLogId}_${new Date().toISOString().split('T')[0]}`;
              try {
                const cachedData = localStorage.getItem(cacheKey);
                if (cachedData) {
                  const parsedData = JSON.parse(cachedData);
                  if (Array.isArray(parsedData) && parsedData.length > 0) {
                    console.log(`Creating emergency map with ${parsedData.length} cached locations`);
                    createEmergencyMap(parsedData);
                    return;
                  }
                }
              } catch (e) {
                console.error("Error accessing cached data:", e);
              }
            }
            
            // If we have current locations in state, use those
            if (employeeLocations && employeeLocations.length > 0) {
              console.log("Creating emergency map with state locations");
              createEmergencyMap(employeeLocations);
            } else if (attendanceLogId) {
              // If nothing else works, force a reload from API
              console.log("Force reloading locations for emergency map");
              fetchEmployeeLocations(attendanceLogId, false).then(locations => {
                if (locations && locations.length > 0) {
                  createEmergencyMap(locations);
                }
              });
            }
          } catch (e) {
            console.error("Error in immediate emergency map creation:", e);
          }
          
          // Also trigger a component re-render as backup
          setVisibilityKey(Date.now());
        }, 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [coords, employeeLocations, showPath, attendanceLogId, visibilityKey]);

  // Cache locations for persistence across refreshes
  useEffect(() => {
    if (showPath && attendanceLogId && employeeLocations && employeeLocations.length > 0) {
      try {
        const cacheKey = `map_locations_${attendanceLogId}_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(cacheKey, JSON.stringify(employeeLocations));
        console.log(`Cached ${employeeLocations.length} locations for key ${cacheKey}`);
      } catch (e) {
        console.error("Error caching locations:", e);
      }
    }
  }, [employeeLocations, attendanceLogId, showPath]);

  // Separate function to render movement path that can be called from multiple places
  const renderMovementPath = (map: L.Map, locations: EmployeeLocation[]) => {
    try {
      if (!map || !locations || locations.length === 0) {
        console.error("Cannot render path: missing map or locations");
        return;
      }
      
      console.log(`Rendering movement path with ${locations.length} points`);
      
      // Sort locations by creation timestamp
      const timeOrderedLocations = [...locations].sort(
        (a, b) => new Date(a.created_at || a.captured_at).getTime() - new Date(b.created_at || b.captured_at).getTime()
      );
      
      // Log the first and last points by time
      console.log(`First location by time (created_at): ID ${timeOrderedLocations[0]?.id}, time: ${timeOrderedLocations[0]?.created_at || timeOrderedLocations[0]?.captured_at}`);
      console.log(`Last location by time (created_at): ID ${timeOrderedLocations[timeOrderedLocations.length-1]?.id}, time: ${timeOrderedLocations[timeOrderedLocations.length-1]?.created_at || timeOrderedLocations[timeOrderedLocations.length-1]?.captured_at}`);
      
      // Get polyline points from time-ordered locations
      const polylinePoints = timeOrderedLocations.map(loc => [loc.latitude, loc.longitude]);
      
      // Create the polyline with the base path
      const polyline = L.polyline(polylinePoints as [number, number][], {
        color: '#228B22',
        weight: 4,
        opacity: 0.7
      }).addTo(map);
      
      // Add numbered markers for each location point based on time order
      timeOrderedLocations.forEach((loc, index) => {
        const markerPosition: [number, number] = [loc.latitude, loc.longitude];
        
        // Use different icons for start, end, and middle points (based on time order)
        let icon;
        if (index === 0) {
          icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div style="position: relative;">
                <div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 rgba(34, 197, 94, 0.4); animation: pulse-green 1.5s infinite; position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">1</div>
              </div>
              <style>
                @keyframes pulse-green {
                  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                  70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                }
              </style>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
        } else if (index === timeOrderedLocations.length - 1) {
          icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div style="position: relative;">
                <div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 rgba(239, 68, 68, 0.4); animation: pulse-red 1.5s infinite; position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">${index+1}</div>
              </div>
              <style>
                @keyframes pulse-red {
                  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
              </style>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
        } else {
          icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div style="position: relative;">
                <div style="background-color: #f97316; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">${index+1}</div>
              </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
        }
        
        const marker = L.marker(markerPosition, { icon }).addTo(map);
        
        // Format the timestamp
        const captureTime = new Date(loc.captured_at);
        const timeString = captureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateString = captureTime.toLocaleDateString();
        
        // Add when it was created to the popup
        const createdTime = loc.created_at ? new Date(loc.created_at) : null;
        const createdTimeString = createdTime ? createdTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
        const createdDateString = createdTime ? createdTime.toLocaleDateString() : 'N/A';
        
        // Add popup with more detailed information
        marker.bindPopup(`<div class="text-xs font-medium p-1">
          <div>Location ID: ${loc.id || 'N/A'}</div>
          <div class="font-bold" style="color: ${index === 0 ? '#22c55e' : index === timeOrderedLocations.length - 1 ? '#ef4444' : '#f97316'}">
            ${index === 0 ? '🟢 FIRST POINT (START)' : index === timeOrderedLocations.length - 1 ? '🔴 LAST POINT (END)' : `📍 Middle Point`}
          </div>
          <div class="font-bold" style="color: #333;">Sequence Number: ${index + 1} of ${timeOrderedLocations.length}</div>
          <div>Date captured: ${dateString}</div>
          <div>Time captured: ${timeString}</div>
          <div>Date created: ${createdDateString}</div>
          <div>Time created: ${createdTimeString}</div>
          <div>Coords: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}</div>
        </div>`);
      });
      
      // Fit map to show all markers
      try {
        if (polylinePoints.length > 0) {
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        } else if (timeOrderedLocations.length === 1) {
          map.setView([timeOrderedLocations[0].latitude, timeOrderedLocations[0].longitude], 15);
        }
      } catch (e) {
        console.error(`Error fitting bounds:`, e);
      }
      
      // Force map to update size after adding all elements
      setTimeout(() => {
        map.invalidateSize(true);
      }, 200);
    } catch (err) {
      console.error("Error rendering movement path:", err);
    }
  };

  // Process location data on mount
  useEffect(() => {
    // Reset states when component remounts or key changes
    setError(null);
    setLoading(true);
    setNoLocationData(false);
    
    mounted.current = true;
    console.log(`LeafletMap instance ${mapInstanceId.current} mounted for employee ${employeeId}, showPath=${showPath}, attendanceLogId=${attendanceLogId || 'none'}, key=${visibilityKey}, container=${containerType}`);
    
    // Fix Leaflet icons issue
    fixLeafletIcons();
    
    // Destroy any existing map to prevent duplicate instances
    if (mapRef.current) {
      try {
        mapRef.current.remove();
        mapRef.current = null;
      } catch (err) {
        console.error(`Error removing existing map:`, err);
      }
    }
    
    const processLocationData = async () => {
      try {
        // For path view, prioritize loading the path data
        if (showPath && attendanceLogId) {
          console.log(`Fetching locations for path view, attendanceLogId=${attendanceLogId}, today only`);
          
          // Get today's records only (false = today only)
          const todayRecords = await fetchEmployeeLocations(attendanceLogId, false);
          setTodayLocationsCount(todayRecords.length);
          console.log(`Found ${todayRecords.length} location records for today`);
          
          if (mounted.current) {
            if (todayRecords && todayRecords.length > 0) {
              // Use the first location from the path as the center point if we have path data
              setCoords([todayRecords[0].latitude, todayRecords[0].longitude]);
              setEmployeeLocations(todayRecords);
              setNoLocationData(false);
              console.log(`Set ${todayRecords.length} locations for employee map ${employeeId}`);
            } else {
              // No path data available for today - set no location data flag
              console.log(`No data found for today for employee ${employeeId}`);
              // Try to get current location as fallback for map center
              const latest = await fetchLatestEmployeeLocation(employeeId);
              if (latest) {
                setCoords([latest.latitude, latest.longitude]);
              } else {
                setCoords([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
              }
              setNoLocationData(true);
              setLoading(false);
            }
          }
          return; // Skip further processing since we're showing a path
        }
        
        // For current location view, process provided location or fetch it
        // Process location string if provided
        if (typeof location === 'string' && location) {
          const parts = location.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              setCoords([lat, lng]);
              return;
            }
          }
        }
        
        // Process location object if provided
        if (location && typeof location === 'object' && 'lat' in location && 'lng' in location) {
          setCoords([location.lat, location.lng]);
          return;
        }

        // Fetch latest location if no location provided
        if (!location) {
          const latest = await fetchLatestEmployeeLocation(employeeId);
          if (latest) {
            setCoords([latest.latitude, latest.longitude]);
          } else {
            // Use default if no location available
            setCoords([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
            if (mounted.current) {
              setNoLocationData(true);
          }
        }
        }
      } catch (err) {
        console.error(`Error processing location data for map ${mapInstanceId.current}:`, err);
        if (mounted.current) {
          setError(`Failed to load location data: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setLoading(false);
        }
      }
    };

    processLocationData();

    return () => {
      console.log(`LeafletMap instance ${mapInstanceId.current} unmounting for employee ${employeeId}`);
      mounted.current = false;
      
      // Clear map on unmount
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (err) {
          console.error(`Error removing map ${mapInstanceId.current} on unmount:`, err);
        }
      }
    };
  }, [employeeId, location, showPath, attendanceLogId, visibilityKey, containerType]);

  // Initialize map when coordinates are available
  useEffect(() => {
    if (!mounted.current || !coords) {
      return;
    }

    // Force a small delay to ensure DOM is fully updated
    const forceRenderTimeout = setTimeout(() => {
      if (!mounted.current) return;
      
      // Get the complete map ID using the container type
      const fullMapId = getMapId();
      console.log(`Forcing map render for ${fullMapId} with coords ${coords} (container: ${containerTypeRef.current})`);
    
    // Clean up any existing map
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (err) {
          console.error(`Error removing map:`, err);
      }
      mapRef.current = null;
    }

      // Try multiple methods to ensure the map initializes correctly
      const initMap = () => {
        try {
          // Generate the full map ID using the container type
          const fullMapId = getMapId();
          
          // Method 1: Direct DOM query for most reliable container reference
          const mapContainer = document.querySelector(`[data-map-id="${fullMapId}"]`);
          if (!mapContainer) {
            console.error(`Cannot find map container with ID ${fullMapId}`);
            
            // Try an emergency fallback approach - create container on the fly
            console.log("Attempting emergency container creation within initMap...");
            
            // Attempt to find the wrapper element
            const wrapperId = `map-wrapper-${visibilityKey}-${containerTypeRef.current}`;
            const wrapper = document.getElementById(wrapperId);
            
            if (wrapper) {
              console.log(`Found wrapper with ID ${wrapperId}, creating container`);
              
              // Clear existing content
              wrapper.innerHTML = '';
              
              // Create a new container
              const newContainer = document.createElement('div');
              newContainer.setAttribute('data-map-id', fullMapId);
              newContainer.className = 'h-full w-full';
              newContainer.style.width = '100%';
              newContainer.style.height = '350px';
              newContainer.style.position = 'relative';
              newContainer.style.display = 'block';
              newContainer.style.visibility = 'visible';
              newContainer.style.zIndex = '1000';
              newContainer.style.backgroundColor = '#f0f0f0';
              newContainer.style.overflow = 'hidden';
              
              // Add it to the wrapper
              wrapper.appendChild(newContainer);
              
              // Try to use this container
              return initMapInContainer(newContainer);
            }
            
            return false;
          }
          
          return initMapInContainer(mapContainer);
        } catch (err: any) {
          console.error(`Map initialization error:`, err);
          if (mounted.current) {
            setError(`Failed to initialize map: ${err.message}`);
            setLoading(false);
          }
          return false;
        }
      };
      
      // Helper function to init map in a given container
      const initMapInContainer = (container: Element) => {
        console.log(`Creating map in container:`, container);
        
        // Force container to be ready for map with very explicit styling
        const containerElement = container as HTMLElement;
        containerElement.style.width = '100%';
        containerElement.style.height = '350px';
        containerElement.style.position = 'relative';
        containerElement.style.display = 'block';
        containerElement.style.visibility = 'visible';
        containerElement.style.opacity = '1';
        containerElement.style.zIndex = '1';
        containerElement.style.overflow = 'hidden';
        
        // Create the map with explicit options
        const map = L.map(containerElement, {
          center: coords,
          zoom: 13,
          zoomControl: true,
          attributionControl: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        });
        
        // Add the tile layer (use a different tile provider as fallback)
        const mainTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          minZoom: 2
        });
        
        // Add tile layer to map
        mainTileLayer.addTo(map);
        
        // Force map size update
        setTimeout(() => {
          map.invalidateSize(true);
        }, 200);
        
        // Rest of your map path rendering code...
        renderMapContent(map);
        
        // Store reference and update state
        mapRef.current = map;
        if (mounted.current) {
        setLoading(false);
        setError(null);
        }
        
        console.log(`Map initialized successfully with dimensions ${containerElement.clientWidth}x${containerElement.clientHeight}`);
        return true;
      };
      
      // Function to render map content (markers, paths, etc.)
      const renderMapContent = (map: L.Map) => {
        // Add marker for current position if we're not showing a path
        if (!showPath) {
          L.marker(coords).addTo(map);
        }
        
        // Add path if showing path and we have locations
        if (employeeLocations.length > 0 && showPath) {
          renderMovementPath(map, employeeLocations);
        }
      };
      
      // Try to initialize the map, and if it fails, retry after a delay
      if (!initMap()) {
        console.log("First attempt to create map failed, retrying in 500ms...");
        setTimeout(() => {
          if (mounted.current && !initMap()) {
            console.log("Second attempt to create map failed, retrying in 1000ms...");
            setTimeout(() => {
              if (mounted.current) initMap();
            }, 1000);
          }
        }, 500);
      }
        
    }, 500); // Longer delay to ensure DOM is ready
    
    // Cleanup function
    return () => {
      clearTimeout(forceRenderTimeout);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (err) {
          console.error(`Error cleaning up map:`, err);
        }
        mapRef.current = null;
      }
    };
  }, [coords, employeeId, showPath, employeeLocations, containerTypeRef.current]); // Add containerTypeRef.current to dependencies

  // Add a fresh map initialization when the component mounts from a tab switch
  useEffect(() => {
    // Only run this effect when we come back from a tab change
    if (visibilityKey && coords && containerRef.current && !isEmergencyMapActive) {
      console.log('Fresh initialization after visibility change');
      
      // Wait for React to finish rendering the component
      setTimeout(() => {
        try {
          // Get the container element
    const container = containerRef.current;
          if (!container) return;
          
          // Force the container to be visible
    container.style.width = '100%';
          container.style.height = '350px';
          container.style.display = 'block';
          container.style.visibility = 'visible';
          
          // Check if map already exists
          if (mapRef.current) {
            try {
              mapRef.current.remove();
            } catch (err) { /* ignore */ }
            mapRef.current = null;
          }
          
          // Create a new map
          console.log('Creating emergency map after tab change');
        const map = L.map(container, {
          center: coords,
          zoom: 13
        });
        
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        
          // Force update size
          setTimeout(() => map.invalidateSize(true), 100);
          
          // Store the map reference
          mapRef.current = map;
          setLoading(false);
        } catch (err) {
          console.error('Emergency map creation failed:', err);
        }
      }, 500);
    }
  }, [visibilityKey, isEmergencyMapActive]);

  // Create a more robust map container ID system based on both instance ID and container type
  useEffect(() => {
    // When containerType changes, we need to force a complete re-initialization
    if (mapRef.current) {
      try {
        mapRef.current.remove();
        mapRef.current = null;
      } catch (err) { /* ignore */ }
    }
    
    // Force a re-render with new visibility key when tab type changes
    setVisibilityKey(Date.now());
    
    // Update our ref
    containerTypeRef.current = containerType;
    console.log(`Container type changed to ${containerType}, forcing re-initialization`);
    
    // Reset emergency map flag
    setIsEmergencyMapActive(false);
  }, [containerType]);

  // Create a more specific ID for the map container based on both instance ID and container type
  const getMapId = () => `${mapInstanceId.current}-${containerTypeRef.current}`;

  // Update how we select map containers to use the complete ID
  const createEmergencyMap = (locations: EmployeeLocation[] = []) => {
    try {
      // Check if we already have an emergency map active
      if (isEmergencyMapActive) {
        console.log("Emergency map already active, skipping creation");
        return true;
      }
      
      // Set flag to prevent duplicate maps
      setIsEmergencyMapActive(true);
      
      // Get the current containerType from the ref for consistency
      const currentContainerType = containerTypeRef.current;
      console.log(`Creating emergency map for container type: ${currentContainerType}`);
      
      // Generate the complete map ID for this container type
      const fullMapId = getMapId();
      
      // Log the IDs we're using to help with debugging
      console.log(`Searching for container with data-map-id="${fullMapId}"`);
      
      // Do a more thorough cleanup of existing map elements
      document.querySelectorAll('.leaflet-container').forEach(elm => {
        try {
          elm.remove();
        } catch (e) { /* ignore */ }
      });
      
      // Also remove any previous emergency containers
      document.querySelectorAll('[id^="fallback-"]').forEach(container => {
        try {
          container.remove();
        } catch (e) { /* ignore */ }
      });
      
      // Look for container using more specific selector with the complete map ID
      const mapContainer = document.querySelector(`[data-map-id="${fullMapId}"]`);
      
      if (!mapContainer) {
        console.error(`Cannot find map container for emergency creation (ID: ${fullMapId}, type: ${currentContainerType})`);
        
        // Try to find the wrapper first
        const wrapperId = `map-wrapper-${visibilityKey}-${currentContainerType}`;
        const wrapper = document.getElementById(wrapperId);
        
        if (wrapper) {
          console.log(`Found wrapper ${wrapperId}, creating emergency container inside it`);
          
          // Clear wrapper
          wrapper.innerHTML = '';
          
          // Create container
          const emergencyContainer = document.createElement('div');
          emergencyContainer.setAttribute('data-map-id', fullMapId);
          emergencyContainer.setAttribute('data-emergency', 'true');
          emergencyContainer.className = 'h-full w-full';
          emergencyContainer.style.width = '100%';
          emergencyContainer.style.height = '350px';
          emergencyContainer.style.display = 'block';
          emergencyContainer.style.visibility = 'visible';
          
          wrapper.appendChild(emergencyContainer);
          
          // Now try to create the map in this container
          return createMapInContainer(emergencyContainer, locations);
        }
        
        // CRITICAL FIX: Create container if it doesn't exist
        console.log("Creating fallback container for map");
        const fallbackId = `fallback-${Math.random().toString(36).substring(2, 9)}`;
        
        // Find a better location to insert the fallback based on containerType
        let targetContainer;
        
        // Look for tab-specific containers
        if (currentContainerType === 'current-location') {
          // Try to find current location specific containers
          targetContainer = document.querySelector('[data-tab="current-location"]') || 
                            document.querySelector('.current-location-container') ||
                            document.querySelector('[role="tabpanel"][aria-selected="true"]');
        } else {
          // Try to find movement path specific containers
          targetContainer = document.querySelector('[data-tab="movement-path"]') || 
                            document.querySelector('.movement-path-container') ||
                            document.querySelector('[role="tabpanel"][aria-selected="true"]');
        }
        
        // If specific container not found, try more generic options
        if (!targetContainer) {
          const tabPanels = document.querySelectorAll('[role="tabpanel"]');
          // Try to get the active tab panel
          tabPanels.forEach(panel => {
            if (window.getComputedStyle(panel).display !== 'none') {
              targetContainer = panel;
            }
          });
          
          // If still not found, fall back to general containers
          if (!targetContainer) {
            const mainContent = document.querySelector('main') || document.querySelector('.main-content');
            targetContainer = mainContent || document.body;
          }
        }
        
        // Log what container we found
        console.log(`Using fallback container:`, targetContainer);
        
        // Create container that fits within the app layout instead of overlay
        const fallbackContainer = document.createElement('div');
        fallbackContainer.id = fallbackId;
        fallbackContainer.setAttribute('data-map-id', fullMapId);
        fallbackContainer.setAttribute('data-container-type', currentContainerType);
        fallbackContainer.setAttribute('data-tab-content', 'true');
        fallbackContainer.setAttribute('role', 'tabpanel');
        fallbackContainer.className = `map-container ${currentContainerType}-map w-full`;
        
        // Make the fallback container fully visible with important flags
        fallbackContainer.style.display = 'block !important';
        fallbackContainer.style.visibility = 'visible !important';
        fallbackContainer.style.opacity = '1 !important';
        fallbackContainer.style.height = '350px !important';
        fallbackContainer.style.width = '100% !important';
        fallbackContainer.style.zIndex = '100';
        fallbackContainer.style.backgroundColor = '#f0f0f0';
        fallbackContainer.style.border = '1px solid #ddd';
        fallbackContainer.style.borderRadius = '4px';
        fallbackContainer.style.overflow = 'hidden';
        
        // Style it to fit in the existing layout, not as a fixed overlay
        if (targetContainer === document.body) {
          // Only use fixed positioning if we have to add to body
          fallbackContainer.style.position = 'fixed';
          fallbackContainer.style.top = '50%';
          fallbackContainer.style.left = '50%';
          fallbackContainer.style.transform = 'translate(-50%, -50%)';
          fallbackContainer.style.maxWidth = '90%';
          
          // Only add close button if we're in a modal/overlay situation
          const closeButtonWrapper = document.createElement('div');
          closeButtonWrapper.style.position = 'absolute';
          closeButtonWrapper.style.top = '10px';
          closeButtonWrapper.style.right = '10px';
          closeButtonWrapper.style.zIndex = '1001';
          closeButtonWrapper.style.backgroundColor = 'white';
          closeButtonWrapper.style.borderRadius = '50%';
          closeButtonWrapper.style.width = '30px';
          closeButtonWrapper.style.height = '30px';
          closeButtonWrapper.style.display = 'flex';
          closeButtonWrapper.style.alignItems = 'center';
          closeButtonWrapper.style.justifyContent = 'center';
          closeButtonWrapper.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
          closeButtonWrapper.style.cursor = 'pointer';
          
          const closeButton = document.createElement('span');
          closeButton.innerHTML = '×';
          closeButton.style.fontSize = '24px';
          closeButton.style.lineHeight = '1';
          closeButton.style.fontWeight = 'bold';
          closeButton.style.color = '#666';
          
          closeButtonWrapper.appendChild(closeButton);
          fallbackContainer.appendChild(closeButtonWrapper);
          
          // Add event listener to close button
          closeButtonWrapper.addEventListener('click', () => {
            try {
              console.log("Closing emergency map");
              // First remove the map
              if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
              }
              // Then remove the container
              fallbackContainer.remove();
              
              // Reset the emergency map flag
              setIsEmergencyMapActive(false);
              
              // Force re-render to try normal initialization
              setVisibilityKey(Date.now());
          } catch (e) {
              console.error("Error closing emergency map:", e);
            }
          });
        } else {
          // Otherwise, use normal positioning within the parent
          fallbackContainer.style.position = 'relative';
          fallbackContainer.style.margin = '1rem auto';
          fallbackContainer.style.width = '100%';
        }
        
        fallbackContainer.style.height = '350px';
        fallbackContainer.style.zIndex = '100';
        fallbackContainer.style.backgroundColor = '#f0f0f0';
        fallbackContainer.style.border = '1px solid #ddd';
        fallbackContainer.style.borderRadius = '4px';
        fallbackContainer.style.overflow = 'hidden';
        
        // Add a header to indicate this is an emergency view only if we need to
        // distinguish the map in the current context
        if (targetContainer === document.body) {
          const header = document.createElement('div');
          header.style.padding = '8px';
          header.style.backgroundColor = '#e7f5e7';
          header.style.borderBottom = '1px solid #ccc';
          header.style.fontSize = '14px';
          header.style.fontWeight = 'bold';
          header.style.color = '#228B22';

          // Log the container type to help debug
          console.log(`Creating header for container type: ${currentContainerType}`);

          // Make title determination more explicit
          let mapTitle = 'Map';
          if (currentContainerType === 'current-location') {
            mapTitle = 'Current Location Map';
          } else if (currentContainerType === 'movement-path') {
            mapTitle = 'Movement Path Map';
          } else {
            // If containerType is not one of the expected values, infer from showPath
            mapTitle = showPath ? 'Movement Path Map' : 'Current Location Map';
          }

          header.textContent = mapTitle;
          fallbackContainer.appendChild(header);
        }
        
        // Add a div to contain the actual map
        const mapDiv = document.createElement('div');
        mapDiv.id = `map-content-${fallbackId}`;
        mapDiv.style.width = '100%';
        mapDiv.style.height = targetContainer === document.body ? 'calc(100% - 32px)' : '100%';
        
        fallbackContainer.appendChild(mapDiv);
        
        // Add it to the target container
        targetContainer.appendChild(fallbackContainer);
        
        // Create map in this fallback container
        setTimeout(() => {
          const container = document.getElementById(`map-content-${fallbackId}`);
          if (container) {
            return createMapInContainer(container, locations);
          }
          return false;
    }, 100);
    
        return false;
      }
      
      return createMapInContainer(mapContainer, locations);
    } catch (err) {
      console.error("Emergency map creation failed:", err);
      setIsEmergencyMapActive(false);
      return false;
    }
  };
  
  // Helper function to create a map in a container
  const createMapInContainer = (container: Element, locations: EmployeeLocation[] = []) => {
    try {
      // Ensure all parents are visible by walking up the DOM
      let parent = (container as HTMLElement).parentElement;
      while (parent) {
        // Force all parent elements to be visible
        parent.style.display = 'block';
        parent.style.visibility = 'visible';
        parent.style.opacity = '1';
        
        // Check for specific tab panel elements and make them active
        if (parent.getAttribute('role') === 'tabpanel') {
          parent.setAttribute('aria-selected', 'true');
          parent.style.display = 'block';
          
          // If this is a tabpanel, also make sure its tab is active
          const tabValue = parent.getAttribute('data-state');
          if (tabValue) {
            const tabTriggers = document.querySelectorAll('[role="tab"]');
            tabTriggers.forEach(tab => {
              if (tab.getAttribute('data-value') === tabValue) {
                tab.setAttribute('data-state', 'active');
                tab.setAttribute('aria-selected', 'true');
              }
            });
          }
        }
        
        parent = parent.parentElement;
      }
      
      // Ensure clean container
      (container as HTMLElement).innerHTML = '';
      
      // Style container aggressively to ensure visibility
      const containerElement = container as HTMLElement;
      
      // Force element to be fully visible and properly sized
      containerElement.style.width = '100%';
      containerElement.style.height = '350px';
      containerElement.style.position = 'relative';
      containerElement.style.display = 'block';
      containerElement.style.visibility = 'visible';
      containerElement.style.opacity = '1';
      containerElement.style.zIndex = '1000';
      containerElement.style.backgroundColor = '#f0f0f0';
      containerElement.style.overflow = 'hidden';
      
      // Log dimensions to help with debugging
      console.log(`Creating map in container (dims: ${containerElement.clientWidth}x${containerElement.clientHeight})`, containerElement);
      
      // Log container details
      console.log(`Map container details:`, {
        id: containerElement.id,
        dataMapId: containerElement.getAttribute('data-map-id'),
        containerType: containerElement.getAttribute('data-container-type'),
        width: containerElement.clientWidth,
        height: containerElement.clientHeight,
        display: window.getComputedStyle(containerElement).display,
        visibility: window.getComputedStyle(containerElement).visibility,
        parent: containerElement.parentElement?.tagName
      });
      
      // Create map with center point
      let mapCenter: [number, number];
      if (coords) {
        mapCenter = coords;
      } else if (locations && locations.length > 0) {
        mapCenter = [locations[0].latitude, locations[0].longitude];
      } else {
        mapCenter = [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];
      }
      
      // Create a unique ID for the actual map element
      const mapElementId = `map-element-${Math.random().toString(36).substring(2, 9)}`;
      const mapElement = document.createElement('div');
      mapElement.id = mapElementId;
      mapElement.style.width = '100%';
      mapElement.style.height = '100%';
      containerElement.appendChild(mapElement);
      
      // First ensure container is in the visible DOM by checking offsetParent
      if (!containerElement.offsetParent) {
        console.warn('Container may not be visible in DOM - forcing display properties');
        containerElement.style.position = 'relative';
        containerElement.style.display = 'block';
        containerElement.style.visibility = 'visible';
        containerElement.style.opacity = '1';
        
        // Force the container into the visible viewport
        let currentElement = containerElement;
        let isHidden = false;
        
        // Walk up the DOM to check if any parent is hidden
        while (currentElement && currentElement !== document.body) {
          const style = window.getComputedStyle(currentElement);
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
            isHidden = true;
            break;
          }
          currentElement = currentElement.parentElement as HTMLElement;
        }
        
        // If we're hidden in the DOM, create a temporary container
        if (isHidden) {
          console.warn('Container is hidden in DOM, creating temporary visible container');
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'fixed';
          tempContainer.style.top = '0';
          tempContainer.style.left = '0';
          tempContainer.style.width = '100%';
          tempContainer.style.height = '100%';
          tempContainer.style.zIndex = '10000';
          tempContainer.style.backgroundColor = '#fff';
          tempContainer.style.padding = '20px';
          
          const mapDiv = document.createElement('div');
          mapDiv.style.width = '100%';
          mapDiv.style.height = '350px';
          tempContainer.appendChild(mapDiv);
          
          document.body.appendChild(tempContainer);
          
          // Create map in temporary container
          createMapInTempContainer(mapDiv, locations, mapCenter);
          
          // Add close button
          const closeButton = document.createElement('button');
          closeButton.textContent = 'Close Map';
          closeButton.style.marginTop = '10px';
          closeButton.style.padding = '5px 10px';
          closeButton.style.backgroundColor = '#228B22';
          closeButton.style.color = 'white';
          closeButton.style.border = 'none';
          closeButton.style.borderRadius = '4px';
          closeButton.style.cursor = 'pointer';
          
          closeButton.addEventListener('click', () => {
            document.body.removeChild(tempContainer);
            if (mapRef.current) {
          mapRef.current.remove();
              mapRef.current = null;
            }
          });
          
          tempContainer.appendChild(closeButton);
          return true;
        }
      }
      
      // Wait a tiny bit to ensure DOM is ready
      setTimeout(() => {
        createMapInElement(mapElement, locations, mapCenter);
      }, 50);
      
      return true;
        } catch (err) {
      console.error("Error creating map in container:", err);
      return false;
    }
  };

  // Create map in a specified element
  const createMapInElement = (element: HTMLElement, locations: EmployeeLocation[], mapCenter: [number, number]) => {
    try {
      // Create new map instance with explicit options for reliability
      const map = L.map(element, {
        center: mapCenter,
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
      });
      
      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 3
      }).addTo(map);
      
      // Force size update immediately
      map.invalidateSize(true);
      
      // Store map reference
      mapRef.current = map;
      
      // Render path data if we have location data
      if (locations.length > 0 && showPath) {
        console.log("Adding path data to emergency map:", locations.length, "points");
        renderMovementPath(map, locations);
      } else if (!showPath) {
        // Add a simple marker for current location view
        L.marker(mapCenter).addTo(map);
      }
      
      // Force another size update after content is added
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize(true);
        }
      }, 200);
      
      // Force loading state to false
      setLoading(false);
      
      console.log("Map created successfully in container:", element.id);
      return true;
    } catch (e) {
      console.error("Error creating map:", e);
      return false;
    }
  };
  
  // Create map in temporary container
  const createMapInTempContainer = (element: HTMLElement, locations: EmployeeLocation[], mapCenter: [number, number]) => {
    try {
      createMapInElement(element, locations, mapCenter);
      // Add a notice that this is a fallback map
      const notice = document.createElement('div');
      notice.textContent = 'Fallback Map View - Container visibility issue detected';
      notice.style.backgroundColor = '#FFF3CD';
      notice.style.color = '#856404';
      notice.style.padding = '8px';
      notice.style.marginTop = '10px';
      notice.style.borderRadius = '4px';
      notice.style.fontSize = '14px';
      element.parentElement?.appendChild(notice);
      return true;
    } catch (e) {
      console.error("Error creating map in temp container:", e);
      return false;
    }
  };

  // Add a MutationObserver to detect tab panel changes
  useEffect(() => {
    // Function to handle tab panel visibility changes
    const observeTabPanels = () => {
      try {
        // Create a mutation observer to watch for tab changes
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'data-state' || 
                 mutation.attributeName === 'aria-selected' ||
                 mutation.attributeName === 'style')) {
              
              const target = mutation.target as HTMLElement;
              const containerType = target.getAttribute('data-tab');
              
              // Check if this is our container type and it's now active
              if (containerType === containerTypeRef.current) {
                const isVisible = window.getComputedStyle(target).display !== 'none';
                console.log(`Tab panel for ${containerType} visibility changed to ${isVisible ? 'visible' : 'hidden'}`);
                
                if (isVisible) {
                  // If our container is now visible, reinitialize the map
                  console.log('Our tab panel is now visible, forcing map redraw');
                  
                  // Force cleanup of any existing map
                  if (mapRef.current) {
                    try {
                      mapRef.current.remove();
        mapRef.current = null;
                    } catch (e) { /* ignore */ }
                  }
                  
                  // Force a redraw after a small delay
                  setTimeout(() => {
                    if (mounted.current) {
                      // Using emergency map creation as it's most reliable
                      createEmergencyMap(employeeLocations);
                    }
                  }, 100);
                }
              }
            }
          });
        });
        
        // Observe all tab panels
        const tabPanels = document.querySelectorAll('[role="tabpanel"]');
        const config = { attributes: true, childList: false, subtree: false };
        
        tabPanels.forEach(panel => {
          observer.observe(panel, config);
        });
        
        // Also observe all tab triggers
        const tabTriggers = document.querySelectorAll('[role="tab"]');
        tabTriggers.forEach(tab => {
          observer.observe(tab, config);
        });
        
        return () => {
          observer.disconnect();
        };
      } catch (e) {
        console.error('Error setting up tab observer:', e);
      }
    };
    
    // Start observing after a delay to let the DOM settle
    const timerId = setTimeout(observeTabPanels, 1000);
    
    return () => {
      clearTimeout(timerId);
    };
  }, [containerTypeRef.current, employeeLocations]); // Re-run if container type changes
  
  // Add direct DOM manipulation to force our tab to be active - this is a last resort approach
  useEffect(() => {
    const forceTabActive = () => {
      try {
        // Only do this if our map isn't showing
        if (mapRef.current) return;
        
        // Find all tab triggers
        const tabTriggers = Array.from(document.querySelectorAll('[role="tab"]'));
        
        // Find the trigger for our tab
        const ourTabTrigger = tabTriggers.find(tab => {
          // Look for the tab that would show our container type
          const value = tab.getAttribute('data-value');
          if (value === 'path' && containerTypeRef.current === 'movement-path') return true;
          if (value === 'current' && containerTypeRef.current === 'current-location') return true;
          return false;
        });
        
        if (ourTabTrigger) {
          console.log(`Found our tab trigger for ${containerTypeRef.current}:`, ourTabTrigger);
          
          // Check if our tab is already active
          const isActive = ourTabTrigger.getAttribute('data-state') === 'active';
          
          if (!isActive) {
            console.log(`Our tab is not active, manually activating it`);
            
            // Get all tab panels
            const tabPanels = document.querySelectorAll('[role="tabpanel"]');
            
            // Set all triggers and panels to inactive
            tabTriggers.forEach(trigger => {
              trigger.setAttribute('data-state', 'inactive');
              trigger.setAttribute('aria-selected', 'false');
            });
            
            tabPanels.forEach(panel => {
              panel.setAttribute('data-state', 'inactive');
              (panel as HTMLElement).style.display = 'none';
            });
            
            // Set our trigger and panel to active
            ourTabTrigger.setAttribute('data-state', 'active');
            ourTabTrigger.setAttribute('aria-selected', 'true');
            
            // Find our panel
            const dataValue = ourTabTrigger.getAttribute('data-value');
            const ourPanel = Array.from(tabPanels).find(panel => {
              return panel.getAttribute('data-state') === dataValue;
            });
            
            if (ourPanel) {
              console.log(`Found our panel, activating it`);
              ourPanel.setAttribute('data-state', 'active');
              (ourPanel as HTMLElement).style.display = 'block';
              
              // Force visibility on all our elements
              const ourMapContainer = ourPanel.querySelector(`[data-container-type="${containerTypeRef.current}"]`);
              if (ourMapContainer) {
                (ourMapContainer as HTMLElement).style.display = 'block';
                (ourMapContainer as HTMLElement).style.visibility = 'visible';
                (ourMapContainer as HTMLElement).style.opacity = '1';
                
                // Force map creation
                setTimeout(() => {
                  if (mounted.current) {
                    createEmergencyMap(employeeLocations);
                  }
                }, 100);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error in forceTabActive:', e);
      }
    };
    
    // If we're in the movement path tab and no map is showing, try to force it
    if (containerTypeRef.current === 'movement-path' && !mapRef.current) {
      const timerId = setTimeout(forceTabActive, 1500);
      return () => clearTimeout(timerId);
    }
  }, [containerTypeRef.current, employeeLocations, visibilityKey]);
  
  return (
    <div 
      className={`relative h-full w-full ${containerTypeRef.current}-container`}
      id={`map-wrapper-${visibilityKey}-${containerTypeRef.current}`}
      key={`map-wrapper-${visibilityKey}-${containerTypeRef.current}`}
      data-tab={containerTypeRef.current}
      data-map-wrapper="true"
      data-visibility-key={visibilityKey}
      style={{ 
        minHeight: "350px",
        background: "#f0f0f0",
        display: "block",
        position: "relative", 
        zIndex: 1,
        visibility: "visible",
        opacity: 1
      }}
    >
      {showPath && todayLocationsCount === 0 && !loading && (
        <div className="absolute right-2 top-2 z-10 bg-white px-2 py-1 rounded shadow-md">
          <div className="text-xs text-amber-600">
            No location data for today
          </div>
        </div>
      )}
      
      {error && (
        <div className="h-full w-full flex items-center justify-center bg-gray-100 p-4">
          <div className="text-red-500 text-center">
            <p className="font-medium">Error loading map</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {noLocationData && !error && !loading && (
        <div className="h-full w-full flex items-center justify-center bg-gray-100 p-4">
          <div className="text-amber-600 text-center">
            <p className="font-medium">No location data found for today</p>
            <p className="text-sm mt-1">
              {showPath 
                ? "This employee has no movement history recorded today." 
                : "Location data will appear when the employee checks in."}
            </p>
          </div>
        </div>
      )}
      
      {loading && !error && !noLocationData && (
        <div className="h-full w-full flex items-center justify-center bg-gray-100">
          <div className="animate-spin h-8 w-8 border-4 border-[#228B22] border-opacity-50 border-t-[#228B22] rounded-full"></div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        data-map-id={getMapId()}
        data-container-type={containerTypeRef.current}
        data-instance-id={mapInstanceId.current}
        data-visibility-key={visibilityKey}
        id={`map-container-${getMapId()}`}
        className="h-full w-full" 
        style={{
          display: (!error && !loading && !noLocationData) ? 'block' : 'none',
          height: '350px',
          width: '100%',
          position: 'relative',
          background: '#f0f0f0',
          visibility: 'visible',
          opacity: 1,
          overflow: 'hidden',
          zIndex: 10
        }}
      />
      
      {/* Special marker to inject map directly if React approach fails */}
      <div 
        id={`emergency-container-${getMapId()}`}
        data-map-id={`emergency-${getMapId()}`}
        data-container-type={containerTypeRef.current}
        data-instance-id={mapInstanceId.current}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '350px',
          zIndex: 5,
          display: 'none'
        }}
      ></div>
      
      {/* Adding debug info in dev environment */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="hidden absolute bottom-0 right-0 bg-white text-xs p-1 rounded-tl">
          ContainerType: {containerTypeRef.current}, ID: {getMapId()}
        </div>
      )}
    </div>
  );
};

// Ensure component is only rendered client-side
export default dynamic(() => Promise.resolve(LeafletMap), {
  ssr: false
});