const fs = require('fs');
const path = require('path');

// Function to convert DMS (Degrees, Minutes, Seconds) to decimal degrees
function dmsToDecimal(dms) {
    const parts = dms.match(/(\d+)[°](\d+)['](\d+\.\d+)[\"]([NS])/);
    if (!parts) {
        console.error(`Invalid DMS format: ${dms}`);
        return null;
    }
    const degrees = parseFloat(parts[1]);
    const minutes = parseFloat(parts[2]);
    const seconds = parseFloat(parts[3]);
    const direction = parts[4];

    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S') {
        decimal = -decimal;
    }
    return decimal;
}

// Function to parse the placeName to latitude and longitude
function parsePlaceName(placeName) {
    const parts = placeName.match(/(\d+°\d+'(?:\d+\.\d+)?\"[NS]) (\d+°\d+'(?:\d+\.\d+)?\"[EW])/);
    if (!parts) {
        console.error(`Invalid placeName format: ${placeName}`);
        return null;
    }
    const lat = dmsToDecimal(parts[1]);
    const lon = dmsToDecimal(parts[2].replace(/[EW]/, (dir) => dir === 'E' ? 'N' : 'S'));
    if (lat === null || lon === null) {
        return null;
    }
    return { lat, lon };
}

// Read the JSON file
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'output.json'), 'utf8'));

const geojson = {
    type: "FeatureCollection",
    features: []
};

data.forEach(entry => {
    if (entry.placeName && entry.placeName !== "Not Available") {
        const coordinates = parsePlaceName(entry.placeName);
        if (coordinates) {
            geojson.features.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [coordinates.lon, coordinates.lat]
                },
                properties: {
                    index: entry.index,
                    url: entry.url,
                    address: entry.address,
                    imagePath: entry.imagePath
                }
            });
        } else {
            console.warn(`Skipping invalid placeName entry at index ${entry.index}: ${entry.placeName}`);
        }
    } else {
        console.warn(`Skipping entry with "Not Available" placeName at index ${entry.index}`);
    }
});

// Write the GEOJSON file
fs.writeFileSync(path.join(__dirname, 'output.geojson'), JSON.stringify(geojson, null, 2), 'utf8');

console.log('GEOJSON file created successfully!');
