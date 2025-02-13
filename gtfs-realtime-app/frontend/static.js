const fs = require("fs");
const csv = require("csv-parser");

// Load agency.txt
const agency = [];
fs.createReadStream("agency.txt")
  .pipe(csv())
  .on("data", (row) => agency.push(row))
  .on("end", () => {
    console.log("Agency loaded:", agency.length);
  });

// Load calendar.txt
const calendar = [];
fs.createReadStream("calendar.txt")
  .pipe(csv())
  .on("data", (row) => calendar.push(row))
  .on("end", () => {
    console.log("Calendar loaded:", calendar.length);
  });

// Load stops.txt
const stops = [];
fs.createReadStream("stops.txt")
  .pipe(csv())
  .on("data", (row) => stops.push(row))
  .on("end", () => {
    console.log("Stops loaded:", stops.length);
  });

// Load routes.txt
const routes = [];
fs.createReadStream("routes.txt")
  .pipe(csv())
  .on("data", (row) => routes.push(row))
  .on("end", () => {
    console.log("Routes loaded:", routes.length);
  });

// Load trips.txt
const trips = [];
fs.createReadStream("trips.txt")
  .pipe(csv())
  .on("data", (row) => trips.push(row))
  .on("end", () => {
    console.log("Trips loaded:", trips.length);
  });

// Load stop_times.txt
const stopTimes = [];
fs.createReadStream("stop_times.txt")
  .pipe(csv())
  .on("data", (row) => stopTimes.push(row))
  .on("end", () => {
    console.log("Stop times loaded:", stopTimes.length);
  });