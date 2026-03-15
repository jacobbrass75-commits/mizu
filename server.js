import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = 3001;

// ═══════════════════════════════════════════════════════
// SPOTIFY OAUTH
// ═══════════════════════════════════════════════════════

app.get("/auth/login", (req, res) => {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).send("Missing client_id");

  const params = new URLSearchParams({
    client_id,
    response_type: "code",
    redirect_uri: "http://127.0.0.1:3001/auth/callback",
    scope: "user-library-read user-read-private playlist-modify-private playlist-modify-public",
    show_dialog: "true",
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`http://localhost:5173/?spotify_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect("http://localhost:5173/?spotify_error=no_code");
  }

  const client_id = process.env.SPOTIFY_CLIENT_ID || "";
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET || "";

  if (!client_id || !client_secret) {
    return res.redirect("http://localhost:5173/?spotify_error=missing_server_credentials");
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "http://127.0.0.1:3001/auth/callback",
      }),
    });

    const data = await tokenRes.json();
    if (data.error) {
      return res.redirect(`http://localhost:5173/?spotify_error=${encodeURIComponent(data.error_description || data.error)}`);
    }

    res.redirect(`http://localhost:5173/?spotify_token=${data.access_token}`);
  } catch (err) {
    res.redirect(`http://localhost:5173/?spotify_error=${encodeURIComponent(err.message)}`);
  }
});

// ═══════════════════════════════════════════════════════
// AI CLASSIFICATION
// ═══════════════════════════════════════════════════════

app.post("/ai/classify", async (req, res) => {
  const { tracks } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });
  if (!tracks?.length) return res.status(400).json({ error: "No tracks provided" });

  try {
    // Batch into groups of 50
    const allClassifications = [];
    const batchSize = 50;

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      const trackList = batch.map((t, j) =>
        `${j + 1}. id:"${t.id}" — "${t.name}" by ${t.artist}`
      ).join("\n");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: `You are classifying music into six elemental energy states.

The six states:
- **peak** (Fire): High energy, propulsive, bright, complex. Energizing guitar, brass, high-tempo, dance-worthy. Examples: Khruangbin, Mdou Moctar "Afrique Victime", Snarky Puppy, Afrobeat, high-energy jazz fusion.
- **structure** (Metal): Precise, disciplined, mathematical, repetitive patterns. Classical, minimalism, structured electronic. Examples: Bach, Steve Reich, Philip Glass, Nils Frahm, GoGo Penguin.
- **valley** (Water): Low energy, atmospheric, introspective, melancholic, dreamy. Ambient-adjacent, shoegaze, intimate vocals. Examples: Grouper, Bon Iver "For Emma", Adrianne Lenker, dream pop, slowcore.
- **growth** (Wood): Creative, expansive, exploratory, building energy. Art-rock, progressive jazz, identity-exploration, genre-bending. Examples: Tigran Hamasyan, Kamasi Washington, Moses Sumney, Floating Points.
- **ground** (Earth): Earthy, grounding, warm, acoustic, contemplative. Desert blues, West African, Ethiopian jazz, folk roots, kora. Examples: Ali Farka Touré, Tinariwen, Mulatu Astatke, Toumani Diabaté.
- **night** (Deep Water): Very low energy, ambient, sparse, nocturnal, meditative. Late-night piano, ambient drones, deep calm. Examples: Harold Budd, Brian Eno ambient works, Ryuichi Sakamoto "async", Keith Jarrett solo.

Classify each track into exactly one state based on your knowledge of the artist, album, and track.

Return ONLY a JSON array, no markdown, no explanation:
[{"id":"track_id","state":"peak|structure|valley|growth|ground|night"}]

Tracks:
${trackList}`,
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || "[]";

      try {
        const parsed = JSON.parse(text);
        allClassifications.push(...parsed);
      } catch {
        // Try to extract JSON from the response
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          allClassifications.push(...JSON.parse(match[0]));
        }
      }
    }

    res.json({ classifications: allClassifications });
  } catch (err) {
    console.error("Classification error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// AI RECOMMENDATIONS
// ═══════════════════════════════════════════════════════

app.post("/ai/recommend", async (req, res) => {
  const { state, element, tracks } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  try {
    const trackList = tracks.map(t => `- "${t.name}" by ${t.artist}`).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: `You are a music curator for a personal energy management app. A user has these tracks in their "${state}" (${element}) playlist:

${trackList}

Based on their taste, suggest 8 tracks they would love that fit this elemental state. Consider:
- Artists adjacent to what they already have
- Deep cuts from artists they already like
- Music from different cultures/regions with the same energy
- Recently released music they might have missed
- Tracks actually available on Spotify

For each suggestion, give a brief reason why it fits.

Return ONLY a JSON array, no markdown:
[{"artist":"...","track":"...","album":"...","why":"One sentence reason"}]`,
        }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Anthropic API error:", data.error);
      return res.status(500).json({ error: data.error.message || JSON.stringify(data.error) });
    }
    const text = data.content?.[0]?.text || "[]";
    console.log("AI recommend raw:", text.substring(0, 200));

    try {
      const parsed = JSON.parse(text);
      res.json({ recommendations: parsed });
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        res.json({ recommendations: JSON.parse(match[0]) });
      } else {
        console.error("Could not parse recommendations:", text.substring(0, 500));
        res.json({ recommendations: [] });
      }
    }
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// SPOTIFY SEARCH (for finding recommended tracks)
// ═══════════════════════════════════════════════════════

app.get("/spotify/search", async (req, res) => {
  const { q, token } = req.query;
  if (!q || !token) return res.status(400).json({ error: "Missing q or token" });

  try {
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await searchRes.json();
    const track = data.tracks?.items?.[0];
    if (track) {
      res.json({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(", "),
        album: track.album.name,
        uri: track.uri,
        albumArt: track.album.images?.[2]?.url || track.album.images?.[0]?.url,
      });
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Mizu auth server running on http://127.0.0.1:${PORT}`);
});
