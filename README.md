# 🎵 Vinyl Music Player

A beautiful, modern vinyl music player built with HTML, CSS, and JavaScript. Create stunning music videos with synchronized lyrics and export them as MP4 files.

![Vinyl Music Player](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

## ✨ Features

### 🎧 Music Player
- **Vinyl Record Animation**: Realistic spinning vinyl with tonearm animation
- **Audio Controls**: Play, pause, mute, repeat, and progress scrubbing
- **Real-time Visualizer**: Dynamic audio visualization bars
- **Album Art Support**: Beautiful background effects with album artwork
- **Responsive Design**: Works perfectly on desktop and mobile devices

### 📝 Lyrics System
- **Synchronized Lyrics**: Time-based lyrics display with smooth transitions
- **Multiple Lyrics Tracks**: Add multiple lyrics with custom timing
- **Real-time Updates**: Lyrics appear and disappear based on audio timing
- **Easy Management**: Add, edit, and remove lyrics through the settings panel

### 🎬 Video Export
- **MP4 Export**: Create professional music videos with your audio and lyrics
- **High Quality**: Export videos with album art backgrounds and synchronized lyrics
- **Progress Tracking**: Real-time export progress with detailed status updates
- **Cross-browser Support**: Works with modern browsers supporting MediaRecorder API

### 🎨 Beautiful UI
- **Modern Design**: Clean, minimalist interface with smooth animations
- **Gradient Backgrounds**: Stunning visual effects and color schemes
- **Interactive Elements**: Hover effects, smooth transitions, and responsive feedback
- **Custom Fonts**: Beautiful typography with Patrick Hand font family

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Node.js (optional, for development server)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/koniz-dev/vinyl-music-player.git
   cd vinyl-music-player
   ```

2. **Install dependencies** (optional)
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Or simply open `index.html` in your browser.

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Or open `index.html` directly in your browser

## 📖 How to Use

### 1. Upload Your Music
- Click on the **Audio File** upload area in the settings panel
- Select an MP3 file from your computer
- The music will automatically start playing

### 2. Add Song Information
- **Song Title**: Enter the name of your song (required)
- **Artist Name**: Enter the artist name (optional)
- **Album Art**: Upload an image file for the album cover (optional)

### 3. Add Lyrics (Optional)
- Click **"Add Lyrics"** to create a new lyrics entry
- Set the **Start Time** and **End Time** in MM:SS format
- Enter the **Lyrics Content** for that time period
- Add multiple lyrics entries for the entire song

### 4. Export Video
- Click **"Export MP4 Video"** when ready
- Wait for the export process to complete
- Download your custom music video

## 🎯 Features in Detail

### Vinyl Player Interface
- **Spinning Animation**: The vinyl record spins while music is playing
- **Tonearm Movement**: Realistic tonearm positioning and movement
- **Progress Bar**: Click to scrub through the audio timeline
- **Control Buttons**: Play/pause, mute, repeat, and navigation controls

### Settings Panel
- **File Upload**: Drag & drop or click to upload audio and image files
- **Real-time Updates**: Changes are immediately reflected in the player
- **Lyrics Management**: Easy-to-use interface for adding and managing lyrics
- **Export Controls**: One-click video export with progress tracking

### Video Export
- **High Resolution**: Exports videos in high quality
- **Synchronized Content**: Lyrics appear at the exact timing you specify
- **Album Art Background**: Beautiful blurred album art as background
- **Professional Quality**: Suitable for social media and sharing

## 🛠️ Technical Details

### Architecture
- **Frontend Only**: Pure HTML, CSS, and JavaScript
- **No Backend Required**: Everything runs in the browser
- **MediaRecorder API**: For video export functionality
- **Canvas API**: For rendering the vinyl player and effects

### Browser Support
- **Chrome**: Full support including video export
- **Firefox**: Full support including video export
- **Edge**: Full support including video export
- **Safari**: Basic support (video export may have limitations)

### File Structure
```
vinyl-music-player/
├── index.html              # Main application entry point
├── package.json            # Project configuration
├── package-lock.json       # Dependency lock file
├── README.md              # This file
├── favicon/               # Favicon and PWA icons
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   └── site.webmanifest   # PWA manifest
├── js/                    # JavaScript files
│   ├── index.js           # Main application logic
│   ├── settings.js        # Settings panel functionality
│   ├── vinyl-player.js    # Vinyl player controls
│   └── vinyl-player-export.js # Video export functionality
└── styles/                # CSS stylesheets
    ├── common.css         # Shared styles and utilities
    ├── index.css          # Main page styles
    ├── settings.css       # Settings panel styles
    └── vinyl-player.css   # Vinyl player styles
```

## 🎨 Customization

### Styling
- Modify CSS variables in the `<style>` sections
- Change colors, fonts, and animations
- Adjust the vinyl player size and positioning

### Functionality
- Add new control buttons
- Modify the lyrics timing system
- Enhance the visualizer effects
- Add new export formats

## 🐛 Troubleshooting

### Common Issues

**Video Export Not Working**
- Ensure you're using a supported browser (Chrome, Firefox, Edge)
- Check that MediaRecorder API is supported
- Try with a shorter audio file first

**Audio Not Playing**
- Check that the audio file format is supported (MP3 recommended)
- Ensure the file is not corrupted
- Try refreshing the page

**Lyrics Not Appearing**
- Verify the timing format is correct (MM:SS)
- Check that start time is before end time
- Ensure lyrics content is not empty

### Browser Compatibility
- **Chrome 60+**: Full support
- **Firefox 55+**: Full support
- **Edge 79+**: Full support
- **Safari 14+**: Basic support

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Add comments for complex functionality
- Test your changes in multiple browsers
- Update documentation if needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Font**: Patrick Hand from Google Fonts
- **Icons**: Unicode emoji characters
- **Inspiration**: Classic vinyl record players
- **Community**: Thanks to all contributors and users

## 📞 Support

If you encounter any issues or have questions:

- **Create an Issue**: [GitHub Issues](https://github.com/koniz-dev/vinyl-music-player/issues)
- **Contact**: [koniz-dev](https://github.com/koniz-dev)

## 🎵 Enjoy Your Music!

Create beautiful music videos with your favorite songs and share them with the world. The Vinyl Music Player makes it easy to create professional-looking content with just a few clicks.

---

**Made with ❤️ by [koniz-dev](https://github.com/koniz-dev)**
