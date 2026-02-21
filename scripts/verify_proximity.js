
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

const MAX_DISTANCE_KM = 35;

async function checkProximity() {
    try {
        await client.connect();
        console.log("Connected to database.");

        // 1. Get User Address (Testing with the one we just inserted or latest)
        // We look for the most recently updated default address
        const userRes = await client.query(`
            SELECT * FROM user_addresses 
            WHERE is_default = true 
            ORDER BY updated_at DESC 
            LIMIT 1
        `);

        if (userRes.rows.length === 0) {
            console.log("No default user address found.");
            return;
        }

        const userAddress = userRes.rows[0];
        console.log(`\nUser Address: ${userAddress.address_line1}, ${userAddress.city}`);
        console.log(`User Coords: (${userAddress.lat}, ${userAddress.lng})`);

        // 2. Get Verified Stores
        const storeRes = await client.query(`
            SELECT * FROM stores 
            WHERE is_verified = true
        `);

        console.log(`\nFound ${storeRes.rows.length} verified stores.`);

        // 3. Calculate Distances
        console.log("\n--- Distance Check (Limit: 35km) ---");

        if (storeRes.rows.length === 0) {
            console.log("No verified stores found to check against.");
        }

        storeRes.rows.forEach(store => {
            const distance = getDistanceFromLatLonInKm(
                userAddress.lat,
                userAddress.lng,
                store.latitude,
                store.longitude
            );

            let status = "Unknown";
            if (distance !== null) {
                const isWithinRange = distance <= MAX_DISTANCE_KM;
                status = isWithinRange ? "✅ YES (Visible)" : "❌ NO (Too Far)";

                console.log(`Store: ${store.name}`);
                console.log(`Address: ${store.address}`);
                console.log(`Coords: (${store.latitude}, ${store.longitude})`);
                console.log(`Distance: ${distance.toFixed(2)} km`);
                console.log(`Within 35km? ${status}`);
                console.log("-----------------------------------");
            } else {
                console.log(`Store: ${store.name} - Missing Coordinates (Lat/Lng null)`);
            }
        });

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        await client.end();
    }
}

checkProximity();
