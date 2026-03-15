import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchUserProfile,
  fetchSavedTracks,
  aiClassifyTracks,
  aiRecommend,
  createAllPlaylists,
  searchSpotifyTrack,
} from "./spotify";

// ═══════════════════════════════════════════════════════
// 水 MIZU — Wave State Optimizer
// ═══════════════════════════════════════════════════════

const STATES = {
  peak: {
    id: "peak", element: "Fire", glyph: "火", label: "Peak",
    color: "#e8723a", colorDim: "#e8723a30",
    desc: "World-beater mode. Your wave is high, energy is flowing, insight is sharp. Use this for high-leverage creative work, important conversations, and building.",
    music: [
      { artist: "Khruangbin", album: "Con Todo El Mundo", why: "Bright guitar, upper-mid register, propulsive rhythm" },
      { artist: "Mdou Moctar", album: "Afrique Victime", why: "Searing high-register Tuareg guitar, Fire + Metal" },
      { artist: "Snarky Puppy", album: "We Like It Here", why: "Brass, keys, complex arrangement, peak energy" },
      { artist: "Nubiyan Twist", album: "Freedom Fables", why: "Horns, Afrobeat, high frequency layers" },
      { artist: "Stromae", album: "Multitude", why: "French vocals, rhythmic complexity, forward-moving" },
      { artist: "Masego", album: "Studying Abroad", why: "Jazz-trap, saxophone, bright vocal runs" },
    ],
    workspace: "Bright lighting. Clean desk. Metal objects visible. Face west. Complex layered music at moderate volume. This is sprint time — 50 min blocks max.",
    avoid: "Don't make permanent commitments from here. The peak lies about sustainability. Create, don't commit.",
    activity: "High-leverage creative work. Pitches. Strategic conversations. Building features. Writing that matters.",
  },
  structure: {
    id: "structure", element: "Metal", glyph: "金", label: "Structure",
    color: "#9ca8b4", colorDim: "#9ca8b430",
    desc: "Discipline mode. Not high energy but clear and focused. Perfect for the boring essential work that builds your missing Metal.",
    music: [
      { artist: "Bach / Hilary Hahn", album: "Violin Partitas", why: "Pure mathematical precision, high register" },
      { artist: "Steve Reich", album: "Music for 18 Musicians", why: "Repeating precise patterns, structure as sound" },
      { artist: "Nils Frahm", album: "All Melody", why: "Meticulous piano + synth, bright enough for High Sound" },
      { artist: "GoGo Penguin", album: "Man Made Object", why: "Acoustic jazz with electronic precision" },
      { artist: "Philip Glass", album: "Glassworks", why: "Repetitive structures that build incrementally" },
      { artist: "Ryuichi Sakamoto", album: "12", why: "Spare, precise, crystalline — refinement through subtraction" },
    ],
    workspace: "Operational mode. Whiteboard visible. Checklist active. Timer running. This is where you build riverbanks for your Water.",
    avoid: "Don't abandon structure work for a new idea that just popped up. That's Water escaping the container.",
    activity: "Documentation. Finances. System-building. Code cleanup. Email. Planning. The Metal practice.",
  },
  valley: {
    id: "valley", element: "Water", glyph: "水", label: "Valley",
    color: "#4a9ec7", colorDim: "#4a9ec730",
    desc: "The wave is low. Energy is inert. This isn't broken — it's your system processing and integrating. Don't fight it.",
    music: [
      { artist: "Hermanos Gutiérrez", album: "El Bueno Y El Malo", why: "Desert water. Mist music. Matches your depth" },
      { artist: "Grouper", album: "Dragging a Dead Deer Up a Hill", why: "Fog and atmosphere. Being underwater" },
      { artist: "Adrianne Lenker", album: "songs", why: "Intimate high-register vocals, light in the valley" },
      { artist: "Bon Iver", album: "For Emma, Forever Ago", why: "High falsetto, emotionally resonant, Water that moves" },
      { artist: "Caetano Veloso", album: "Livro", why: "Portuguese vocals, gentle Water-Fire combination" },
      { artist: "Ryoji Ikeda", album: "dataplex", why: "Pure frequency, no emotional demand, raw sonic nourishment" },
    ],
    workspace: "Move to the soft space. Dimmer light. Window if possible. This is reading, reflecting, journaling territory. Not the main desk.",
    avoid: "Don't judge your life trajectory from here. The valley lies about what's possible. Don't send emotional texts.",
    activity: "Reading. Light admin. Journaling. Processing. Walking. Rest before you're exhausted, not after.",
  },
  growth: {
    id: "growth", element: "Wood", glyph: "木", label: "Growth",
    color: "#5ea65e", colorDim: "#5ea65e30",
    desc: "Vision mode. The creative impulse is strong. Ideas are branching and expanding. Channel it — don't let it scatter.",
    music: [
      { artist: "Tigran Hamasyan", album: "An Ancient Observer", why: "Armenian jazz piano, explosive creative energy" },
      { artist: "Shabaka", album: "Perceive Its Beauty", why: "High frequency sax/clarinet, pure creative expansion" },
      { artist: "Moses Sumney", album: "græ", why: "High falsetto, identity exploration, art-pop layers" },
      { artist: "Anoushka Shankar", album: "Land of Gold", why: "Sitar's high frequency range, organic growth" },
      { artist: "Floating Points", album: "Crush", why: "Electronic that grows and evolves organically" },
      { artist: "Kamasi Washington", album: "The Epic", why: "Expansive jazz, builds upward relentlessly" },
    ],
    workspace: "Whiteboard for mapping. Big paper for sketching connections. Let ideas flow but PICK ONE to water deeply. Not all of them.",
    avoid: "Starting five new things. Your single Water can't feed every seedling. Choose the strongest shoot.",
    activity: "Strategic planning. Vision mapping. Research. Exploring new territory. One deep creative session.",
  },
  ground: {
    id: "ground", element: "Earth", glyph: "土", label: "Grounding",
    color: "#c49a4a", colorDim: "#c49a4a30",
    desc: "Scattered and unmoored. Absorbed too much from others. Need to reconnect with your body and your own center.",
    music: [
      { artist: "Ali Farka Touré", album: "Talking Timbuktu", why: "West African blues, Earth made audible" },
      { artist: "Tinariwen", album: "Emmaar", why: "Desert blues, slow, earthy, contemplative" },
      { artist: "Mulatu Astatke", album: "Mulatu of Ethiopia", why: "Ethiopian jazz, warm, grounded, hypnotic" },
      { artist: "Ibrahim Maalouf", album: "Kalthoum", why: "Bright trumpet over Earth rhythms, digestion-friendly" },
      { artist: "Toumani Diabaté", album: "The Mandé Variations", why: "Kora — bright high register, deeply grounding" },
      { artist: "Mdou Moctar", album: "Ilana", why: "Tuareg guitar, earthier than Afrique Victime" },
    ],
    workspace: "Get away from the screen. Cook something. Walk outside. Physical tasks. Touch actual objects. Your open G needs environmental anchoring.",
    avoid: "More screen time. More content consumption. More abstraction. You need body, not mind right now.",
    activity: "Cooking. Walking. Cleaning your space (Metal + Earth practice). Physical exercise. Being in nature.",
  },
  night: {
    id: "night", element: "Water", glyph: "夜", label: "Water Hours",
    color: "#2a4a6a", colorDim: "#2a4a6a30",
    desc: "9 PM – 1 AM. Your deepest processing window. 癸 at full depth. Hermit mode. Phone on airplane mode.",
    music: [
      { artist: "Harold Budd", album: "The Pavilion of Dreams", why: "Ambient piano, sparse, floating, 癸 at night" },
      { artist: "Keith Jarrett", album: "The Köln Concert", why: "ECM aesthetic, spacious, high-fidelity quiet" },
      { artist: "Brian Eno", album: "Music for Airports", why: "Foreground ambient, frequency nourishment" },
      { artist: "Grouper", album: "A I A: Dream Loss", why: "Deep cave music, dissolved vocals" },
      { artist: "Nils Frahm", album: "Spaces", why: "Intimate live recording, piano in the dark" },
      { artist: "Ryuichi Sakamoto", album: "async", why: "Crystalline late-night processing sounds" },
    ],
    workspace: "Phone on airplane mode. Dim light. Pen and paper, not keyboard. Intentional scent. This is the deep well. Let it be deep.",
    avoid: "Screens for consumption. Social media. Texting. Discord. Content of any kind. Protect the well.",
    activity: "5-min daily log → physical transition → deep writing → midnight insight capture → cave floor reflection → sleep by 1 AM",
  },
};

