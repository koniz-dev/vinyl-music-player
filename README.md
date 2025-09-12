# 🎵 Vinyl Music Player

A beautiful, modern vinyl music player built with HTML, CSS, and JavaScript. Create stunning music videos with synchronized lyrics and export them as WebM files. Features realistic vinyl record animations and professional video export capabilities.

![Vinyl Music Player](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

## ✨ Features

### 🎧 Music Player
- **Vinyl Record Animation**: Realistic spinning vinyl with tonearm animation and groove effects
- **Audio Controls**: Play, pause, mute, repeat, and progress scrubbing with click-to-seek
- **Album Art Support**: Beautiful background effects with album artwork integration
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Progress Tracking**: Real-time progress display with current time and duration

### 📝 Lyrics System
- **Synchronized Lyrics**: Time-based lyrics display with smooth transitions
- **Multiple Lyrics Tracks**: Add multiple lyrics with custom timing
- **Real-time Updates**: Lyrics appear and disappear based on audio timing
- **Easy Management**: Add, edit, and remove lyrics through the settings panel

### 🎬 Video Export
- **WebM Format Only**: Create professional music videos with your audio and lyrics (WebM format)
- **High Quality**: Export videos in 720x1280 resolution with album art backgrounds
- **Synchronized Lyrics**: Lyrics appear at exact timing with smooth transitions
- **Progress Tracking**: Real-time export progress with detailed status updates
- **No Conversion**: Direct WebM export without format conversion for faster processing
- **Canvas Rendering**: High-quality canvas-based video rendering
- **Cross-browser Support**: Works with modern browsers supporting MediaRecorder API

### 🎨 Beautiful UI
- **Modern Design**: Clean, minimalist interface with smooth animations
- **Gradient Backgrounds**: Stunning visual effects and color schemes
- **Interactive Elements**: Hover effects, smooth transitions, and responsive feedback
- **Custom Fonts**: Beautiful typography with Patrick Hand font family

### 📱 Progressive Web App (PWA)
- **Offline Support**: Works without internet connection
- **App-like Experience**: Install as a native app on mobile devices
- **Responsive Design**: Optimized for all screen sizes
- **Fast Loading**: Optimized performance with service worker support

### 🎛️ Advanced Controls
- **Drag & Drop**: Easy file upload with drag and drop support
- **Real-time Preview**: See changes instantly in the vinyl player
- **Export Progress**: Detailed progress tracking during video export
- **Error Handling**: Comprehensive error messages and recovery options

## 🔮 Future Features

### 📹 Enhanced Video Export
- **MP4 Export**: Support for MP4 video format export for broader compatibility
- **Multiple Resolutions**: Export options for different video resolutions (480p, 720p, 1080p)
- **Custom Video Settings**: Adjustable bitrate, frame rate, and quality settings
- **Batch Export**: Export multiple videos at once
- **Video Templates**: Pre-designed templates for different social media platforms

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
- Click on the **Audio File** upload area in the settings panel (left side)
- Select an MP3, WAV, or other supported audio file from your computer
- The music will automatically start playing and the vinyl will begin spinning
- Use the play/pause button to control playback

### 2. Add Song Information
- **Song Title**: Enter the name of your song (required for display)
- **Artist Name**: Enter the artist name (optional, for display)
- **Album Art**: Upload an image file (JPG, PNG) for the album cover (optional)
- Changes are reflected immediately in the vinyl player

### 3. Add Lyrics (Optional)
- Click **"Add Lyrics"** to create a new lyrics entry
- Set the **Start Time** and **End Time** in MM:SS format (e.g., 01:30)
- Enter the **Lyrics Content** for that time period
- Add multiple lyrics entries to cover the entire song
- Lyrics will appear automatically during playback at the specified times
- Use the "×" button to remove individual lyrics entries

### 4. Control Playback
- **Play/Pause**: Click the play button to start/stop music
- **Progress Bar**: Click anywhere on the progress bar to jump to that time
- **Mute**: Toggle audio on/off
- **Repeat**: Enable/disable repeat mode
- **Volume**: Adjust using your system volume controls

### 5. Export Video
- Click **"Export WebM Video"** when ready
- The export process will create a 720x1280 WebM video with your audio and lyrics
- Wait for the WebM export process to complete (progress is shown)
- Download your custom WebM music video automatically when finished

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
- **WebM Format**: Exports videos in WebM format for broad compatibility
- **High Resolution**: Exports videos in 720x1280 high quality
- **Synchronized Content**: Lyrics appear at the exact timing you specify
- **Album Art Background**: Beautiful blurred album art as background
- **Professional Quality**: Suitable for social media and sharing

## 🛠️ Technical Details

### Architecture
- **Frontend Only**: Pure HTML, CSS, and JavaScript
- **No Backend Required**: Everything runs in the browser
- **MediaRecorder API**: For video export functionality
- **Canvas API**: For rendering the vinyl player and effects
- **Web Audio API**: For audio processing and visualization
- **File API**: For handling audio and image uploads
- **PWA Support**: Service worker and manifest for app-like experience

### Browser Support
- **Chrome**: Full support including video export
- **Firefox**: Full support including video export
- **Edge**: Full support including video export
- **Safari**: Basic support (video export may have limitations)

### File Structure
```
vinyl-music-player/
├── index.html                    # Main application entry point
├── package.json                  # Project configuration and dependencies
├── package-lock.json             # Dependency lock file
├── README.md                     # Project documentation
├── favicon/                      # Favicon and PWA icons
│   ├── favicon.ico               # Main favicon
│   ├── favicon-16x16.png         # 16x16 favicon
│   ├── favicon-32x32.png         # 32x32 favicon
│   ├── apple-touch-icon.png      # Apple touch icon
│   ├── android-chrome-192x192.png # Android Chrome icon (192x192)
│   ├── android-chrome-512x512.png # Android Chrome icon (512x512)
│   └── site.webmanifest          # PWA manifest file
├── js/                           # JavaScript modules
│   ├── index.js                  # Main application logic and initialization
│   ├── settings.js               # Settings panel and lyrics management
│   ├── vinyl-player.js           # Vinyl player controls and animations
│   └── vinyl-player-export.js    # Video export functionality
└── styles/                       # CSS stylesheets
    ├── common.css                # Shared styles and utilities
    ├── index.css                 # Main page layout and styles
    ├── settings.css              # Settings panel styles
    └── vinyl-player.css          # Vinyl player specific styles
```

## 🎨 Customization

### Styling
- Modify CSS variables in the `<style>` sections
- Change colors, fonts, and animations
- Adjust the vinyl player size and positioning

### Functionality
- Add new control buttons
- Modify the lyrics timing system
- Add new export formats

## 📁 Supported File Formats

### Audio Files
- **MP3**: Recommended format, best compatibility
- **WAV**: High quality, larger file size
- **OGG**: Open source format
- **M4A**: Apple format
- **AAC**: Advanced audio coding

### Image Files
- **JPG/JPEG**: Recommended for album art
- **PNG**: Supports transparency
- **WebP**: Modern format with good compression

## 🐛 Troubleshooting

### Common Issues

**Video Export Not Working**
- Ensure you're using a supported browser (Chrome, Firefox, Edge)
- Check that MediaRecorder API is supported
- Try with a shorter audio file first
- Make sure you have sufficient disk space for the export

**Audio Not Playing**
- Check that the audio file format is supported (MP3 recommended)
- Ensure the file is not corrupted
- Try refreshing the page
- Check browser console for error messages

**Lyrics Not Appearing**
- Verify the timing format is correct (MM:SS)
- Check that start time is before end time
- Ensure lyrics content is not empty
- Make sure the audio is playing when the lyrics should appear

**Vinyl Not Spinning**
- Ensure audio is loaded and playing
- Check that the vinyl player is visible on screen
- Try refreshing the page

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

## 🌏 Multi-language Support

### Vietnamese (Tiếng Việt)
This project supports Vietnamese language and is developed by a Vietnamese developer. The interface and documentation are available in both English and Vietnamese.

### Language Features
- **Interface**: Clean, intuitive design that works in any language
- **Lyrics Support**: Add lyrics in any language including Vietnamese
- **Documentation**: README available in multiple languages
- **Community**: Vietnamese developer community support

## 🎵 Enjoy Your Music!

Create beautiful music videos with your favorite songs and share them with the world. The Vinyl Music Player makes it easy to create professional-looking content with just a few clicks.

Perfect for:
- **Content Creators**: Create engaging music videos for social media
- **Musicians**: Showcase your music with synchronized lyrics
- **Music Lovers**: Create personalized music videos
- **Educators**: Use for music education and presentations

---

**Made with ❤️ by [koniz-dev](https://github.com/koniz-dev)**
