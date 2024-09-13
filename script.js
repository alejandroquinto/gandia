// Replace with your actual Mapbox access token
const mapboxAccessToken = 'pk.eyJ1IjoiYWxlamFuZHJvcXVpbnRvIiwiYSI6ImNseDZxbGFpcjE1ZHMyanNjZWg1eDIzejkifQ.VYiLvOBYgX5WwchhqO0I8w';

// Initialize the map and set its view to Gandia, Spain
const map = L.map('map').setView([38.9673, -0.1819], 14); // Gandia coordinates

// Add a Mapbox tile layer to the map using your custom style URL
L.tileLayer('https://api.mapbox.com/styles/v1/alejandroquinto/clx6qpcs501oi01qs5a078p85/tiles/{z}/{x}/{y}?access_token=' + mapboxAccessToken, {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> contributors',
    tileSize: 512,
    zoomOffset: -1
}).addTo(map);

// Add Leaflet Control Geocoder for search functionality
L.Control.geocoder({
    defaultMarkGeocode: false
})
.on('markgeocode', function(e) {
    const bbox = e.geocode.bbox;
    const poly = L.polygon([
        [bbox.getSouthEast().lat, bbox.getSouthEast().lng],
        [bbox.getNorthEast().lat, bbox.getNorthEast().lng],
        [bbox.getNorthWest().lat, bbox.getNorthWest().lng],
        [bbox.getSouthWest().lat, bbox.getSouthWest().lng]
    ]).addTo(map);
    map.fitBounds(poly.getBounds());
})
.addTo(map);

// Initialize an empty layer group for swimming pool markers
const poolLayer = L.layerGroup().addTo(map);

// Load GeoJSON data for Gandia boundary
fetch('gandia-boundary.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function (feature) {
                return {
                    color: 'red',  // Line color
                    weight: 3,     // Line width
                    fillOpacity: 0 // Remove fill by setting fill opacity to 0
                };
            }
        }).addTo(map);
    })
    .catch(error => console.error('Error loading GeoJSON boundary data:', error));

// Load GeoJSON data for Building Footprints
fetch('building-gandia.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function (feature) {
                return {
                    color: '#dedfe0',  // Building footprints color
                    weight: 1,        // Line width
                    fillOpacity: 0.8  // Fill opacity for polygons
                };
            }
        }).addTo(map);
    })
    .catch(error => console.error('Error loading GeoJSON building data:', error));

// Variable to store pool markers for distance calculation
const poolMarkers = [];

// Load GeoJSON data for Swimming Pools
fetch('piscinas-gandia.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                const marker = L.circleMarker(latlng, {
                    radius: 6,        // Radius of the point
                    color: '#0073e6', // Border color
                    fillColor: '#0073e6', // Fill color
                    fillOpacity: 0.8, // Fill opacity
                    weight: 1         // Border width
                });
                
                // Store marker for distance calculations
                poolMarkers.push(marker);
                return marker;
            },
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.name) {
                    layer.bindPopup(`<b>Swimming Pool:</b> ${feature.properties.name}`);
                } else {
                    layer.bindPopup("<b>Swimming Pool</b>");
                }
            }
        }).addTo(poolLayer);
    })
    .catch(error => console.error('Error loading GeoJSON swimming pool data:', error));

// Add a draggable marker with a radius circle
const draggableMarker = L.marker([38.9673, -0.1819], { draggable: true }).addTo(map);
let radius = 500; // Initial radius value
const radiusCircle = L.circle(draggableMarker.getLatLng(), { radius: radius }).addTo(map); // Initial radius circle

// Add the counter display to the map
const counterDiv = L.control({ position: 'topright' });
counterDiv.onAdd = function () {
    const div = L.DomUtil.create('div', 'pool-counter');
    div.innerHTML = `
        <span style="font-size: 16px; color: #dedfe0;">Swimming Pools within <span id="radius-display">${radius}</span>m:</span>
        <div class="count-number" style="font-size: 50px; font-weight: bold; color: #dedfe0;">0</div>
    `; // Initial counter setup with updated styles
    return div;
};
counterDiv.addTo(map);

// Function to calculate and update the counter for pools within the radius
function updatePoolCounter() {
    const markerLatLng = draggableMarker.getLatLng();
    radiusCircle.setLatLng(markerLatLng); // Correctly move the circle with the marker

    let count = 0;
    poolLayer.clearLayers(); // Clear previous pool markers within the radius

    poolMarkers.forEach(pool => {
        const poolLatLng = pool.getLatLng();
        const distance = map.distance(markerLatLng, poolLatLng);
        if (distance <= radiusCircle.getRadius()) { // Check if within the updated radius
            count++;
            pool.addTo(poolLayer); // Add pool marker to the map if within radius
        }
    });

    // Update the count display
    document.querySelector('.count-number').innerText = count; // Only update the number
}

// Initial counter update
updatePoolCounter();

// Add a move event listener to update the circle and counter when the marker is moved
draggableMarker.on('move', function() {
    updatePoolCounter();
    radiusCircle.setLatLng(draggableMarker.getLatLng()); // Ensure the circle follows the marker
});

// Add event listener to the slider to dynamically change the radius
const radiusSlider = document.getElementById('radius-slider');
const radiusValue = document.getElementById('radius-value');
radiusSlider.addEventListener('input', function() {
    radius = parseInt(this.value);
    radiusCircle.setRadius(radius); // Update circle radius
    document.getElementById('radius-display').innerText = radius; // Update radius display
    radiusValue.innerText = radius; // Update slider value display
    updatePoolCounter(); // Update counter based on new radius
});