const QUESTIONS = [
  {
    id: "energy",
    text: "How's your energy right now?",
    options: [
      { label: "Electric — could conquer anything", value: "peak", icon: "⚡" },
      { label: "Steady — clear but not buzzing", value: "structure", icon: "◆" },
      { label: "Flat — everything feels heavy", value: "valley", icon: "〰" },
      { label: "Buzzing — ideas keep coming", value: "growth", icon: "↑" },
      { label: "Scattered — can't find my center", value: "ground", icon: "◎" },
    ],
  },
  {
    id: "body",
    text: "What does your body want to do?",
    options: [
      { label: "Build something NOW", value: "peak", icon: "🔨" },
      { label: "Organize and clean up", value: "structure", icon: "📐" },
      { label: "Lie down honestly", value: "valley", icon: "🌊" },
      { label: "Explore — new territory", value: "growth", icon: "🌱" },
      { label: "Move — walk, cook, touch things", value: "ground", icon: "🪨" },
    ],
  },
  {
    id: "mind",
    text: "What's your mind doing?",
    options: [
      { label: "Sharp — connecting dots fast", value: "peak", icon: "✦" },
      { label: "Calm — can focus on details", value: "structure", icon: "▣" },
      { label: "Foggy — nothing sticks", value: "valley", icon: "☁" },
      { label: "Racing — visions and plans", value: "growth", icon: "⟳" },
      { label: "Noisy — too many inputs", value: "ground", icon: "◈" },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// CHECK-IN
// ═══════════════════════════════════════════════════════

function CheckInScreen({ onComplete }) {
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const handleAnswer = (qId, value) => {
    const newAnswers = { ...answers, [qId]: value };
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setFadeIn(false);
      setTimeout(() => { setCurrentQ(currentQ + 1); setFadeIn(true); }, 300);
    } else {
      const counts = {};
      Object.values(newAnswers).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const state = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const hour = new Date().getHours();
      const finalState = (hour >= 21 || hour < 1) ? "night" : state;
      setTimeout(() => onComplete(finalState, newAnswers), 400);
    }
  };

  const q = QUESTIONS[currentQ];

  return (
    <div style={{ animation: "fadeUp 0.6s ease both", maxWidth: 500, margin: "0 auto", padding: "0 16px" }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 4, color: "#4a4a50", marginBottom: 24, textAlign: "center" }}>
        {currentQ + 1} / {QUESTIONS.length}
      </div>
      <h2 style={{
        fontSize: 22, fontWeight: 300, color: "#c8c0b4", textAlign: "center", marginBottom: 32,
        opacity: fadeIn ? 1 : 0, transform: fadeIn ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.3s ease",
      }}>
        {q.text}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: fadeIn ? 1 : 0, transition: "opacity 0.3s ease" }}>
        {q.options.map((opt, i) => (
          <button key={opt.value} onClick={() => handleAnswer(q.id, opt.value)} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 4, padding: "16px 20px", color: "#a09a90", fontSize: 15,
            fontFamily: "inherit", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 14,
            transition: "all 0.3s ease", animation: "fadeUp 0.4s ease both",
            animationDelay: `${i * 0.06}s`,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
          >
            <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SPOTIFY CONNECT MODAL
// ═══════════════════════════════════════════════════════

function SpotifyConnect({ onConnect, onOAuth, onClose, loading, phase, error }) {
  const [token, setToken] = useState("");
  const [showManual, setShowManual] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, animation: "fadeUp 0.3s ease both",
    }} onClick={onClose}>
      <div style={{
        background: "#111014", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6, padding: 32, maxWidth: 480, width: "90%",
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 36, color: "#1DB954", marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}>♫</div>
            <div style={{ fontSize: 14, color: "#c8c0b4", marginBottom: 8 }}>{phase || "Connecting..."}</div>
            <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: "#1DB954", borderRadius: 2,
                animation: "pulse 1.5s ease-in-out infinite", width: "60%",
              }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: 28, color: "#1DB954" }}>♫</span>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 3, color: "#1DB954", marginTop: 8 }}>
                CONNECT SPOTIFY
              </div>
            </div>

            <p style={{ fontSize: 14, color: "#8a8478", lineHeight: 1.8, marginBottom: 20, textAlign: "center" }}>
              Sign in with your Spotify account to sort your library into elemental playlists.
            </p>

            {error && (
              <div style={{ fontSize: 12, color: "#c07060", marginBottom: 12, textAlign: "center" }}>{error}</div>
            )}

            <button
              onClick={onOAuth}
              style={{
                width: "100%", background: "rgba(29,185,84,0.15)",
                border: "1px solid rgba(29,185,84,0.3)", borderRadius: 3,
                padding: 14, color: "#1DB954", fontSize: 15, fontFamily: "inherit",
                cursor: "pointer", transition: "all 0.3s",
              }}
            >
              Authorize with Spotify
            </button>

            <div className="mono" style={{ fontSize: 9, color: "#4a4a50", marginTop: 16, textAlign: "center" }}>
              Token expires in ~1 hour · your data stays local
            </div>

            {/* Manual token fallback */}
            <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
              <button className="mono" onClick={() => setShowManual(!showManual)} style={{
                background: "none", border: "none", color: "#4a4a50",
                fontSize: 9, letterSpacing: 2, cursor: "pointer",
                fontFamily: "'DM Mono', monospace", width: "100%", textAlign: "center",
              }}>
                {showManual ? "HIDE" : "HAVE A TOKEN? PASTE IT"}
              </button>
              {showManual && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Paste access token..."
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3,
                      padding: "10px 14px", color: "#d4d0c4", fontSize: 12,
                      fontFamily: "'DM Mono', monospace", outline: "none", marginBottom: 8,
                    }}
                    onKeyDown={e => { if (e.key === "Enter" && token.trim()) onConnect(token.trim()); }}
                  />
                  <button
                    onClick={() => token.trim() && onConnect(token.trim())}
                    disabled={!token.trim()}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3,
                      padding: 10, color: "#8a8478", fontSize: 13, fontFamily: "inherit",
                      cursor: token.trim() ? "pointer" : "default",
                      opacity: token.trim() ? 1 : 0.5,
                    }}
                  >
                    Connect with token
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NOW PLAYING BAR
// ═══════════════════════════════════════════════════════

