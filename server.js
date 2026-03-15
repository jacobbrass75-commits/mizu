import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = 3001;

// Step 1: Redirect user to Spotify authorization
app.get("/auth/login", (req, res) => {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).send("Missing client_id");

  const params = new URLSearchParams({
    client_id,
    response_type: "code",
    redirect_uri: "http://127.0.0.1:3001/auth/callback",
    scope: "user-library-read user-read-private",
    show_dialog: "true",
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// Step 2: Spotify redirects here with a code — exchange it for a token
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

    // Redirect back to Mizu with the access token
    res.redirect(`http://localhost:5173/?spotify_token=${data.access_token}`);
  } catch (err) {
    res.redirect(`http://localhost:5173/?spotify_error=${encodeURIComponent(err.message)}`);
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Mizu auth server running on http://127.0.0.1:${PORT}`);
});
