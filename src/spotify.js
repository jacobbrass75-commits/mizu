const API = "https://api.spotify.com/v1";
const SERVER = "http://127.0.0.1:3001";

export async function fetchUserProfile(token) {
  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(res.status === 401 ? "expired" : `Spotify error: ${res.status}`);
  return res.json();
}

export async function fetchSavedTracks(token, onProgress, limit = 500) {
  const tracks = [];
  let offset = 0;
  const pageSize = 50;

  while (offset < limit) {
    const res = await fetch(`${API}/me/tracks?limit=${pageSize}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(res.status === 401 ? "expired" : `Spotify error: ${res.status}`);

    const data = await res.json();
    for (const item of data.items) {
      if (!item.track) continue;
      tracks.push({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(", "),
        album: item.track.album.name,
        albumArt: item.track.album.images?.[1]?.url || item.track.album.images?.[0]?.url,
        albumArtSmall: item.track.album.images?.[2]?.url || item.track.album.images?.[0]?.url,
        uri: item.track.uri,
        duration: item.track.duration_ms,
        popularity: item.track.popularity,
      });
    }

    onProgress?.(tracks.length, data.total);
    if (!data.next || data.items.length < pageSize) break;
    offset += pageSize;
  }

  return tracks;
}

// ═══════════════════════════════════════════════════════
// AI CLASSIFICATION (via server → Claude)
// ═══════════════════════════════════════════════════════

export async function aiClassifyTracks(tracks, onProgress) {
  onProgress?.("Sending to Claude for classification...");

  const res = await fetch(`${SERVER}/ai/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tracks: tracks.map(t => ({ id: t.id, name: t.name, artist: t.artist })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI classification failed: ${res.status}`);
  }

  const { classifications } = await res.json();

  // Build playlists from classifications
  const playlists = { peak: [], structure: [], valley: [], growth: [], ground: [], night: [] };
  const classMap = {};
  for (const c of classifications) {
    classMap[c.id] = c.state;
  }

  for (const track of tracks) {
    const state = classMap[track.id] || "valley";
    playlists[state].push({ ...track, state });
  }

  return { playlists, totalTracks: tracks.length, aiClassified: true };
}

// ═══════════════════════════════════════════════════════
// AI RECOMMENDATIONS (via server → Claude)
// ═══════════════════════════════════════════════════════

export async function aiRecommend(state, element, tracks) {
  const res = await fetch(`${SERVER}/ai/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state,
      element,
      tracks: tracks.map(t => ({ name: t.name, artist: t.artist })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Recommendations failed");
  }

  const { recommendations } = await res.json();
  return recommendations;
}

// ═══════════════════════════════════════════════════════
// SEARCH SPOTIFY (for finding recommended tracks)
// ═══════════════════════════════════════════════════════

export async function searchSpotifyTrack(token, artist, track) {
  const res = await fetch(
    `${SERVER}/spotify/search?token=${encodeURIComponent(token)}&q=${encodeURIComponent(`${track} ${artist}`)}`,
  );
  if (!res.ok) return null;
  return res.json();
}

// ═══════════════════════════════════════════════════════
// CREATE SPOTIFY PLAYLISTS
// ═══════════════════════════════════════════════════════

const STATE_META = {
  peak:      { name: "水 Peak · Fire",      desc: "High energy, propulsive, bright — world-beater mode" },
  structure: { name: "水 Structure · Metal", desc: "Precise, disciplined, mathematical — the Metal practice" },
  valley:    { name: "水 Valley · Water",    desc: "Low energy, atmospheric, introspective — let the wave be low" },
  growth:    { name: "水 Growth · Wood",     desc: "Creative, expansive, exploratory — vision mode" },
  ground:    { name: "水 Ground · Earth",    desc: "Earthy, grounding, warm — reconnect with your body" },
  night:     { name: "水 Night · Deep Water",desc: "Nocturnal, ambient, sparse — the deep well" },
};

export async function createPlaylist(token, userId, state, trackUris) {
  const meta = STATE_META[state];

  // Create playlist
  const createRes = await fetch(`${API}/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: meta.name,
      description: meta.desc,
      public: false,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create playlist: ${createRes.status}`);
  }

  const playlist = await createRes.json();

  // Add tracks in batches of 100
  for (let i = 0; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    await fetch(`${API}/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: batch }),
    });
  }

  return { id: playlist.id, url: playlist.external_urls.spotify, name: meta.name };
}

export async function createAllPlaylists(token, userId, playlists, onProgress) {
  const results = {};
  const states = Object.entries(playlists).filter(([, tracks]) => tracks.length > 0);

  for (let i = 0; i < states.length; i++) {
    const [state, tracks] = states[i];
    onProgress?.(`Creating ${STATE_META[state].name}... (${i + 1}/${states.length})`);
    const uris = tracks.map(t => t.uri);
    results[state] = await createPlaylist(token, userId, state, uris);
  }

  return results;
}
