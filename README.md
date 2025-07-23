# Thailand Spectrum Chart

A high-performance web application for visualizing Thailand's National Frequency Allocation Chart and Unlicensed Frequency Table.

## 🎯 Overview

Interactive spectrum visualization tool for exploring Thailand's radio frequency allocations with advanced filtering and search capabilities.

## 🏗️ Architecture

**Single-Page Application (SPA)**
- Frontend-only architecture with client-side data processing
- Performance-optimized vanilla JavaScript with utility libraries
- Responsive Bootstrap UI with custom CSS styling

## 🛠️ Tech Stack

### Core Technologies
- **HTML5**: Canvas API for chart rendering
- **CSS3**: Custom animations and responsive design
- **JavaScript (ES6+)**: Modular code with performance optimizations
- **Bootstrap 5.0**: UI framework
- **jQuery 3.5.1**: DOM manipulation

### External Libraries
- **SheetJS (xlsx.js)**: Excel data parsing
- **jQuery UI**: Enhanced interactions
- **Popper.js**: Tooltip positioning
- **Google Fonts**: Sarabun (Thai language support)

### Performance Features
- **O(1) lookup maps** for instant data access
- **DOM caching system** for optimized queries
- **Memory management** with automatic cleanup
- **Real-time filtering** (sub-50ms response)

## 📋 Project Structure

```
Spectrum-chart-new-hope/
├── index.html          # Main HTML interface
├── CreateChart.js      # Core JavaScript (2,326 lines, 8 sections)
├── css.css            # Custom styles
├── datasource.xlsx    # Frequency allocation data
└── spectrum_icon.jpg  # App icon
```

## ⚙️ JavaScript Workflow

### Code Organization (CreateChart.js)
**8 Logical Sections:**

1. **Configuration** - App settings and namespace
2. **Utilities** - Performance helpers and caching
3. **Math** - Calculations and scaling functions
4. **Data Processing** - Excel loading and transformation
5. **Chart Rendering** - Canvas visualization engine
6. **Legend Management** - Interactive legend system
7. **Search & Filtering** - Real-time data filtering
8. **UI Handlers** - Event handling and interactions

### Core Workflow
```
Data Load → Excel Parse → Frequency Normalize → Cache Build → Chart Render → Legend Create → User Interact
```

### Performance Strategy
- **O(1) lookup maps** replace O(n) filtering
- **DOM caching** minimizes queries
- **Batch operations** reduce browser reflows
- **Memory monitoring** prevents leaks

## 🚀 Quick Start

```bash
# Serve locally (recommended)
python -m http.server 8000

# Open in browser
http://localhost:8000
```

## 🌐 Browser Support

- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- Mobile devices show "not supported" overlay

## 🛠️ Development

### Debug Mode
```javascript
// Enable development logging
DEBUG_MODE = true;

// Performance monitoring
getPerformanceReport();
clearPerformanceCaches();
```

### Key APIs
- **SpectrumChart**: Main namespace with config, data, performance
- **DOMCache**: Cached DOM element access
- **Logger**: Conditional logging system
- **PerformanceUtils**: O(1) lookups and caching

## 📄 License

Educational and informational purposes for Thailand's frequency spectrum allocation.