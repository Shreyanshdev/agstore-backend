import axios from 'axios';

export async function geocodeAddress(addressString) {

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`;
  const response = await axios.get(url);
  if (
    response.data &&
    response.data.status === "OK" &&
    response.data.results &&
    response.data.results.length > 0
  ) {
    const loc = response.data.results[0].geometry.location;
    return {
      latitude: loc.lat,
      longitude: loc.lng,
    };
  } else {
    throw new Error("Could not geocode address");
  }
}
