import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const LeafletMapWebView = forwardRef((props, ref) => {
  const webViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    setLocation: (latitude, longitude, zoom = 15) => {
      if (mapReady) {
        sendMessage({
          type: 'SET_LOCATION',
          lat: latitude,
          lng: longitude,
          zoom: zoom
        });
      }
    },
    addMarker: (latitude, longitude, popup) => {
      if (mapReady) {
        sendMessage({
          type: 'ADD_MARKER',
          lat: latitude,
          lng: longitude,
          popup: popup || 'Custom Marker'
        });
      }
    }
  }));

  // HTML content with enhanced Leaflet.js
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Leaflet Map</title>
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
          crossorigin=""/>
    
    <!-- Leaflet JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" 
            crossorigin=""></script>
    
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif;
        }
        #map { 
            height: 100vh; 
            width: 100vw; 
        }
        .info-panel {
            position: absolute;
            top: 10px;
            right: 10px;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            font-size: 12px;
        }
        .tap-hint {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 15px;
            font-size: 11px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="info-panel">
        <div>Lat: <span id="lat">-</span></div>
        <div>Lng: <span id="lng">-</span></div>
        <div>Zoom: <span id="zoom">-</span></div>
        <div>Markers: <span id="markerCount">0</span></div>
    </div>
    
    <div class="tap-hint">
        Tap to set marker location
    </div>
    
    <div id="map"></div>

    <script>
        let map;
        let currentMarker = null;

        // Initialize the map
        function initMap() {
            map = L.map('map').setView([37.7749, -122.4194], 13); // Default to San Francisco

            // Add OpenStreetMap tiles
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Update info panel
            updateInfo();
            
            // Listen for map events
            map.on('moveend zoomend', updateInfo);
            
            // Handle map clicks - this replaces the current marker
            map.on('click', function(e) {
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                
                // Remove existing marker if it exists
                if (currentMarker) {
                    map.removeLayer(currentMarker);
                }
                
                // Add new marker at clicked location
                currentMarker = L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(\`<strong>Selected Location</strong><br>Lat: \${lat.toFixed(6)}<br>Lng: \${lng.toFixed(6)}\`)
                    .openPopup();
                
                updateInfo();
                
                // Send coordinates back to React Native
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                    JSON.stringify({
                        type: 'MAP_TAP',
                        latitude: lat,
                        longitude: lng
                    })
                );
            });

            // Notify React Native that map is ready
            setTimeout(() => {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                    JSON.stringify({ type: 'MAP_READY' })
                );
            }, 1000);
        }

        // Update info panel
        function updateInfo() {
            const center = map.getCenter();
            document.getElementById('lat').textContent = center.lat.toFixed(4);
            document.getElementById('lng').textContent = center.lng.toFixed(4);
            document.getElementById('zoom').textContent = map.getZoom();
            document.getElementById('markerCount').textContent = currentMarker ? '1' : '0';
        }

        // Handle messages from React Native
        function handleMessage(data) {
            switch(data.type) {
                case 'SET_LOCATION':
                    // Remove previous location marker if it exists
                    if (currentMarker) {
                        map.removeLayer(currentMarker);
                    }
                    
                    // Set map view to new location
                    map.setView([data.lat, data.lng], data.zoom || 15);
                    
                    // Add a special marker for current location
                    currentMarker = L.marker([data.lat, data.lng], {
                        // You could use a custom icon here
                    })
                    .addTo(map)
                    .bindPopup(\`<strong>Current Location</strong><br>Lat: \${data.lat.toFixed(6)}<br>Lng: \${data.lng.toFixed(6)}\`)
                    .openPopup();
                    
                    // Send confirmation back to React Native
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                        JSON.stringify({
                            type: 'LOCATION_SET',
                            latitude: data.lat,
                            longitude: data.lng
                        })
                    );
                    break;
                    
                case 'ADD_MARKER':
                    // Remove existing marker if it exists
                    if (currentMarker) {
                        map.removeLayer(currentMarker);
                    }
                    
                    currentMarker = L.marker([data.lat, data.lng])
                        .addTo(map)
                        .bindPopup(data.popup || 'Custom Marker');
                    
                    updateInfo();
                    break;
                    
                case 'CLEAR_MARKERS':
                    // Clear the single marker
                    if (currentMarker) {
                        map.removeLayer(currentMarker);
                        currentMarker = null;
                    }
                    updateInfo();
                    break;
                    
                case 'GET_CENTER':
                    const center = map.getCenter();
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CENTER_RESPONSE',
                        lat: center.lat,
                        lng: center.lng,
                        zoom: map.getZoom()
                    }));
                    break;
            }
        }

        // Listen for messages from React Native
        document.addEventListener('message', function(e) {
            const data = JSON.parse(e.data);
            handleMessage(data);
        });

        // For Android compatibility
        window.addEventListener('message', function(e) {
            const data = JSON.parse(e.data);
            handleMessage(data);
        });

        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initMap);
        
        // Fallback initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
        } else {
            initMap();
        }
    </script>
</body>
</html>`;

  // Handle messages from WebView
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch(data.type) {
        case 'MAP_READY':
          setMapReady(true);
          console.log('Map is ready!');
          break;
          
        case 'MAP_TAP':
          // Call the callback function passed from parent
          if (props.onMapTap) {
            props.onMapTap({
              latitude: data.latitude,
              longitude: data.longitude,
              markerCount: data.markerCount
            });
          }
          break;
          
        case 'LOCATION_SET':
          if (props.onLocationSet) {
            props.onLocationSet({
              latitude: data.latitude,
              longitude: data.longitude
            });
          }
          break;
          
        case 'CENTER_RESPONSE':
          if (props.onCenterReceived) {
            props.onCenterReceived({
              latitude: data.lat,
              longitude: data.lng,
              zoom: data.zoom
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  // Send message to WebView
  const sendMessage = (message) => {
    if (webViewRef.current && mapReady) {
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mixedContentMode="compatibility"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
  },
});

export default LeafletMapWebView;
