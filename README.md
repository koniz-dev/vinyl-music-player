# 🎵 Vinyl Music Player

A beautiful, modern vinyl music player built with HTML, CSS, and JavaScript. Create stunning music videos with synchronized lyrics and export them as WebM files. Features realistic vinyl record animations and professional video export capabilities.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Now-blue?style=for-the-badge&logo=github)](https://koniz-dev.github.io/vinyl-music-player/)
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
- **Color Customization**: Customize lyrics color with color picker and hex input
- **Color History**: Save and reuse recently used colors
- **Developer Import**: Import lyrics from JSON format for bulk operations

### 🎬 Video Export
- **WebM Format Only**: Create professional music videos with your audio and lyrics (WebM format)
- **High Quality**: Export videos in 720x1280 resolution with album art backgrounds
- **Synchronized Lyrics**: Lyrics appear at exact timing with smooth transitions
- **Progress Tracking**: Real-time export progress with detailed status updates
- **No Conversion**: Direct WebM export without format conversion for faster processing
- **Canvas Rendering**: High-quality canvas-based video rendering with custom colors
- **Cross-browser Support**: Works with modern browsers supporting MediaRecorder API
- **Custom Colors**: Export videos with your customized lyrics colors

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
- **Color Management**: Advanced color picker with hex input and history
- **Developer Tools**: JSON import for bulk lyrics management
- **Browser Support Check**: Built-in compatibility testing

## 🔮 Future Features

### 📹 Enhanced Video Export
- **MP4 Export**: Support for MP4 video format export for broader compatibility
- **Multiple Resolutions**: Export options for different video resolutions (480p, 720p, 1080p)
- **Custom Video Settings**: Adjustable bitrate, frame rate, and quality settings
- **Batch Export**: Export multiple videos at once
- **Video Templates**: Pre-designed templates for different social media platforms

## 🚀 Quick Start

### 🌐 Live Demo
**Try it now!** Visit the live demo: [https://koniz-dev.github.io/vinyl-music-player/](https://koniz-dev.github.io/vinyl-music-player/)

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
   - **Local Development**: Open your browser and navigate to `http://localhost:3000`
   - **Direct File**: Open `index.html` directly in your browser

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
- **Developer Option**: Click **"For Dev"** to import lyrics from JSON format for bulk operations

### 4. Customize Lyrics Color
- Use the **Color Picker** to select a custom color for your lyrics
- Enter a **Hex Color Code** directly in the text input (e.g., #FF5733)
- **Copy** hex codes with the copy button for easy sharing
- **Reset** to default color (#8B4513) anytime
- **Recent Colors** are saved automatically for quick access

### 5. Control Playback
- **Play/Pause**: Click the play button to start/stop music
- **Progress Bar**: Click anywhere on the progress bar to jump to that time
- **Mute**: Toggle audio on/off
- **Repeat**: Enable/disable repeat mode
- **Volume**: Adjust using your system volume controls

### 6. Export Video
- Click **"Export WebM Video"** when ready
- The export process will create a 720x1280 WebM video with your audio and lyrics
- Your custom lyrics colors will be preserved in the exported video
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

## 🚀 Deployment

### GitHub Pages
This project is deployed on GitHub Pages and is available at:
**Live Demo**: [https://koniz-dev.github.io/vinyl-music-player/](https://koniz-dev.github.io/vinyl-music-player/)

#### Deployment Steps:
1. **Enable GitHub Pages** in your repository settings
2. **Select Source**: Choose "Deploy from a branch" → "main" branch
3. **Automatic Deployment**: Every push to main branch automatically updates the live site
4. **Custom Domain** (optional): Configure a custom domain in Pages settings

#### Benefits:
- **Free Hosting**: No cost for static site hosting
- **Automatic Updates**: Deploys automatically on code changes
- **HTTPS**: Secure connection by default
- **Global CDN**: Fast loading worldwide
- **Custom 404**: Support for custom error pages

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
├── LICENSE                       # MIT License file
├── favicon/                      # Favicon and PWA icons
│   ├── favicon.ico               # Main favicon
│   ├── favicon-16x16.png         # 16x16 favicon
│   ├── favicon-32x32.png         # 32x32 favicon
│   ├── apple-touch-icon.png      # Apple touch icon
│   ├── android-chrome-192x192.png # Android Chrome icon (192x192)
│   ├── android-chrome-512x512.png # Android Chrome icon (512x512)
│   └── site.webmanifest          # PWA manifest file
├── js/                           # JavaScript modules
│   ├── core/                     # Core application systems
│   │   ├── app-state.js          # Application state management
│   │   └── event-bus.js          # Event communication system
│   ├── modules/                  # Feature modules
│   │   ├── audio-player.js       # Audio playback and controls
│   │   ├── lyrics-manager.js     # Lyrics timing and display
│   │   ├── vinyl-renderer.js     # Vinyl player visual rendering
│   │   ├── export-manager.js     # Video export functionality
│   │   ├── export-manager-canvas.js # Canvas-based export rendering
│   │   ├── lyrics-color-manager.js # Lyrics color customization
│   │   └── settings-manager.js   # Settings panel management
│   ├── utils/                    # Utility functions
│   │   ├── time-utils.js         # Time formatting utilities
│   │   └── file-utils.js         # File handling utilities
│   ├── index.js                  # Main application entry point
│   └── toast.js                  # Toast notification system
└── styles/                       # CSS stylesheets
    ├── variables.css             # CSS custom properties and variables
    ├── base.css                  # Base styles and resets
    ├── layout.css                # Layout and grid systems
    ├── components.css            # Reusable component styles
    ├── forms.css                 # Form and input styles
    ├── music-player.css          # Vinyl player specific styles
    ├── responsive.css            # Responsive design styles
    ├── index.css                 # Main page layout and styles
    └── toast.css                 # Toast notification styles
```

## 🎨 Customization

### Styling
- Modify CSS variables in the `variables.css` file
- Change colors, fonts, and animations
- Adjust the vinyl player size and positioning
- Customize lyrics colors with the built-in color picker

### Functionality
- Add new control buttons
- Modify the lyrics timing system
- Add new export formats
- Use developer tools for bulk lyrics import

## 🛠️ Developer Features

### JSON Lyrics Import
- **Bulk Import**: Import multiple lyrics at once using JSON format
- **Developer Modal**: Access via "For Dev" button in the lyrics section
- **JSON Format**: Use array of objects with `start`, `end`, and `text` properties
- **Example Format**:
  ```json
  [
    {"start": "00:18", "end": "00:21", "text": "I wake up in the familiar room"},
    {"start": "00:22", "end": "00:24", "text": "Where your hand once rested"}
  ]
  ```

### Color Management System
- **Color Picker**: Visual color selection with real-time preview
- **Hex Input**: Direct hex color code input with validation
- **Color History**: Automatic saving of recently used colors
- **Local Storage**: Persistent color preferences across sessions
- **Export Integration**: Custom colors are preserved in video exports

### Browser Compatibility Check
- **Built-in Testing**: Check browser support for video export features
- **MediaRecorder API**: Verify WebM export compatibility
- **Canvas Support**: Test canvas rendering capabilities
- **Error Handling**: Comprehensive error messages and fallbacks

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
- Check if lyrics color is set to a visible color
- Verify JSON import format if using developer features

**Vinyl Not Spinning**
- Ensure audio is loaded and playing
- Check that the vinyl player is visible on screen
- Try refreshing the page

**Color Customization Issues**
- Check that hex color codes are valid (e.g., #FF5733)
- Ensure color picker is working in your browser
- Try resetting to default color if custom colors don't work
- Clear browser cache if color history isn't saving

**JSON Import Problems**
- Verify JSON format is valid (use JSON validator)
- Check that start/end times are in MM:SS format
- Ensure all required fields (start, end, text) are present
- Make sure text content is not empty

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

### International Support
This project supports multiple languages and is developed with international users in mind. The interface and documentation are available in English with support for various languages.

### Language Features
- **Interface**: Clean, intuitive design that works in any language
- **Lyrics Support**: Add lyrics in any language including international languages
- **Documentation**: README available in English
- **Community**: International developer community support

## 🎵 Enjoy Your Music!

Create beautiful music videos with your favorite songs and share them with the world. The Vinyl Music Player makes it easy to create professional-looking content with just a few clicks.

Perfect for:
- **Content Creators**: Create engaging music videos for social media
- **Musicians**: Showcase your music with synchronized lyrics
- **Music Lovers**: Create personalized music videos
- **Educators**: Use for music education and presentations

---

**Made with ❤️ by [koniz-dev](https://github.com/koniz-dev)**
