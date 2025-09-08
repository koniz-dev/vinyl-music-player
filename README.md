# Vinyl Music Player

A beautiful vinyl music player interface built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎵 Vinyl record animation with spinning effect
- 🎨 Dark, melancholic aesthetic with city lights background
- 💔 Broken heart album art with glowing effects
- 🎛️ Music controls (play, pause, next, previous)
- 📊 Progress bar with time display
- 📱 Responsive design

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Technologies Used

- Next.js 15
- TypeScript
- Tailwind CSS
- React 19

## Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── components/
    ├── AlbumArt.tsx
    ├── Background.tsx
    ├── MusicControls.tsx
    ├── MusicPlayer.tsx
    ├── ProgressBar.tsx
    ├── RecordArm.tsx
    ├── TopControls.tsx
    └── VinylRecord.tsx
```

## Customization

The player is fully customizable through Tailwind CSS classes and component props. You can easily modify:

- Colors and themes
- Animation speeds
- Layout and spacing
- Music controls functionality