function NowPlaying({ track, isPlaying, onPlayPause, onStop, progress }) {
  if (!track) return null;
  const s = STATES[track.state];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(10,9,14,0.96)", borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
      backdropFilter: "blur(12px)", zIndex: 50, animation: "fadeUp 0.3s ease both",
    }}>
      {/* Progress bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "rgba(255,255,255,0.04)",
      }}>
        <div style={{
          height: "100%", background: s?.color || "#4a9ec7",
          width: `${progress * 100}%`, transition: "width 0.2s linear",
        }} />
      </div>

      {track.albumArtSmall && (
        <img src={track.albumArtSmall} alt="" style={{ width: 40, height: 40, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#c8c0b4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.name}
        </div>
        <div style={{ fontSize: 11, color: "#6a6458", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.artist}
        </div>
      </div>

      {s && (
        <div className="mono" style={{ fontSize: 8, letterSpacing: 2, color: s.color, flexShrink: 0 }}>
          ● {s.element.toUpperCase()}
        </div>
      )}

      <button onClick={onPlayPause} style={{
        background: "none", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "50%", width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "#c8c0b4", fontSize: 12, flexShrink: 0,
      }}>
        {isPlaying ? "⏸" : "▶"}
      </button>

      <button onClick={onStop} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#4a4a50", fontSize: 16, padding: 4, flexShrink: 0,
      }}>
        ✕
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// WAVE HISTORY
// ═══════════════════════════════════════════════════════

function WaveHistory({ history }) {
  if (history.length === 0) return null;
  const last14 = history.slice(-14);

  return (
    <div style={{
      marginTop: 32, padding: "16px 20px",
      background: "rgba(255,255,255,0.015)", borderRadius: 3,
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: "#5a5650", marginBottom: 12 }}>
        WAVE PATTERN
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 48, justifyContent: "center" }}>
        {last14.map((entry, i) => {
          const s = STATES[entry.state];
          const heights = { peak: 44, growth: 34, structure: 26, ground: 20, valley: 12, night: 18 };
          return (
            <div key={i} title={`${entry.state} — ${entry.time}`} style={{
              width: 16, height: heights[entry.state] || 20,
              background: `${s?.color || "#4a9ec7"}70`, borderRadius: "2px 2px 0 0",
              transition: "all 0.3s",
            }} />
          );
        })}
      </div>
      <div className="mono" style={{ fontSize: 8, color: "#3a3a3a", marginTop: 8, textAlign: "center" }}>
        {history.length} check-in{history.length !== 1 ? "s" : ""} logged · pattern emerges after ~7 days
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STATE VIEW
// ═══════════════════════════════════════════════════════

function StateView({ state, onReset, spotifyData, spotifyConnected, onOpenSpotify, onCreatePlaylists, onDiscover, recommendations, loadingRecs, creatingPlaylists, playlistsCreated }) {
  const s = STATES[state];
  const [selectedCurated, setSelectedCurated] = useState(null);
  const [activeSection, setActiveSection] = useState("music");

  const statePlaylist = spotifyData?.playlists?.[state] || [];

  return (
    <div style={{ animation: "fadeUp 0.6s ease both", maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>
      {/* State header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{
          fontSize: 52, fontFamily: "'Noto Serif SC', serif",
          color: s.color, marginBottom: 8, fontWeight: 300,
          textShadow: `0 0 40px ${s.colorDim}`,
        }}>
          {s.glyph}
        </div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 4, color: s.color, marginBottom: 8 }}>
          {s.element.toUpperCase()} STATE
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 300, color: "#d4d0c4", marginBottom: 12 }}>
          {s.label}
        </h2>
        <p style={{ fontSize: 14, color: "#8a8478", lineHeight: 1.8, maxWidth: 440, margin: "0 auto" }}>
          {s.desc}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
        {["music", "space", "guidance"].map(sec => (
          <button key={sec} className="mono" onClick={() => setActiveSection(sec)} style={{
            background: activeSection === sec ? `${s.color}12` : "none",
            border: `1px solid ${activeSection === sec ? s.color : "transparent"}`,
            color: activeSection === sec ? s.color : "#5a5650",
            padding: "7px 16px", borderRadius: 2, cursor: "pointer",
            fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
            fontFamily: "'DM Mono', monospace", transition: "all 0.3s",
          }}>
            {sec}
          </button>
        ))}
      </div>

      {/* ═══ MUSIC TAB ═══ */}
      {activeSection === "music" && (
        <div style={{ animation: "fadeUp 0.3s ease both" }}>

          {/* Spotify tracks */}
          {spotifyConnected && statePlaylist.length > 0 && (
            <>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: s.color, marginBottom: 14 }}>
                YOUR LIBRARY · {s.element.toUpperCase()} PLAYLIST · {statePlaylist.length} TRACKS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
                {statePlaylist.map((track, i) => (
                    <a
                      key={track.id}
                      href={track.uri}
                      style={{
                        padding: "10px 14px",
                        border: "1px solid rgba(255,255,255,0.04)",
                        background: "rgba(255,255,255,0.015)",
                        borderRadius: 3, cursor: "pointer",
                        transition: "all 0.3s", display: "flex", alignItems: "center", gap: 12,
                        textDecoration: "none",
                        animation: "fadeUp 0.4s ease both",
                        animationDelay: `${Math.min(i, 15) * 0.03}s`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.color}40`; e.currentTarget.style.background = s.colorDim; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
                    >
                      {track.albumArtSmall && (
                        <img src={track.albumArtSmall} alt="" style={{
                          width: 40, height: 40, borderRadius: 2, objectFit: "cover", flexShrink: 0,
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, color: "#c8c0b4",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {track.name}
                        </div>
                        <div style={{
                          fontSize: 12, color: "#6a6458",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {track.artist}
                        </div>
                      </div>
                      <span style={{ color: "#1DB954", fontSize: 16, flexShrink: 0, opacity: 0.5 }}>
                        ▶
                      </span>
                    </a>
                ))}
              </div>
            </>
          )}

          {/* Curated recommendations */}
          <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: s.color, marginBottom: 14 }}>
            {spotifyConnected && statePlaylist.length > 0 ? "ALSO RECOMMENDED" : `${s.element.toUpperCase()} PLAYLIST — HIGH SOUND OPTIMIZED`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {s.music.map((track, i) => (
              <div key={i} onClick={() => setSelectedCurated(selectedCurated === i ? null : i)} style={{
                padding: "14px 18px",
                border: `1px solid ${selectedCurated === i ? s.color + "40" : "rgba(255,255,255,0.04)"}`,
                background: selectedCurated === i ? s.colorDim : "rgba(255,255,255,0.015)",
                borderRadius: 3, cursor: "pointer", transition: "all 0.3s",
                animation: "fadeUp 0.4s ease both", animationDelay: `${i * 0.05}s`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <span style={{ fontSize: 15, color: "#c8c0b4" }}>{track.artist}</span>
                    <span style={{ fontSize: 13, color: "#6a6458", marginLeft: 10, fontStyle: "italic" }}>{track.album}</span>
                  </div>
                  <span style={{ fontSize: 14, color: `${s.color}60` }}>♫</span>
                </div>
                {selectedCurated === i && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#7a7468", lineHeight: 1.6 }}>
                    {track.why}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Connect Spotify CTA */}
          {!spotifyConnected && (
            <div
              onClick={onOpenSpotify}
              style={{
                marginTop: 16, padding: "14px 16px",
                border: "1px solid rgba(29,185,84,0.2)", borderRadius: 3,
                background: "rgba(29,185,84,0.04)",
                textAlign: "center", cursor: "pointer", transition: "all 0.3s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(29,185,84,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(29,185,84,0.2)"; }}
            >
              <span style={{ fontSize: 13, color: "#1DB954" }}>
                Connect Spotify to see your library sorted by element →
              </span>
            </div>
          )}

          {/* Actions */}
          {spotifyConnected && statePlaylist.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {!playlistsCreated?.[state] && (
                <button onClick={() => onCreatePlaylists(state)} disabled={creatingPlaylists} className="mono" style={{
                  flex: 1, background: "rgba(29,185,84,0.08)",
                  border: "1px solid rgba(29,185,84,0.2)", borderRadius: 3,
                  padding: "10px 14px", color: "#1DB954", fontSize: 9, letterSpacing: 2,
                  cursor: creatingPlaylists ? "wait" : "pointer", fontFamily: "'DM Mono', monospace",
                }}>
                  {creatingPlaylists ? "CREATING..." : "CREATE PLAYLIST ON SPOTIFY"}
                </button>
              )}
              {playlistsCreated?.[state] && (
                <a href={playlistsCreated[state].url} target="_blank" rel="noopener" className="mono" style={{
                  flex: 1, background: "rgba(29,185,84,0.08)",
                  border: "1px solid rgba(29,185,84,0.3)", borderRadius: 3,
                  padding: "10px 14px", color: "#1DB954", fontSize: 9, letterSpacing: 2,
                  textDecoration: "none", textAlign: "center", fontFamily: "'DM Mono', monospace",
                }}>
                  ✓ OPEN IN SPOTIFY
                </a>
              )}
              <button onClick={() => onDiscover(state)} disabled={loadingRecs} className="mono" style={{
                flex: 1, background: `${s.color}08`,
                border: `1px solid ${s.color}25`, borderRadius: 3,
                padding: "10px 14px", color: s.color, fontSize: 9, letterSpacing: 2,
                cursor: loadingRecs ? "wait" : "pointer", fontFamily: "'DM Mono', monospace",
              }}>
                {loadingRecs ? "FINDING..." : "DISCOVER NEW"}
              </button>
            </div>
          )}

          {/* AI Recommendations */}
          {recommendations?.[state]?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: s.color, marginBottom: 12 }}>
                AI RECOMMENDATIONS · {s.element.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {recommendations[state].map((rec, i) => (
                  <div key={i} style={{
                    padding: "12px 16px",
                    border: `1px solid ${s.color}15`,
                    background: `${s.color}04`, borderRadius: 3,
                    animation: "fadeUp 0.4s ease both",
                    animationDelay: `${i * 0.04}s`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <span style={{ fontSize: 14, color: "#c8c0b4" }}>{rec.artist}</span>
                        <span style={{ fontSize: 13, color: "#6a6458", marginLeft: 8 }}>— {rec.track}</span>
                      </div>
                      {rec.spotifyUri && (
                        <a href={rec.spotifyUri} style={{ color: "#1DB954", fontSize: 14, textDecoration: "none", opacity: 0.6 }}>▶</a>
                      )}
                    </div>
                    {rec.album && (
                      <div style={{ fontSize: 12, color: "#5a5650", fontStyle: "italic", marginTop: 2 }}>{rec.album}</div>
                    )}
                    <div style={{ fontSize: 12, color: "#7a7468", marginTop: 6, lineHeight: 1.5 }}>{rec.why}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SPACE TAB ═══ */}
      {activeSection === "space" && (
        <div style={{ animation: "fadeUp 0.3s ease both" }}>
          <div style={{
            padding: "20px 24px", border: `1px solid ${s.color}18`,
            background: `${s.color}06`, borderRadius: 3, marginBottom: 16,
          }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: s.color, marginBottom: 10 }}>
              WORKSPACE
            </div>
            <p style={{ fontSize: 14, color: "#a09a90", lineHeight: 1.9 }}>{s.workspace}</p>
          </div>
          <div style={{
            padding: "20px 24px", border: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.02)", borderRadius: 3, marginBottom: 16,
          }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: "#8a7a6a", marginBottom: 10 }}>
              OPTIMAL ACTIVITIES
            </div>
            <p style={{ fontSize: 14, color: "#a09a90", lineHeight: 1.9 }}>{s.activity}</p>
          </div>
          <div style={{
            padding: "20px 24px", border: "1px solid rgba(200,100,80,0.12)",
            background: "rgba(200,100,80,0.04)", borderRadius: 3,
          }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: "#c07060", marginBottom: 10 }}>
              WAVE WARNING
            </div>
            <p style={{ fontSize: 14, color: "#a09a90", lineHeight: 1.9 }}>{s.avoid}</p>
          </div>
        </div>
      )}

      {/* ═══ GUIDANCE TAB ═══ */}
      {activeSection === "guidance" && (
        <div style={{ animation: "fadeUp 0.3s ease both" }}>
          <div style={{
            padding: 24, border: `1px solid ${s.color}15`,
            background: `${s.color}04`, borderRadius: 3, minHeight: 200,
          }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: s.color, marginBottom: 14 }}>
              AI GUIDANCE · COMING SOON
            </div>
            <p style={{ fontSize: 13, color: "#6a6458", lineHeight: 1.9 }}>
              Personalized AI guidance based on your wave state, check-in history, and the specific tracks
              in your elemental playlist. Requires a backend proxy for the Anthropic API.
            </p>
            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 3 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: "#5a5650", marginBottom: 8 }}>
                WHAT IT WILL DO
              </div>
              <ul style={{ fontSize: 13, color: "#7a7468", lineHeight: 1.9, paddingLeft: 18 }}>
                <li>Read your current {s.element} state and recent wave pattern</li>
                <li>Consider the time of day and your 癸 Water nature</li>
                <li>Give 3-4 sentences of specific, actionable guidance for right now</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reset */}
      <div style={{ textAlign: "center", marginTop: 36 }}>
        <button onClick={onReset} className="mono" style={{
          background: "none", border: "1px solid rgba(255,255,255,0.08)",
          color: "#5a5650", padding: "10px 24px", borderRadius: 2,
          cursor: "pointer", fontSize: 10, letterSpacing: 2,
          fontFamily: "'DM Mono', monospace", transition: "all 0.3s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          CHECK IN AGAIN
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export default function MizuApp() {
  const [screen, setScreen] = useState("home");
  const [currentState, setCurrentState] = useState(null);
  const [history, setHistory] = useState([]);
  const [mounted, setMounted] = useState(false);

  // Spotify
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyData, setSpotifyData] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState(null);
  const [loadPhase, setLoadPhase] = useState(null);

  // Playback
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // AI features
  const [recommendations, setRecommendations] = useState({});
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [creatingPlaylists, setCreatingPlaylists] = useState(false);
  const [playlistsCreated, setPlaylistsCreated] = useState({});

  // Load from localStorage + parse OAuth token from URL hash
  useEffect(() => {
    setMounted(true);
    try {
      const savedHistory = localStorage.getItem("mizu_history");
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      // Check for OAuth callback token in query params
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("spotify_token");
      const oauthError = params.get("spotify_error");

      if (oauthToken) {
        window.history.replaceState(null, "", window.location.pathname);
        connectSpotify(oauthToken);
        return;
      }

      if (oauthError) {
        setSpotifyError(oauthError);
        setShowSpotifyModal(true);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      // Restore cached Spotify data (only if AI-classified format)
      const savedData = localStorage.getItem("mizu_spotify_data");
      const savedUser = localStorage.getItem("mizu_spotify_user");
      if (savedData && savedUser) {
        const parsed = JSON.parse(savedData);
        if (parsed.aiClassified) {
          setSpotifyData(parsed);
          setSpotifyUser(JSON.parse(savedUser));
          setSpotifyConnected(true);
        } else {
          // Old format — clear it, user needs to reconnect
          localStorage.removeItem("mizu_spotify_data");
          localStorage.removeItem("mizu_spotify_user");
          localStorage.removeItem("mizu_spotify_token");
        }
      }
    } catch {}
  }, []);

  // Persist history
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("mizu_history", JSON.stringify(history));
    }
  }, [history]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      clearInterval(progressRef.current);
    };
  }, []);

  // ─── Spotify ───

  const connectSpotify = async (token) => {
    setSpotifyLoading(true);
    setSpotifyError(null);

    try {
      setLoadPhase("Verifying token...");
      const user = await fetchUserProfile(token);

      setLoadPhase("Fetching your library...");
      const tracks = await fetchSavedTracks(token, (loaded, total) => {
        setLoadPhase(`Fetching tracks... ${loaded}/${total}`);
      });

      setLoadPhase("Claude is classifying your music...");
      const data = await aiClassifyTracks(tracks, (phase) => {
        setLoadPhase(phase);
      });

      const userData = { name: user.display_name, id: user.id, image: user.images?.[0]?.url };
      setSpotifyData(data);
      setSpotifyUser(userData);
      setSpotifyConnected(true);
      setShowSpotifyModal(false);

      localStorage.setItem("mizu_spotify_token", token);
      localStorage.setItem("mizu_spotify_data", JSON.stringify(data));
      localStorage.setItem("mizu_spotify_user", JSON.stringify(userData));
    } catch (err) {
      if (err.message === "expired") {
        setSpotifyError("Token expired — grab a fresh one from the Spotify console");
        localStorage.removeItem("mizu_spotify_token");
      } else {
        setSpotifyError(err.message);
      }
    }

    setSpotifyLoading(false);
    setLoadPhase(null);
  };

  const disconnectSpotify = () => {
    setSpotifyConnected(false);
    setSpotifyData(null);
    setSpotifyUser(null);
    localStorage.removeItem("mizu_spotify_token");
    localStorage.removeItem("mizu_spotify_data");
    localStorage.removeItem("mizu_spotify_user");
  };

  const startOAuth = () => {
    window.location.href = "http://127.0.0.1:3001/auth/login?client_id=8bc5ee9cd01649feac6ec71a4854c148";
  };

  // ─── AI Features ───

  const handleCreatePlaylist = async (state) => {
    const token = localStorage.getItem("mizu_spotify_token");
    if (!token || !spotifyUser?.id || !spotifyData?.playlists?.[state]) return;

    setCreatingPlaylists(true);
    try {
      const results = await createAllPlaylists(
        token,
        spotifyUser.id,
        { [state]: spotifyData.playlists[state] },
        (phase) => setLoadPhase(phase),
      );
      setPlaylistsCreated(prev => ({ ...prev, ...results }));
    } catch (err) {
      console.error("Playlist creation failed:", err);
    }
    setCreatingPlaylists(false);
    setLoadPhase(null);
  };

  const handleCreateAllPlaylists = async () => {
    const token = localStorage.getItem("mizu_spotify_token");
    if (!token || !spotifyUser?.id || !spotifyData?.playlists) return;

    setCreatingPlaylists(true);
    try {
      const results = await createAllPlaylists(
        token,
        spotifyUser.id,
        spotifyData.playlists,
        (phase) => setLoadPhase(phase),
      );
      setPlaylistsCreated(results);
    } catch (err) {
      console.error("Playlist creation failed:", err);
    }
    setCreatingPlaylists(false);
    setLoadPhase(null);
  };

  const handleDiscover = async (state) => {
    if (!spotifyData?.playlists?.[state]) return;
    const s = STATES[state];

    setLoadingRecs(true);
    try {
      const recs = await aiRecommend(state, s.element, spotifyData.playlists[state]);

      // Try to find each recommendation on Spotify
      const token = localStorage.getItem("mizu_spotify_token");
      if (token) {
        for (const rec of recs) {
          const found = await searchSpotifyTrack(token, rec.artist, rec.track);
          if (found) {
            rec.spotifyUri = found.uri;
            rec.albumArt = found.albumArt;
          }
        }
      }

      setRecommendations(prev => ({ ...prev, [state]: recs }));
    } catch (err) {
      console.error("Recommendations failed:", err);
    }
    setLoadingRecs(false);
  };

  // ─── Playback (kept for tracks with previews) ───

  const playTrack = useCallback((track) => {
    if (!track.previewUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearInterval(progressRef.current);

    if (currentTrack?.id === track.id && isPlaying) {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTrack(null);
      return;
    }

    const audio = new Audio(track.previewUrl);
    audioRef.current = audio;
    setCurrentTrack(track);
    setProgress(0);

    audio.play().then(() => {
      setIsPlaying(true);
      progressRef.current = setInterval(() => {
        if (audio.duration) {
          setProgress(audio.currentTime / audio.duration);
        }
      }, 200);
    }).catch(() => {
      setIsPlaying(false);
    });

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      clearInterval(progressRef.current);
    };
  }, [currentTrack, isPlaying]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      clearInterval(progressRef.current);
    } else {
      audioRef.current.play();
      progressRef.current = setInterval(() => {
        if (audioRef.current?.duration) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      }, 200);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const stopTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearInterval(progressRef.current);
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
  }, []);

  // ─── Check-in ───

  const handleCheckIn = (state) => {
    setCurrentState(state);
    const entry = {
      state,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString(),
    };
    setHistory(prev => [...prev, entry]);
    setScreen("state");
  };

  const handleReset = () => {
    setScreen("checkin");
    setCurrentState(null);
  };

  const hour = new Date().getHours();
  const isWaterHours = hour >= 21 || hour < 1;

  // ─── Spotify stats for home screen ───
  const spotifyStats = spotifyData ? Object.entries(spotifyData.playlists).map(([key, tracks]) => ({
    key, count: tracks.length, ...STATES[key],
  })) : [];

  return (
    <div style={{
      minHeight: "100vh",
      background: isWaterHours
        ? "linear-gradient(180deg, #04060c 0%, #060810 50%, #08060e 100%)"
        : "linear-gradient(180deg, #0a090e 0%, #0c0a08 50%, #080a0c 100%)",
      color: "#d4d0c4",
      fontFamily: "'EB Garamond', Georgia, serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: currentState
          ? `radial-gradient(ellipse at 50% 30%, ${STATES[currentState]?.colorDim || "transparent"} 0%, transparent 60%)`
          : "radial-gradient(ellipse at 50% 30%, rgba(79,195,247,0.02) 0%, transparent 60%)",
        transition: "all 1s ease",
      }} />

      <div style={{
        position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto",
        padding: "40px 20px 60px",
      }}>

        {/* ═══ HEADER ═══ */}
        <div style={{
          textAlign: "center", marginBottom: screen === "home" ? 60 : 36,
          opacity: mounted ? 1 : 0, transition: "all 0.8s ease",
        }}>
          <div style={{
            fontSize: screen === "home" ? 48 : 28,
            fontFamily: "'Noto Serif SC', serif",
            color: "#4a9ec7", fontWeight: 300, marginBottom: 8,
            transition: "font-size 0.5s ease",
            cursor: screen !== "home" ? "pointer" : "default",
          }} onClick={() => { if (screen !== "home") { setScreen("home"); setCurrentState(null); } }}>
            水
          </div>
          <div className="mono" style={{
            fontSize: screen === "home" ? 11 : 9,
            letterSpacing: 5, color: "#3a4a5a",
            transition: "font-size 0.5s ease",
          }}>
            {screen === "home" ? "MIZU · WAVE STATE OPTIMIZER" : "MIZU"}
          </div>
          {isWaterHours && (
            <div className="mono" style={{
              fontSize: 9, letterSpacing: 3, color: "#2a4a6a",
              marginTop: 12, animation: "breathe 4s ease-in-out infinite",
            }}>
              ● WATER HOURS ACTIVE
            </div>
          )}
        </div>

        {/* ═══ HOME SCREEN ═══ */}
        {screen === "home" && (
          <div style={{ animation: "fadeUp 0.6s ease both", textAlign: "center" }}>
            <p style={{
              fontSize: 16, color: "#7a7468", lineHeight: 1.9,
              maxWidth: 420, margin: "0 auto 40px", fontStyle: "italic",
            }}>
              Ride the wave. Don't fight it.
              <br />
              Check in to find your current state and optimize your environment, sound, and energy.
            </p>

            <button onClick={() => setScreen("checkin")} style={{
              background: "rgba(74,158,199,0.08)",
              border: "1px solid rgba(74,158,199,0.25)",
              color: "#4a9ec7", padding: "16px 40px",
              borderRadius: 3, cursor: "pointer",
              fontSize: 16, fontFamily: "inherit",
              letterSpacing: 1, transition: "all 0.3s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(74,158,199,0.5)"; e.currentTarget.style.background = "rgba(74,158,199,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(74,158,199,0.25)"; e.currentTarget.style.background = "rgba(74,158,199,0.08)"; }}
            >
              Check In
            </button>

            {/* Spotify status */}
            <div style={{ marginTop: 28 }}>
              {spotifyConnected ? (
                <div style={{ animation: "fadeUp 0.4s ease both" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ color: "#1DB954", fontSize: 14 }}>●</span>
                    <span className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "#1DB954" }}>
                      SPOTIFY CONNECTED
                    </span>
                    {spotifyUser?.name && (
                      <span style={{ fontSize: 12, color: "#6a6458" }}>· {spotifyUser.name}</span>
                    )}
                  </div>

                  {/* Elemental distribution */}
                  {spotifyStats.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                      {spotifyStats.filter(s => s.count > 0).map(s => (
                        <div key={s.key} className="mono" style={{ fontSize: 9, letterSpacing: 1, color: s.color }}>
                          {s.glyph} {s.count}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mono" style={{ fontSize: 9, color: "#3a3a3a", marginBottom: 12 }}>
                    {spotifyData?.totalTracks || 0} tracks classified
                    {spotifyData?.aiClassified && " by Claude"}
                  </div>

                  {Object.keys(playlistsCreated).length === 0 ? (
                    <button onClick={handleCreateAllPlaylists} disabled={creatingPlaylists} className="mono" style={{
                      background: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)",
                      color: "#1DB954", padding: "8px 20px", borderRadius: 3, cursor: "pointer",
                      fontSize: 9, letterSpacing: 2, fontFamily: "'DM Mono', monospace",
                      marginBottom: 8,
                    }}>
                      {creatingPlaylists ? loadPhase || "CREATING..." : "CREATE ALL PLAYLISTS ON SPOTIFY"}
                    </button>
                  ) : (
                    <div className="mono" style={{ fontSize: 9, color: "#1DB954", marginBottom: 8 }}>
                      ✓ {Object.keys(playlistsCreated).length} PLAYLISTS CREATED
                    </div>
                  )}

                  <button onClick={disconnectSpotify} className="mono" style={{
                    background: "none", border: "none", color: "#4a4a50",
                    fontSize: 9, letterSpacing: 2, cursor: "pointer",
                    textDecoration: "underline", fontFamily: "'DM Mono', monospace",
                  }}>
                    DISCONNECT
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowSpotifyModal(true)} style={{
                  background: "rgba(29,185,84,0.06)",
                  border: "1px solid rgba(29,185,84,0.2)",
                  color: "#1DB954", padding: "12px 28px",
                  borderRadius: 3, cursor: "pointer",
                  fontSize: 14, fontFamily: "inherit",
                  letterSpacing: 0.5, transition: "all 0.3s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(29,185,84,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(29,185,84,0.2)"; }}
                >
                  Connect Spotify
                </button>
              )}
            </div>

            {/* Quick state select */}
            <div style={{ marginTop: 36 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 3, color: "#3a3a3a", marginBottom: 16 }}>
                OR SELECT STATE DIRECTLY
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(STATES).map(([key, st]) => (
                  <button key={key} onClick={() => { setCurrentState(key); setScreen("state"); }} style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${st.color}20`,
                    borderRadius: 3, padding: "10px 14px",
                    cursor: "pointer", transition: "all 0.3s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = st.color + "50"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = st.color + "20"; }}
                  >
                    <span style={{ fontSize: 18, fontFamily: "'Noto Serif SC', serif", color: st.color }}>{st.glyph}</span>
                    <span className="mono" style={{ fontSize: 8, letterSpacing: 2, color: st.color + "80" }}>{st.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <WaveHistory history={history} />
          </div>
        )}

        {/* ═══ CHECK-IN SCREEN ═══ */}
        {screen === "checkin" && (
          <CheckInScreen onComplete={handleCheckIn} />
        )}

        {/* ═══ STATE VIEW ═══ */}
        {screen === "state" && currentState && (
          <>
            <StateView
              state={currentState}
              onReset={handleReset}
              spotifyData={spotifyData}
              spotifyConnected={spotifyConnected}
              onOpenSpotify={() => setShowSpotifyModal(true)}
              onCreatePlaylists={handleCreatePlaylist}
              onDiscover={handleDiscover}
              recommendations={recommendations}
              loadingRecs={loadingRecs}
              creatingPlaylists={creatingPlaylists}
              playlistsCreated={playlistsCreated}
            />
            <WaveHistory history={history} />
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 48, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="mono" style={{ fontSize: 8, letterSpacing: 4, color: "rgba(255,255,255,0.08)" }}>
            水 · 癸 · 6/2 PROJECTOR · EMOTIONAL AUTHORITY
          </div>
        </div>
      </div>

      {/* Spotify Connect Modal */}
      {showSpotifyModal && (
        <SpotifyConnect
          onConnect={connectSpotify}
          onOAuth={startOAuth}
          onClose={() => { if (!spotifyLoading) setShowSpotifyModal(false); }}
          loading={spotifyLoading}
          phase={loadPhase}
          error={spotifyError}
        />
      )}

      {/* Now Playing */}
      <NowPlaying
        track={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={togglePlay}
        onStop={stopTrack}
        progress={progress}
      />
    </div>
  );
}
