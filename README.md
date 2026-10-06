# 🧭 Nomad - Personal MVP Consolidation

<div align="center">

**Plan destination -> Drive the highway -> Review what you completed**

Built with React Native and Expo. Currently in solo-founder consolidation mode.

[Core Loop](#-core-loop-v01-focus) • [Quick Start](#-quick-start) • [Consolidation Docs](#-consolidation-docs) • [Status](#-status)

</div>

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.19+ (SDK 57 also supports 22.13+ and 24.3+)
- Expo CLI
- Google Maps API key
- Google Gemini API key

### Installation

   ```bash
# Install dependencies
   npm install

# Create .env file
cp .env.example .env
# Add your API keys to .env

# Start the app
   npx expo start
   ```

### Run on Device
- **iOS**: Scan QR code with Camera app
- **Android**: Scan QR code with Expo Go app
- **Web**: Press `w` in terminal

---

## 🎯 Core Loop (v0.1 Focus)

Nomad is currently focused on one loop for highway roadtrippers:

1. Pick a highway or stretch to complete
2. Drive it (place identity + record + check off counties/exits)
3. Review the atlas and travel log; ask Pathfinder where to go next, or for the next unfinished miles

Primary MVP surfaces:
- Home (`app/(tabs)/index.tsx`)
- GPS (`app/(tabs)/recorder.tsx`)
- Checklist (`app/(tabs)/explore.tsx`)
- Travel Log (`app/(tabs)/travel-log.tsx`)
- Pathfinder (`app/(tabs)/ai-assistant.tsx`) — destination plans plus stay-on-highway routing

Secondary features (Bookings/Achievements) remain implemented but are not current release-gating scope.

Product north star: [docs/PRODUCT.md](./docs/PRODUCT.md)

---

## 📚 Consolidation Docs

- **[October MVP](./docs/mvp-october/README.md)** - four phase dashboards for the TestFlight ship
- **[Product](./docs/PRODUCT.md)** - extra-miler north star
- **[Consolidation Plan](./docs/CONSOLIDATION_PLAN.md)** - 14-day scope and hardening plan
- **[State of the Union](./docs/STATE_OF_UNION.md)** - implemented vs verified vs unverified
- **[Consolidation Workboard](./docs/CONSOLIDATION_WORKBOARD.md)** - pointer to October boards
- **[Priority Buckets](./docs/PRIORITY_BUCKETS.md)** - ship blockers, post-v0.1, and vision backlog
- **[MVP Release Gate](./docs/MVP_RELEASE_GATE.md)** - pass/fail ship criteria
- **[MVP Test Run Log](./docs/MVP_TEST_RUN_LOG.md)** - repeatable run evidence
- **[First Hour Back](./docs/FIRST_HOUR_BACK.md)** - focused re-entry flow
- **[Checklists Index](./CHECKLISTS.md)** - all test/checklist docs

---

## 📌 Status

Current state:
- Extra-miler prototype on Expo SDK 57
- October ship is TestFlight (`docs/mvp-october/README.md`), not Expo Go
- Release target is a stable personal MVP (`v0.1`) focused on core loop quality

Detailed execution and priorities are tracked in `docs/CONSOLIDATION_PLAN.md`.

---

## 🏗️ Project Structure

```
nomad/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home (color picker & quick actions)
│   │   ├── ai-assistant.tsx  # Pathfinder AI chat
│   │   ├── recorder.tsx   # GPS trip recorder with map
│   │   ├── travel-log.tsx # Travel log (trip history)
│   │   └── explore.tsx    # Explorer/checklist (secondary)
│   └── trip/[id].tsx      # Trip detail view
├── components/            # React components
│   ├── ai-chat.tsx       # AI chat interface
│   ├── recorder-hud.tsx  # Recording controls HUD
│   ├── maybe-map.tsx     # Cross-platform map wrapper
│   └── ...
├── hooks/                 # Custom React hooks
│   ├── use-trip-tracking.ts  # GPS tracking logic
│   ├── use-gemini.ts     # AI integration
│   └── ...
├── services/             # External services
│   └── gemini-ai.ts      # Google Gemini AI service
├── utils/                # Utility functions
│   ├── storage.ts        # AsyncStorage operations
│   ├── calculations.ts   # Distance & time calculations
│   └── location.ts       # GPS utilities
├── types/                # TypeScript types
└── constants/            # App constants (colors, etc.)
```

---

## 🛠️ Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based navigation
- **Google Maps** - Map visualization
- **Google Gemini AI** - AI-powered assistant
- **Expo Location** - GPS tracking
- **AsyncStorage** - Local data persistence

---

## 🔑 Environment Variables

Create a `.env` file from `.env.example` for Expo Go / web. For TestFlight, put the same names on expo.dev → Project → Environment variables → **production** (see `docs/mvp-october/phase-1-install.md`). Never commit real keys.

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key_here
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### Required Google Cloud APIs
- Maps SDK for Android
- Maps SDK for iOS
- Maps JavaScript API
- Geocoding API
- Directions API
- Places API (New)
- Generative Language API (Gemini)

See setup and testing docs via `CHECKLISTS.md` and `docs/`.

---

## 📱 Screenshots

*(Coming soon - GPS navigation screenshots after Week 1 implementation)*

---

## 🤝 Contributing

This is a personal project currently in active development. Contributions, issues, and feature requests are welcome!

---

## 📄 License

This project is private and proprietary.

---

## 🎯 Current Priority

Stabilize `v0.1` extra-miler loop on a TestFlight binary:
- Plan destination / stay on highway
- Navigate, record, check off road/town/county
- Review trip in Travel Log

---

<div align="center">

Built with ❤️ using React Native & Expo

**Where to next, Chief?** 🧭

</div>
