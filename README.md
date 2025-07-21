# Thailand Spectrum Chart

A comprehensive web application for visualizing and analyzing Thailand's National Frequency Allocation Chart and Unlicensed Frequency Table.

## 🚀 Overview

This interactive web application provides a visual representation of Thailand's radio frequency spectrum allocation, allowing users to explore frequency bands, their allocated services, and applications. The tool supports both National Frequency Allocation and Unlicensed Frequency tables with advanced filtering and search capabilities.

## ✨ Features

### Core Functionality
- **Interactive Spectrum Chart**: Visual representation of frequency allocations using HTML5 Canvas
- **Dual Chart Types**: 
  - Thailand National Frequency Allocation Chart
  - Thailand Unlicensed Frequency Table
- **Advanced Filtering**: Filter by frequency range with support for Hz, kHz, MHz, and GHz units
- **Legend Search**: Real-time search functionality for services and applications
- **Responsive Legend**: Toggle between vertical and horizontal legend display

### User Interface
- **Mobile Detection**: Automatic detection with "device not supported" message for mobile devices
- **Frequency Range Input**: Start/stop frequency filtering with unit selection
- **Interactive Elements**: Clickable frequency blocks with hover effects
- **Clean Design**: Bootstrap-based responsive layout with custom styling

## 🏗️ Project Structure

```
Spectrum-chart-new-hope/
├── index.html          # Main HTML interface
├── CreateChart.js      # Core JavaScript logic and chart generation
├── css.css            # Custom styles and animations
├── datasource.xlsx    # Frequency allocation data source
├── spectrum_icon.jpg  # Application favicon
└── README.md          # Project documentation
```

## 🛠️ Technical Stack

### Frontend Technologies
- **HTML5**: Semantic markup with Canvas API for chart rendering
- **CSS3**: Custom styling with animations and responsive design
- **JavaScript (ES5+)**: Core application logic and DOM manipulation
- **Bootstrap 5.0**: UI framework for responsive layout
- **jQuery 3.5.1**: DOM manipulation and event handling

### External Libraries
- **SheetJS (xlsx.js)**: Excel file parsing for data source processing
- **jQuery UI**: Enhanced user interface interactions
- **Popper.js**: Tooltip and popover positioning
- **Google Fonts**: Sarabun font family for Thai language support

## 📊 Data Management

### Data Source
- **Format**: Excel (.xlsx) file containing frequency allocation data
- **Processing**: Client-side parsing using SheetJS library
- **Structure**: Multiple sheets for different chart types

### Key Data Arrays
- `jsonDataArray`: Main frequency allocation data
- `colorArray`: Color mapping for frequency blocks
- `ServiceArray`: Available services for filtering
- `ApplicationArray`: Available applications for filtering
- `frequencyLabelArray`: Frequency labels for chart display

## 🎯 Core Features

### Chart Visualization
- **Canvas Rendering**: High-performance HTML5 Canvas-based chart rendering
- **Dynamic Sizing**: Responsive chart dimensions based on screen size
- **Color Coding**: Visual distinction between different services and applications
- **Interactive Blocks**: Clickable frequency allocation blocks

### Filtering System
- **Frequency Range**: Filter by start and stop frequencies
- **Unit Conversion**: Support for Hz, kHz, MHz, and GHz units
- **Legend Search**: Real-time filtering of services and applications
- **Dynamic Updates**: Live chart updates based on filter criteria

### Legend Management
- **Vertical/Horizontal Toggle**: Switch between legend orientations
- **Search Functionality**: Real-time search through services and applications
- **Selection State**: Visual indication of selected/unselected items
- **Responsive Design**: Adaptive layout for different screen sizes

## 🚀 Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Local web server (recommended for Excel file loading)

### Installation
1. Clone or download the project files
2. Ensure all files are in the same directory
3. Open `index.html` in a web browser or serve via local web server

### Usage
1. **Select Chart Type**: Choose between National Frequency Allocation or Unlicensed Frequency Table
2. **Filter by Frequency**: Enter start and stop frequencies with appropriate units
3. **Search Legend**: Use the search box to filter services/applications
4. **Toggle Legend**: Switch between vertical and horizontal legend display
5. **Interact with Chart**: Click on frequency blocks for detailed information

## 🎨 Customization

### Visual Configuration
- `height_factor`: Adjust frequency block height (default: 0.07)
- `height_newline_factor`: Control spacing between rows (default: 10)
- `label_font_size`: Set label font size in pixels (default: 10)

### Responsive Behavior
- Automatic mobile device detection
- Dynamic chart resizing on window resize
- Responsive legend layout adaptation

## 📱 Browser Compatibility

### Supported Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Mobile Support
- Currently optimized for desktop use
- Mobile devices show "not supported" message
- Future mobile optimization planned

## 🔧 Development

### File Organization
- **index.html**: Main application interface and structure
- **CreateChart.js**: Core JavaScript functionality and chart logic
- **css.css**: Custom styles, animations, and responsive design
- **datasource.xlsx**: Data source for frequency allocations

### Key Functions (CreateChart.js)
- Chart initialization and rendering
- Excel data parsing and processing
- Frequency filtering and search
- Legend management and display
- Responsive sizing and events

## 📈 Performance

### Optimization Features
- Efficient Canvas rendering for large datasets
- Responsive image and resource loading
- Optimized data structures for filtering operations
- Smooth animations with CSS transitions

### Resource Management
- External CDN resources for libraries
- Optimized image formats
- Efficient DOM manipulation strategies

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Make changes to appropriate files
3. Test functionality across browsers
4. Submit pull request with detailed description

### Code Style
- Use clear, descriptive variable names
- Comment complex logic sections
- Follow existing indentation patterns
- Maintain responsive design principles

## 📄 License

This project is developed for educational and informational purposes related to Thailand's frequency spectrum allocation.

## 📞 Support

For technical issues or questions about frequency allocation data, please refer to the relevant telecommunications regulatory authorities in Thailand.

---

*This application provides visualization of Thailand's radio frequency spectrum allocation for educational and reference purposes.*