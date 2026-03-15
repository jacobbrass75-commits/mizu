const API = "https://api.spotify.com/v1";

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
        previewUrl: item.track.preview_url,
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

export async function fetchAudioFeatures(token, trackIds, onProgress) {
  const features = {};
  const batchSize = 100;

  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize);
    const res = await fetch(`${API}/audio-features?ids=${batch.join(",")}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn("Audio features unavailable:", res.status);
      return null;
    }

    const data = await res.json();
    if (data.audio_features) {
      for (const f of data.audio_features) {
        if (f) features[f.id] = f;
      }
    }
    onProgress?.(Object.keys(features).length, trackIds.length);
  }

  return features;
}

export function classifyTrack(features) {
  if (!features) return "valley";

  const {
    energy = 0.5,
    tempo = 120,
    valence = 0.5,
    acousticness = 0.3,
    instrumentalness = 0.1,
    danceability = 0.5,
    loudness = -10,
  } = features;

  const nt = Math.min(tempo / 200, 1);

  const scores = {
    night:
      (energy < 0.15 ? 2.5 : energy < 0.25 ? 1.5 : 0) +
      (instrumentalness > 0.6 ? 2 : instrumentalness > 0.3 ? 1 : 0) +
      (1 - energy) * 1.2 +
      (acousticness > 0.7 ? 0.8 : 0) +
      (tempo < 80 ? 0.5 : 0),

    valley:
      (energy < 0.35 ? 1.5 : energy < 0.45 ? 0.5 : 0) +
      (tempo < 100 ? 1.2 : tempo < 110 ? 0.5 : 0) +
      (acousticness > 0.5 ? 1 : acousticness > 0.3 ? 0.5 : 0) +
      (1 - energy) * 0.8 +
      (1 - valence) * 0.6,

    ground:
      (energy > 0.2 && energy < 0.55 ? 1.2 : 0) +
      (tempo > 70 && tempo < 115 ? 1 : 0) +
      acousticness * 1.5 +
      (1 - Math.abs(energy - 0.38)) * 0.8,

    structure:
      (energy > 0.25 && energy < 0.65 ? 1 : 0) +
      instrumentalness * 1.5 +
      (1 - Math.abs(nt - 0.5)) * 1 +
      (1 - danceability) * 0.6,

    growth:
      (energy > 0.45 && energy < 0.8 ? 1.2 : 0) +
      valence * 1.3 +
      danceability * 1 +
      (tempo > 100 && tempo < 140 ? 0.8 : 0),

    peak:
      (energy > 0.75 ? 2.5 : energy > 0.6 ? 1 : 0) +
      (tempo > 120 ? 1.2 : tempo > 110 ? 0.5 : 0) +
      valence * 0.8 +
      danceability * 0.6 +
      (loudness > -7 ? 0.8 : loudness > -10 ? 0.3 : 0),
  };

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

export function classifyAllTracks(tracks, audioFeatures) {
  const playlists = { peak: [], structure: [], valley: [], growth: [], ground: [], night: [] };
  const hasFeatures = audioFeatures !== null;

  for (const track of tracks) {
    const features = audioFeatures?.[track.id];
    const state = features ? classifyTrack(features) : "valley";
    playlists[state].push({ ...track, features, state });
  }

  return { playlists, hasFeatures, totalTracks: tracks.length };
}

export function getFeatureLabel(features) {
  if (!features) return "";
  const parts = [];
  if (features.energy > 0.7) parts.push("high energy");
  else if (features.energy < 0.3) parts.push("low energy");
  if (features.tempo > 130) parts.push(`${Math.round(features.tempo)} bpm`);
  else if (features.tempo < 90) parts.push(`${Math.round(features.tempo)} bpm`);
  if (features.acousticness > 0.6) parts.push("acoustic");
  if (features.instrumentalness > 0.5) parts.push("instrumental");
  if (features.valence > 0.7) parts.push("bright");
  else if (features.valence < 0.3) parts.push("dark");
  if (features.danceability > 0.7) parts.push("danceable");
  return parts.join(" · ");
}
