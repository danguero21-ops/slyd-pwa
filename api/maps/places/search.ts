export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed', results: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Places search is not configured', results: [] });

  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 160) : '';
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!query || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'A search phrase and valid coordinates are required', results: [] });
  }

  try {
    const placesResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours'
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 5000 } }
      })
    });
    if (!placesResponse.ok) {
      console.error('Places API request failed with status', placesResponse.status);
      return res.status(502).json({ error: 'Venue search is temporarily unavailable', results: [] });
    }

    const data = await placesResponse.json();
    const results = (Array.isArray(data.places) ? data.places : []).map((place: any) => ({
      place_id: place.id,
      name: place.displayName?.text || 'Venue',
      formatted_address: place.formattedAddress || '',
      rating: place.rating,
      user_ratings_total: place.userRatingCount,
      geometry: { location: { lat: place.location?.latitude, lng: place.location?.longitude } },
      opening_hours: { open_now: place.currentOpeningHours?.openNow }
    }));
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Places API request failed', error);
    return res.status(502).json({ error: 'Venue search is temporarily unavailable', results: [] });
  }
}
