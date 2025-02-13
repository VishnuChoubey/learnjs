const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const axios = require("axios");
const protobuf = require("protobufjs");
const cors = require("cors");
const { SourceTextModule } = require("vm");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Replace with your private key
const PRIVATE_KEY = "IQ5uUTtGapIi6k3B2yunsOySYWWW74AS";
const API_URL = "https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb";

// Load GTFS static data
const trips = [];
const stopTimes = [];
const stops = [];

fs.createReadStream("trips.txt")
  .pipe(csv())
  .on("data", (row) => trips.push(row))
  .on("end", () => {
    console.log("Trips loaded:", trips.length);
  });

fs.createReadStream("stop_times.txt")
  .pipe(csv())
  .on("data", (row) => stopTimes.push(row))
  .on("end", () => {
    console.log("Stop times loaded:", stopTimes.length);
  });

fs.createReadStream("stops.txt")
  .pipe(csv())
  .on("data", (row) => stops.push(row))
  .on("end", () => {
    console.log("Stops loaded:", stops.length);
  });

// Function to extract route_id from real-time trip_id
function extractRouteId(tripId) {
  return tripId.split("_")[0];
}

// Function to normalize route_id (remove leading zeros or suffixes)
function normalizeRouteId(routeId) {
  return routeId.replace(/^0+|[\sA-Za-z]+$/g, "");
}

// API to get stops for autocomplete
app.get("/api/stops", (req, res) => {
  res.json(stops);
});

// API to get real-time vehicle positions
app.get("/api/vehicle-positions", async (req, res) => {
  try {
    // Load the GTFS Realtime proto file
    const root = await protobuf.load("gtfs-realtime.proto");
    const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

    // Fetch real-time data from the Delhi Live API
    const response = await axios.get(`${API_URL}?key=${PRIVATE_KEY}`, {
      responseType: "arraybuffer", // Ensure binary data is returned
    });

    // Decode the binary data using the FeedMessage type
    const message = FeedMessage.decode(new Uint8Array(response.data));

    // Convert the message to a JSON object
    const decodedData = FeedMessage.toObject(message, {
      longs: String, // Convert long values to strings
      enums: String, // Convert enums to strings
      bytes: String, // Convert bytes to strings
    });
    console.log(decodedData.vehicle)

    // Process and return the decoded data
    const vehiclePositions = decodedData.entity
      .filter((entity) => entity.vehicle) // Filter entities with vehicle data
      .map((entity) => {
        const vehicle = entity.vehicle;
        const realTimeTripId = vehicle.trip.tripId;

        // Extract and normalize route_id from real-time trip_id
        const routeId = normalizeRouteId(extractRouteId(realTimeTripId));

        // Find all trips for this route_id in trips.txt
        const routeTrips = trips.filter((t) => normalizeRouteId(t.route_id) === routeId);

        if (routeTrips.length > 0) {
          // For simplicity, use the first trip in the list
          const trip = routeTrips[0];

          // Find the stops for this trip in stop_times.txt
          const tripStops = stopTimes.filter((st) => st.trip_id === trip.trip_id);

          // Get the first and last stop
          const firstStop = tripStops[0];
          const lastStop = tripStops[tripStops.length - 1];

          // Get the stop details from stops.txt
          const sourceStop = stops.find((s) => s.stop_id === firstStop.stop_id);
          const destinationStop = stops.find((s) => s.stop_id === lastStop.stop_id);

          return {
            vehicleId: vehicle.vehicle.id,
            realTimeTripId,
            staticTripId: trip.trip_id,
            routeId: trip.route_id,
            source: sourceStop.stop_name,
            destination: destinationStop.stop_name,
            realTimeTimestamp: new Date(vehicle.timestamp * 1000).toLocaleString(),
            scheduledDepartureTime: firstStop.departure_time,
            scheduledArrivalTime: lastStop.arrival_time,
          };
        }
        return null;
      })
      .filter((data) => data !== null); // Remove null entries

    res.json(vehiclePositions);
  } catch (error) {
    console.error("Error fetching vehicle positions:", error);
    res.status(500).json({ error: "Failed to fetch vehicle positions" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});