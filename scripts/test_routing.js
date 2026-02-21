
async function testRouting() {
    // Coordinate for Cape Town (approx)
    const startLat = -33.9249;
    const startLng = 18.4241;
    const endLat = -33.9000;
    const endLng = 18.4000;

    const url = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    console.log("Fetching:", url);

    try {
        const response = await fetch(url);
        const json = await response.json();

        if (json.routes && json.routes.length > 0) {
            const route = json.routes[0];
            console.log("Success! Route found.");
            console.log("Duration:", route.duration, "seconds");
            console.log("Distance:", route.distance, "meters");
            console.log("Geometry Points:", route.geometry.coordinates.length);
        } else {
            console.error("No routes found:", json);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testRouting();
