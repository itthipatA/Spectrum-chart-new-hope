

// Application Constants
const APP_VERSION = '2.0';
const DEBUG_MODE = false; // Set to true for development

/**
 * ========================================
 * CORE CONFIGURATION & APPLICATION STATE  
 * ========================================
 * 
 * Central namespace containing all application state, configuration,
 * and data structures. This object serves as the single source of
 * truth for the entire application.
 */
const SpectrumChart = {
    // Configuration settings
    config: {
        selectedMenu: "nfat",
        heightFactor: 0.07,        // set factor to X % of screen height / the bigger number, the taller blocks
        heightNewlineFactor: 10,   // the bigger number, the smaller newline
        labelFontSize: 10,         // in pixel unit / default is 12
        hide: 1
    },
    
    // Screen and container dimensions
    dimensions: {
        screenWidth: 0,
        screenHeight: 0,
        containerWidth: 0,
        containerHeight: 0
    },
    
    // Data arrays
    data: {
        jsonArray: [],
        colorArray: [],
        colorArrayFiltered: [],
        colorArrayApplication: [],
        colorArrayApplicationFiltered: [],
        serviceArray: [],
        applicationArray: [],
        applicationArrayFiltered: [],
        serviceArrayFiltered: [],
        frequencyLabelArray: [],
        jsonArrayFiltered: [],
        footnoteArray: [],              // International footnote lookup data
        footnoteArrayFiltered: []       // Filtered footnote data
    },
    
    // Performance optimization - Lookup maps and caches
    performance: {
        // Lookup maps for O(1) access
        rowLookupMap: new Map(),        // Map<row_id, array_of_items>
        stackLookupMap: new Map(),      // Map<stack_id, array_of_items>
        serviceIndexMap: new Map(),     // Map<service_name, array_of_indices>
        footnoteIndexMap: new Map(),    // Map<footnote_number, footnote_detail>
        thailandFootnoteIndexMap: new Map(), // Map<thailand_footnote_number, footnote_detail>
        
        // Cached calculations
        frequencyRangeCache: new Map(), // Map<row_id, {min, max}>
        stackRangeCache: new Map(),     // Map<stack_id, {min, max}>
        bandwidthCache: new Map(),      // Map<item_id, bandwidth>
        
        // Performance tracking
        lastUpdateTime: 0,
        renderCount: 0,
        filterCount: 0
    },
    
    // Legend state management
    legend: {
        selected: [],
        selectedTemp: [],
        selectedDirection: [],
        unselected: [],
        inputValue: "",
        toggleMode: "service"
    },
    
    // Search state management
    search: {
        languageMode: "general",    // 'thai' | 'thailand' | 'general'
        footnoteMode: false,        // true when in footnote-only search mode
        frequencyRangeHidden: false // true when frequency range boxes are hidden
    },
    
    // UI state
    ui: {
        selectedDataIdBox: [],
        unselectedDataIdBox: []
    },
    
    // Sheet indices
    sheets: {
        index0: 0,
        index1: 1,
        index2: 2
    }
};

/**
 * ========================================
 * UTILITY CLASSES & PERFORMANCE HELPERS
 * ========================================
 * 
 * Essential utility classes that provide performance optimization,
 * DOM caching, logging, and other helper functionality used
 * throughout the application.
 */

// DOM Element Cache optimized for instant response
const DOMCache = {
    elements: {},
    
    get: function(id) {
        if (!this.elements[id]) {
            this.elements[id] = document.getElementById(id);
        }
        return this.elements[id];
    },
    
    clear: function() {
        this.elements = {};
    },
    
    // Immediate class updates for instant visual feedback
    updateClassesInstantly: function(selector, removeClasses, addClasses) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (removeClasses && removeClasses.length > 0) {
                element.classList.remove(...removeClasses);
            }
            if (addClasses && addClasses.length > 0) {
                element.classList.add(...addClasses);
            }
        });
        return elements.length; // Return count for feedback
    },
    
    // Fast frequency box state updates
    setFrequencyBoxState: function(elements, state) {
        const stateClasses = {
            box: ['box'],
            highlight: ['highlight'],
            fade: ['faddd'],
            click: ['click']
        };
        
        const removeClasses = ['box', 'highlight', 'faddd', 'click', 'thailand-highlighted'];
        const addClasses = stateClasses[state] || ['box'];
        
        elements.forEach(element => {
            element.classList.remove(...removeClasses);
            element.classList.add(...addClasses);
        });
    }
};

// Conditional logging system
const Logger = {
    enabled: true, // Set to true for development
    log: function(...args) {
        if (this.enabled) {
            console.log(...args);
        }
    },
    error: function(...args) {
        console.error(...args); // Always log errors
    }
};

// Performance optimization utilities
const PerformanceUtils = {
    // Build lookup maps for O(1) access instead of O(n) filtering
    buildLookupMaps: function(data) {
        const startTime = performance.now();
        
        // Clear existing maps
        SpectrumChart.performance.rowLookupMap.clear();
        SpectrumChart.performance.stackLookupMap.clear();
        SpectrumChart.performance.serviceIndexMap.clear();
        
        // Build row and stack lookup maps
        data.forEach((item, index) => {
            // Row lookup map
            if (!SpectrumChart.performance.rowLookupMap.has(item.row_id)) {
                SpectrumChart.performance.rowLookupMap.set(item.row_id, []);
            }
            SpectrumChart.performance.rowLookupMap.get(item.row_id).push(item);
            
            // Stack lookup map
            if (!SpectrumChart.performance.stackLookupMap.has(item.stack_id)) {
                SpectrumChart.performance.stackLookupMap.set(item.stack_id, []);
            }
            SpectrumChart.performance.stackLookupMap.get(item.stack_id).push(item);
            
            // Service index map for faster filtering
            if (!SpectrumChart.performance.serviceIndexMap.has(item.EngService)) {
                SpectrumChart.performance.serviceIndexMap.set(item.EngService, []);
            }
            SpectrumChart.performance.serviceIndexMap.get(item.EngService).push(index);
        });
        
    },
    
    // Build footnote lookup map for O(1) footnote access
    buildFootnoteLookupMap: function(footnoteData) {
        const startTime = performance.now();
        
        // Clear existing footnote map
        SpectrumChart.performance.footnoteIndexMap.clear();
        
        // Build footnote lookup map
        footnoteData.forEach((footnote) => {
            // Excel sheet has columns: "Number" and "Explaination"
            if (footnote.Number && footnote.Explaination) {
                SpectrumChart.performance.footnoteIndexMap.set(footnote.Number.toString().trim(), footnote.Explaination);
            }
        });
        
    },
    
    // Build Thailand footnote lookup map for O(1) footnote access
    buildThailandFootnoteLookupMap: function(footnoteData) {
        const startTime = performance.now();
        
        // Clear existing Thailand footnote map
        SpectrumChart.performance.thailandFootnoteIndexMap.clear();
        
        // Build Thailand footnote lookup map
        footnoteData.forEach((footnote) => {
            // Excel sheet has columns: "Number" and "Explanation"
            if (footnote.Number && footnote.Explanation) {
                SpectrumChart.performance.thailandFootnoteIndexMap.set(footnote.Number.toString().trim(), footnote.Explanation);
            }
        });
        
    },
    
    // Get footnote detail by footnote number
    getFootnoteDetail: function(footnoteNumber) {
        const key = footnoteNumber.toString().trim();
        const result = SpectrumChart.performance.footnoteIndexMap.get(key);
        if (!result) {
        }
        return result || `Footnote ${footnoteNumber} not found`;
    },
    
    // Get Thailand footnote detail by footnote number
    getThailandFootnoteDetail: function(footnoteNumber) {
        const key = footnoteNumber.toString().trim();
        const result = SpectrumChart.performance.thailandFootnoteIndexMap.get(key);
        if (!result) {
        }
        return result || `Thailand Footnote ${footnoteNumber} not found`;
    },
    
    // Cache frequency ranges to avoid repeated Math.min/max operations
    cacheFrequencyRanges: function(data) {
        const startTime = performance.now();
        
        SpectrumChart.performance.frequencyRangeCache.clear();
        SpectrumChart.performance.stackRangeCache.clear();
        
        // Cache row frequency ranges
        SpectrumChart.performance.rowLookupMap.forEach((items, rowId) => {
            const frequencies = items.map(item => ({
                start: item.Start_Frequency,
                stop: item.Stop_Frequency
            }));
            
            SpectrumChart.performance.frequencyRangeCache.set(rowId, {
                min: Math.min(...frequencies.map(f => f.start)),
                max: Math.max(...frequencies.map(f => f.stop))
            });
        });
        
        // Cache stack frequency ranges
        SpectrumChart.performance.stackLookupMap.forEach((items, stackId) => {
            const frequencies = items.map(item => ({
                start: item.Start_Frequency,
                stop: item.Stop_Frequency
            }));
            
            SpectrumChart.performance.stackRangeCache.set(stackId, {
                min: Math.min(...frequencies.map(f => f.start)),
                max: Math.max(...frequencies.map(f => f.stop))
            });
        });
        
    },
    
    // Get row family using lookup map instead of filtering
    getRowFamily: function(rowId) {
        return SpectrumChart.performance.rowLookupMap.get(rowId) || [];
    },
    
    // Get stack members using lookup map instead of filtering
    getStackMembers: function(rowFamily, stackId) {
        if (!rowFamily) return [];
        return rowFamily.filter(item => item.stack_id === stackId);
    },
    
    // Get cached frequency range for row
    getRowFrequencyRange: function(rowId) {
        return SpectrumChart.performance.frequencyRangeCache.get(rowId);
    },
    
    // Get cached frequency range for stack
    getStackFrequencyRange: function(stackId) {
        return SpectrumChart.performance.stackRangeCache.get(stackId);
    },
    
    // Performance monitoring
    startTimer: function(operation) {
        SpectrumChart.performance[operation + '_start'] = performance.now();
    },
    
    endTimer: function(operation) {
        const start = SpectrumChart.performance[operation + '_start'];
        if (start) {
            const duration = performance.now() - start;
            return duration;
        }
        return 0;
    },
    
    // Performance dashboard
    getPerformanceReport: function() {
        const report = {
            renderCount: SpectrumChart.performance.renderCount,
            filterCount: SpectrumChart.performance.filterCount,
            cacheStats: {
                rowLookupSize: SpectrumChart.performance.rowLookupMap.size,
                stackLookupSize: SpectrumChart.performance.stackLookupMap.size,
                frequencyRangeCacheSize: SpectrumChart.performance.frequencyRangeCache.size,
                stackRangeCacheSize: SpectrumChart.performance.stackRangeCache.size
            },
            dataStats: {
                totalRecords: SpectrumChart.data.jsonArray.length,
                filteredRecords: SpectrumChart.data.jsonArrayFiltered.length,
                services: SpectrumChart.data.serviceArray.length,
                applications: SpectrumChart.data.applicationArray.length
            },
            memoryUsage: {
                usedHeap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : 'N/A',
                totalHeap: performance.memory ? Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB' : 'N/A'
            }
        };
        
        console.table(report.cacheStats);
        console.table(report.dataStats);
        console.log('Performance Report:', report);
        return report;
    },
    
    // Intersection Observer for visibility-based performance optimization
    intersectionObserver: null,
    visibleElements: new Set(),
    
    // Initialize intersection observer for performance optimization
    initIntersectionObserver: function() {
        if (!this.intersectionObserver && 'IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const element = entry.target;
                    if (entry.isIntersecting) {
                        this.visibleElements.add(element);
                        // Enable animations for visible elements
                        element.style.willChange = 'transform, opacity, filter';
                    } else {
                        this.visibleElements.delete(element);
                        // Disable animations for invisible elements to save resources
                        element.style.willChange = 'auto';
                    }
                });
            }, {
                rootMargin: '50px', // Start loading 50px before element comes into view
                threshold: 0.1 // Trigger when 10% of element is visible
            });
        }
    },
    
    // Observe elements for visibility-based performance
    observeElement: function(element) {
        if (this.intersectionObserver && element) {
            this.intersectionObserver.observe(element);
        }
    },
    
    // Unobserve elements
    unobserveElement: function(element) {
        if (this.intersectionObserver && element) {
            this.intersectionObserver.unobserve(element);
        }
    },
    
    // Clear performance caches for memory management
    clearCaches: function() {
        SpectrumChart.performance.rowLookupMap.clear();
        SpectrumChart.performance.stackLookupMap.clear();
        SpectrumChart.performance.serviceIndexMap.clear();
        SpectrumChart.performance.frequencyRangeCache.clear();
        SpectrumChart.performance.stackRangeCache.clear();
        SpectrumChart.performance.bandwidthCache.clear();
        DOMCache.clear();
        
        // Clean up intersection observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        this.visibleElements.clear();
    }
};

/**
 * ========================================
 * MATHEMATICAL & SCREEN UTILITY FUNCTIONS
 * ========================================
 * 
 * Core mathematical calculations and screen dimension functions
 * for responsive chart rendering and layout calculations.
 */

// Initialize application
logScreenWidth();
logScreenHeight();
logContainerWidth();
logContainerHeight();

// Global performance monitoring functions for developers
window.getPerformanceReport = function() {
    return PerformanceUtils.getPerformanceReport();
};

window.clearPerformanceCaches = function() {
    PerformanceUtils.clearCaches();
};

// Auto-performance monitoring every 10 seconds in development
if (DEBUG_MODE) {
    setInterval(function() {
        const report = PerformanceUtils.getPerformanceReport();
        if (report.memoryUsage.usedHeap !== 'N/A') {
            const heapMB = parseInt(report.memoryUsage.usedHeap);
            if (heapMB > 100) {
                console.warn('High memory usage detected:', heapMB + 'MB');
            }
        }
    }, 10000);
}

executeSequentially();
// Attach the function to the window resize event
window.addEventListener('resize', logContainerWidth);
window.addEventListener('resize', logContainerHeight);
window.addEventListener('resize', logScreenWidth);
window.addEventListener('resize', logScreenHeight);
window.addEventListener('resize', reload);
window.addEventListener('scroll', drawConnections);

function reload()
{
    location.reload();
}


/**
 * ========================================
 * DATA PROCESSING & TRANSFORMATION
 * ========================================
 * 
 * Functions responsible for Excel file loading, data parsing,
 * transformation, and preparation for chart rendering.
 * Includes frequency normalization, service mapping, and
 * data structure organization.
 */

// Execute the functions sequentially
async function executeSequentially() {
    // document.addEventListener('DOMContentLoaded', function () {
    //     // Automatically load the Excel file when the page loads    
    // });
    
    await ExceltoJson(); // Wait for Excel processing to complete
}

/**
 * Load and parse Excel file containing frequency allocation data
 * Transforms raw Excel data into structured JSON format for chart rendering
 */
async function ExceltoJson() {
    // Specify the path to your Excel file
    var excelFilePath = 'datasource.xlsx';

    // Use XMLHttpRequest to read the Excel file
    var xhr = new XMLHttpRequest();
    xhr.open('GET', excelFilePath, true);
    xhr.responseType = 'arraybuffer';


    SpectrumChart.data.jsonArray = [];
    SpectrumChart.data.colorArray = [];
    SpectrumChart.data.colorArrayFiltered = [];
    SpectrumChart.data.colorArrayApplication = [];
    SpectrumChart.data.colorArrayApplicationFiltered = [];
    SpectrumChart.data.serviceArray = [];
    SpectrumChart.data.applicationArray = [];
    SpectrumChart.data.applicationArrayFiltered = [];
    SpectrumChart.data.serviceArrayFiltered = [];
    SpectrumChart.data.frequencyLabelArray = [];
    SpectrumChart.data.jsonArrayFiltered = [];


    xhr.onload = function () {
        if (xhr.status === 200) {
            var data = new Uint8Array(xhr.response);
            var workbook = XLSX.read(data, { type: 'array' });

            // Debug: Show all available sheets
            workbook.SheetNames.forEach((sheetName, index) => {
            });

            // Convert Sheet1 to JSON and store in the array
            var sheet1_name_list = workbook.SheetNames[SpectrumChart.sheets.index0];
            var sheet1 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet1_name_list]);

            // Convert Sheet2 to JSON and store in the array
            var sheet2_name_list = workbook.SheetNames[SpectrumChart.sheets.index1];
            var sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet2_name_list]);

            // Convert Sheet3 to JSON and store in the array
            var sheet3_name_list = workbook.SheetNames[SpectrumChart.sheets.index2];
            var sheet3 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet3_name_list]);

            // Find and convert International_Footnote sheet
            var sheet4 = [];
            var footnoteSheetIndex = -1;
            var footnoteSheetName = null;
            
            // Find and convert Thailand_Footnote sheet  
            var sheet5 = [];
            var thailandFootnoteSheetIndex = -1;
            var thailandFootnoteSheetName = null;
            
            // Try to find both footnote sheets by name (case-insensitive)
            workbook.SheetNames.forEach((sheetName, index) => {
                if (sheetName.toLowerCase().includes('international') && 
                    sheetName.toLowerCase().includes('footnote')) {
                    footnoteSheetIndex = index;
                    footnoteSheetName = sheetName;
                } else if (sheetName.toLowerCase().includes('thailand') && 
                           sheetName.toLowerCase().includes('footnote')) {
                    thailandFootnoteSheetIndex = index;
                    thailandFootnoteSheetName = sheetName;
                } else if (sheetName.toLowerCase().includes('footnote') && 
                          !footnoteSheetName && !thailandFootnoteSheetName) {
                    // Fallback for generic footnote sheet
                    footnoteSheetIndex = index;
                    footnoteSheetName = sheetName;
                }
            });
            
            // Load International_Footnote sheet
            if (footnoteSheetName) {
                sheet4 = XLSX.utils.sheet_to_json(workbook.Sheets[footnoteSheetName]);
                if (sheet4.length > 0) {
                } else {
                }
            } else {
            }
            
            // Load Thailand_Footnote sheet
            if (thailandFootnoteSheetName) {
                sheet5 = XLSX.utils.sheet_to_json(workbook.Sheets[thailandFootnoteSheetName]);
                if (sheet5.length > 0) {
                } else {
                }
            } else {
            }
            
            if (!footnoteSheetName && !thailandFootnoteSheetName) {
            }

            // Store the JSON data in the namespace
            SpectrumChart.data.colorArray = sheet2;
            SpectrumChart.data.colorArrayFiltered = SpectrumChart.data.colorArray;
            SpectrumChart.data.colorArrayApplication = sheet3;
            SpectrumChart.data.colorArrayApplicationFiltered = SpectrumChart.data.colorArrayApplication;
            SpectrumChart.data.footnoteArray = sheet4;
            SpectrumChart.data.footnoteArrayFiltered = SpectrumChart.data.footnoteArray;
            SpectrumChart.data.thailandFootnoteArray = sheet5;
            SpectrumChart.data.thailandFootnoteArrayFiltered = SpectrumChart.data.thailandFootnoteArray;
            for(var i=0; i<sheet1.length; i++){
                SpectrumChart.data.jsonArray[i] = sheet1[i];
                if (SpectrumChart.data.jsonArray[i].Application == undefined)  { SpectrumChart.data.jsonArray[i].Application = "x"; }
            }

            for(var i=0; i<SpectrumChart.data.colorArray.length; i++){
                SpectrumChart.data.serviceArray[i] = SpectrumChart.data.colorArray[i].Service;
            }

            for(var i=0; i<SpectrumChart.data.colorArrayApplication.length; i++){
                SpectrumChart.data.applicationArray[i] = SpectrumChart.data.colorArrayApplication[i].Application;
            }

            // for (var i=0; i<jsonDataArray.length; i++){
            //     if(jsonDataArray[i].Application != undefined){ ApplicationArray.push(jsonDataArray[i].Application);}
            // }

            // ApplicationArray = [...new Set(ApplicationArray)];  
            // Display the Excel data on the webpage
            // displayOutput(jsonDataArray);
                         
            // Call a function after the data is loaded
            normalizeFrequencyUnitToMHz(SpectrumChart.data.jsonArray);
            assignStackID(SpectrumChart.data.jsonArray);
            insertGap(SpectrumChart.data.jsonArray);
            splitTextToArray(SpectrumChart.data.jsonArray);
            sortStackMembers(SpectrumChart.data.jsonArray);
            assignRowID(SpectrumChart.data.jsonArray);
            assignUniqueID(SpectrumChart.data.jsonArray);
            assignGapFrequencyLabel(SpectrumChart.data.jsonArray);
            SpectrumChart.data.jsonArrayFiltered = SpectrumChart.data.jsonArray;
            
            // Build performance optimization structures
            PerformanceUtils.buildLookupMaps(SpectrumChart.data.jsonArray);
            PerformanceUtils.cacheFrequencyRanges(SpectrumChart.data.jsonArray);
            PerformanceUtils.buildFootnoteLookupMap(SpectrumChart.data.footnoteArray);
            PerformanceUtils.buildThailandFootnoteLookupMap(SpectrumChart.data.thailandFootnoteArray);
            
            plot(SpectrumChart.data.jsonArray);
            createServiceLegend(SpectrumChart.data.colorArray);
            createServiceLegendHorizontal(SpectrumChart.data.colorArray);

        } else {
        }
    };

    xhr.send();
    return SpectrumChart.data.jsonArray;
}


function displayOutput(data) {
    var outputElement = document.getElementById('output');

    // Convert JSON data to a string for display
    var jsonString = JSON.stringify(data, null, 2);

    // Create a <pre> element to maintain formatting
    var preElement = document.createElement('pre');
    preElement.textContent = jsonString;

    // Append the <pre> element to the output element
    outputElement.innerHTML = '';
    outputElement.appendChild(preElement);
}


/**
 * Convert all frequency values to MHz for consistent calculations
 * @param {Array} data - Array of frequency allocation records
 */
function normalizeFrequencyUnitToMHz(data) {

    for (var i = 0 ; i < data.length ; i++){ 
        //normalize freq unit
        if (data[i].StopFrequencyUnit == "kHz"){ 
            data[i].Start_Frequency = parseFloat(data[i].Start_Frequency) / 1000; 
            data[i].Stop_Frequency = parseFloat(data[i].Stop_Frequency) / 1000; }
        else if (data[i].StopFrequencyUnit == "GHz"){ 
            data[i].Start_Frequency = parseFloat(data[i].Start_Frequency) * 1000; 
            data[i].Stop_Frequency = parseFloat(data[i].Stop_Frequency) * 1000; }
    
        data[i].Bandwidth = data[i].Stop_Frequency - data[i].Start_Frequency;
    }
    SpectrumChart.data.jsonArray = data;
    CombineServiceAndDirectionToNewColumn(SpectrumChart.data.jsonArray);
}

/**
 * Combine service and direction information into a single column for processing
 * @param {Array} data - Array of frequency allocation records
 */
function CombineServiceAndDirectionToNewColumn(data) {
    for (var i = 0 ; i < data.length ; i++){ 
        data[i].Service_and_direction = data[i].EngService + '*' + data[i].Direction;
    }
    SpectrumChart.data.jsonArray = data;
}


function splitTextToArray(data) {

    for (var i = 0 ; i < data.length ; i++){
        var text = data[i].Direction;
        if (text != undefined) {
            let splitted_text = text.split(',');
            data[i].Direction = splitted_text;
        }
        else { data[i].Direction = []; }

        var footnoteText = data[i].International_Footnote;
        if (footnoteText != undefined) {
            let splittedFootnote = footnoteText.split(',');
            data[i].International_Footnote = splittedFootnote;
        } else {
            data[i].International_Footnote = [];
        }

        var thailandFootnoteText = data[i].Thailand_Footnote;
        if (thailandFootnoteText != undefined) {
            let splittedThailandFootnote = thailandFootnoteText.split(',');
            data[i].Thailand_Footnote = splittedThailandFootnote;
        } else {
            data[i].Thailand_Footnote = [];
        }
    }
    SpectrumChart.data.jsonArray = data;
}



function assignStackID(data) {

    //sort order by start frequency
    var sorted_data = data.sort(function(a, b) {
        return a.Start_Frequency - b.Start_Frequency;
    });

    var stack_id = 0;
    var last_max_stopfreq = sorted_data[0].Stop_Frequency ;
    sorted_data[0].stack_id = stack_id;

    for (var i = 1 ; i < sorted_data.length ; i++){

        // if current block is within previous block, assign the same stack_id
        if (sorted_data[i].Start_Frequency >= last_max_stopfreq){
            stack_id = stack_id + 1;
            sorted_data[i].stack_id = stack_id ;
        }
        else  //(sorted_data[i].Start_Frequency > sorted_data[i-1].Stop_Frequency){     // if current block is not within previous block, assign new stack_id (+1)
        {    
            sorted_data[i].stack_id = stack_id ;
        }

        // to record max stop frequency to keep prior overlap block
        if (sorted_data[i].Stop_Frequency > last_max_stopfreq) { 
            last_max_stopfreq = sorted_data[i].Stop_Frequency;
        }
        
        sorted_data[i].i = i;
        sorted_data[i].last_max_stopfreq = last_max_stopfreq;
    }

    SpectrumChart.data.jsonArray = sorted_data;
}


function insertGap(data) {
    if (!data || data.length === 0) return;
    var last_stackid = data[data.length-1].stack_id
    var gap_position = [];
    for(var i=0; i<last_stackid; i++){
        var current_stack_member = getStackMembers(data,i);
        var next_stack_member = getStackMembers(data,i+1);
        let min_start_freq = Math.min(...next_stack_member.map(item => item.Start_Frequency));
        let max_stop_freq = Math.max(...current_stack_member.map(item => item.Stop_Frequency));
        var current = i;
        var next = i+1;
        bandwidth = min_start_freq - max_stop_freq;
        if(bandwidth > 0 ){
            data.push({ stack_id:null, Start_Frequency: max_stop_freq, Stop_Frequency: min_start_freq, Bandwidth: bandwidth, EngService : "gap"});
        }
    } 
        assignStackID(data);
}


function assignRowID(data) {
    if (!data || data.length === 0) return;
    var number_of_stacks = data[data.length-1].stack_id;
    var row_id = 0;
    var length_accum = 0;   // to find index of data array for each stack

    for (var i=0; i<=number_of_stacks; i++)
    {
        var number_of_stack_member = countStackMembers(data,i);
        var stack_member = getStackMembers(data,i);
        let min_start_freq = Math.min(...stack_member.map(item => item.Start_Frequency));
        let max_stop_freq = Math.max(...stack_member.map(item => item.Stop_Frequency));
        let stack_width = max_stop_freq - min_start_freq;

        const row_family = data.filter(word => word.row_id == row_id);  
        let min_start_freq_of_row_family = Math.min(...row_family.map(item => item.Start_Frequency));
        if (min_start_freq_of_row_family==0) {
            min_start_freq_of_row_family = 0.03;
        }

        if ( max_stop_freq > min_start_freq_of_row_family*10 ) {
            row_id += 1;
        }

        for (var j=0; j<number_of_stack_member; j++){
            data[length_accum+j].row_id = row_id;       //assign row_id in data array
        }
        length_accum += number_of_stack_member;
    }
    
    SpectrumChart.data.jsonArray = data;                               //return to global data array
    // jsonDataArray_filtered = data;

}


function assignUniqueID(data){
    
    for(var i=0; i<data.length; i++){
        data[i].id = i;
    }
    SpectrumChart.data.jsonArray = data;
    SpectrumChart.data.jsonArrayFiltered = data;
}


function sortStackMembers(data) {
    //sort order by Bandwidth in every stack
    var result = [];
    if (!data || data.length === 0) return result;
    for(var i=0; i<=data[data.length-1].stack_id; i++){  // loop by the number of stacks e.g. 6 rounds for 6 stacks
        var family = getStackMembers(data, i);
        var sorted_family = family.sort(function(a, b) {
            return a.Bandwidth - b.Bandwidth;
        });
        for (var j=0; j< sorted_family.length; j++){
            result.push(sorted_family[j]);
        }   
    }

    SpectrumChart.data.jsonArray = result;
}


function RowHeightScaler(data) {
    // Use the passed data parameter or fallback to filtered data
    var dataArray = data || SpectrumChart.data.jsonArrayFiltered;
    
    // Check if data exists and has elements
    if (!dataArray || dataArray.length === 0) {
        return 0.125; // Default factor when no data
    }
    
    // Check if the last element has row_id property
    var lastElement = dataArray[dataArray.length - 1];
    if (!lastElement || typeof lastElement.row_id === 'undefined') {
        return 0.125; // Default factor when row_id is not available
    }
    
    var row_num = lastElement.row_id + 1;
    var factor = 0.25 / row_num;
    if (factor > 0.125) { factor = 0.125; }
    if (factor < 0.07) { factor = 0.07; }

    return factor;
}

function FontSizeScaler(box_height,box_width,num_direction_charactor) {
    var fontsize = 13;
    fontsize = ((7/107)*box_height)+(13-((7/107)*11))
    if ( fontsize > 20) { fontsize = 20; }

    var required_width = fontsize * num_direction_charactor;
    if(box_width < required_width){fontsize = 0;}

    return fontsize;
}

/**
 * ========================================
 * CHART RENDERING & VISUALIZATION ENGINE
 * ========================================
 * 
 * Core chart rendering functions responsible for generating
 * the visual spectrum chart using HTML5 Canvas and DOM elements.
 * Includes color management, scaling, and layout optimization.
 */

/**
 * Main chart plotting function - renders the complete frequency spectrum chart
 * @param {Array} data - Processed frequency allocation data
 * Optimized with performance caching and lookup maps for O(n) complexity
 */
function plot(data){
    PerformanceUtils.startTimer('plot');

    SpectrumChart.config.heightFactor = RowHeightScaler(data);

    var text ="";
    if (!data || data.length === 0) return;
    var last_rowid = data[data.length-1].row_id;
    var length_accum = 0;

    // Optimized loop: Use lookup maps instead of repeated filtering
    for (var i=0; i <= last_rowid; i++)
    {
        // Use cached row family instead of filtering
        var row_family = PerformanceUtils.getRowFamily(i);
        if (!row_family || row_family.length === 0) continue;
        
        var first_stack_of_row = row_family[0].stack_id;
        var last_stack_of_row = row_family[row_family.length-1].stack_id;

        var scale_factor = scaler(row_family,i);
        
        // Use cached frequency ranges instead of Math.min/max operations
        var cachedRange = PerformanceUtils.getRowFrequencyRange(i);
        var min_freq_row, max_freq_row;
        
        if(row_family[0].EngService == "gap" && row_family.length > 1)
        {
            // Only recalculate if gap detected (less common case)
            var row_family_without0 = row_family.slice(1);
            min_freq_row = Math.min(...row_family_without0.map(item => item.Start_Frequency));
            max_freq_row = Math.max(...row_family_without0.map(item => item.Stop_Frequency));
        }
        else
        {
            // Use cached values for common case
            min_freq_row = cachedRange.min;
            max_freq_row = cachedRange.max;
        }

        if (row_family.length == 1 && row_family[0].EngService == "gap" ) {
            text += '<span id='+row_family[0].id+' class="box"></span>';
            continue;
        }
        // Add frequency text for header
        var [Start_Frequency_label, Stop_Frequency_label, Stop_Frequency_Unit_label] = labelFrequncyConverter(min_freq_row, max_freq_row);
        text += '<h6 id="headline'+i+'">' + Start_Frequency_label + ' - ' + Stop_Frequency_label + ' ' + Stop_Frequency_Unit_label + '</h6>';

        // open new mainContainer for each row
        text += '<span id="mainContainer_'+i+'" class="main-container" style="width:'+SpectrumChart.dimensions.containerWidth+'px;">'; 

        for (var j=first_stack_of_row ; j<=last_stack_of_row ; j++)
        {
            // skip if first stack is a gap
            if (j == first_stack_of_row && row_family[0].EngService == "gap") { 
                text += '<span id='+row_family[0].id+' class="box"></span>';
                continue;
            }

            text +=     '<span id="stack-container_'+ j +'" class="stack-container">';     // open stack Container

            var number_of_stack_member = countStackMembers(row_family,j);
            var stack_member = PerformanceUtils.getStackMembers(row_family,j);
            
            // Use cached stack frequency ranges instead of recalculating
            var stackRange = PerformanceUtils.getStackFrequencyRange(j);
            var min_start_freq, max_stop_freq;
            
            if (stackRange) {
                min_start_freq = stackRange.min;
                max_stop_freq = stackRange.max;
            } else {
                // Fallback for edge cases
                min_start_freq = Math.min(...stack_member.map(item => item.Start_Frequency));  
                max_stop_freq = Math.max(...stack_member.map(item => item.Stop_Frequency));
            }
            
            var height = (SpectrumChart.dimensions.screenHeight/number_of_stack_member) * SpectrumChart.config.heightFactor;
            var height_newline = height/SpectrumChart.config.heightNewlineFactor*number_of_stack_member;

            for (var k=0; k < number_of_stack_member; k++ )
            {
                var mapped_color = getColor(stack_member,k);
                var block_label = ""; //stack_member[k].EngService;
                var offset_start_freq = parseInt((stack_member[k].Start_Frequency - min_start_freq) * scale_factor );   //to set margin of each block
                var width = parseFloat(stack_member[k].Bandwidth * scale_factor);
                var animation_effect = (Math.floor(Math.random() * 5) + 1);
                var service_order_style = "";
                if (stack_member[k].order == "Secondary"){service_order_style = "repeating-linear-gradient(45deg, transparent, transparent 5px, #000 2px, #000 6px);";}   // secondary services
                else {service_order_style = ""}
                
                var direction = "";
                if (stack_member[k].Direction.length > 0 ) {
                    for (var d=0; d < stack_member[k].Direction.length; d++) {
                        if ( stack_member[k].Direction[d] == "Earth-to-Space" ) { direction += "&#8593"; }
                        else if ( stack_member[k].Direction[d] == "Space-to-Earth" ) { direction += "&#8595"; }
                        else if ( stack_member[k].Direction[d] == "Space-to-Space" ) { direction += "&#8596"; }
                        else if ( stack_member[k].Direction[d] == "Deep Space" ) { direction += "&#11097"; }
                        else if ( stack_member[k].Direction[d] == "Active" ) { direction += ""; }
                        else if ( stack_member[k].Direction[d] == "Passive" ) { direction += ""; }
                        else { console.log("Error! there are unmapped directions"); }
                    }
                    block_label = direction;
                }
                else { }
                var fontsize = FontSizeScaler(height,width, stack_member[k].Direction.length+1);
            // mouse hover information  
            var [Start_Frequency_label, Stop_Frequency_label, Stop_Frequency_Unit_label] = labelFrequncyConverter(stack_member[k].Start_Frequency, stack_member[k].Stop_Frequency);
                var hover_information = Start_Frequency_label + " - " + Stop_Frequency_label + " " + Stop_Frequency_Unit_label + '\n' + stack_member[k].EngService + '\n';
                    hover_information += 'PowerLimit: ' + stack_member[k].MaxPower + '\n' + 'Needed Licensed: '+ stack_member[k].LicenseNeeded;
                


                var card_information_direction = "";
                if (stack_member[k].Direction.length > 0 ) {
                    for (var d=0; d < stack_member[k].Direction.length; d++) {
                        if ( stack_member[k].Direction[d] == "Earth-to-Space" ) { card_information_direction += "(Earth-to-Space) "; }
                        else if ( stack_member[k].Direction[d] == "Space-to-Earth" ) { card_information_direction += "(Space-to-Earth) "; }
                        else if ( stack_member[k].Direction[d] == "Space-to-Space" ) { card_information_direction += "(Space-to-Space) "; }
                        else if ( stack_member[k].Direction[d] == "Deep Space" ) { card_information_direction += "(Deep Space) "; }
                        else if ( stack_member[k].Direction[d] == "Active" ) { card_information_direction += "(Active) "; }
                        else if ( stack_member[k].Direction[d] == "Passive" ) { card_information_direction += "(Passive) "; }
                        else { console.log("Error! there are unmapped directions"); }
                    }
                }

                var Bandwidth = Math.round(stack_member[k].Bandwidth * 10000) / 10000;
                    if (Stop_Frequency_Unit_label == "kHz") {Bandwidth = Bandwidth*1000}
                    else if(Stop_Frequency_Unit_label == "MHz"){Bandwidth = Bandwidth*1}
                    else if(Stop_Frequency_Unit_label == "GHz"){Bandwidth = Bandwidth/1000}
                    else {}

                var card_information = stack_member[k].EngService + ' Service ' + card_information_direction + 
                    ' <br>Designation : ' + stack_member[k].order + 
                    '<br>Bandwidth : ' + Bandwidth + ' ' + Stop_Frequency_Unit_label + 
                    '<br> Footnote : ';
                    

                // ----------------------Add footnote link---------------------------
                if (Array.isArray(stack_member[k].International_Footnote) && stack_member[k].International_Footnote.length > 0) {
                   
                    for (var f = 0; f < stack_member[k].International_Footnote.length; f++) {
                        var footnote = stack_member[k].International_Footnote[f];
                        
                        // If footnote is "-", keep it as plain text, otherwise make it a clickable link
                        // Check if it's already processed (contains HTML)
                        if (footnote.trim() === "-") {
                            stack_member[k].International_Footnote[f] = footnote;
                        } else if (footnote.includes('class="footnote-link"')) {
                            // Already processed, don't process again
                            stack_member[k].International_Footnote[f] = footnote;
                        } else {
                            stack_member[k].International_Footnote[f] = '<span class="footnote-link" data-footnote="' + footnote + '" style="color: #007bff; cursor: pointer; text-decoration: underline; margin: 0 2px;">' + footnote + '</span>';
                        }
                    }
                    
                } else {
                    
                    stack_member[k].International_Footnote[f] = "-";
                }
                
                // ----------------------Add Thailand footnote link---------------------------
                if (Array.isArray(stack_member[k].Thailand_Footnote) && stack_member[k].Thailand_Footnote.length > 0) {
                   
                    for (var t = 0; t < stack_member[k].Thailand_Footnote.length; t++) {
                        var thailandFootnote = stack_member[k].Thailand_Footnote[t];
                        
                        // If footnote is "-", keep it as plain text, otherwise make it a clickable link
                        // Check if it's already processed (contains HTML)
                        if (thailandFootnote.trim() === "-") {
                            stack_member[k].Thailand_Footnote[t] = thailandFootnote;
                        } else if (thailandFootnote.includes('class="thailand-footnote-link"')) {
                            // Already processed, don't process again
                            stack_member[k].Thailand_Footnote[t] = thailandFootnote;
                        } else {
                            stack_member[k].Thailand_Footnote[t] = '<span class="thailand-footnote-link" data-thailand-footnote="' + thailandFootnote + '" style="color: #28a745; cursor: pointer; text-decoration: underline; margin: 0 2px;">' + thailandFootnote + '</span>';
                        }
                    }
                    
                } else {
                    
                    stack_member[k].Thailand_Footnote[t] = "-";
                }
                // ----------------------Add Thailand footnote link--------------------------
                    
                    // '<span style="color:'+mapped_color+';">&#x2B23</span>'
                    var card_header = Start_Frequency_label + " - " + Stop_Frequency_label + " " + Stop_Frequency_Unit_label ;
                    card_information = stack_member[k].EngService + ' Service '+card_information_direction+' <br>Designation : ' +stack_member[k].order+ '<br>Bandwidth : '+ Bandwidth +' '+Stop_Frequency_Unit_label+ '<br> International Footnote : '+stack_member[k].International_Footnote+ '<br> Thailand Footnote : '+stack_member[k].Thailand_Footnote+ '' ;
                    // var card_information = stack_member[k].EngService + ' Service<br>Designation : ' +stack_member[k].order+ '<br>' +Start_Frequency_label + " - " + Stop_Frequency_label + " " + Stop_Frequency_Unit_label + '<br>Bandwidth : '+ stack_member[k].Bandwidth +' '+Stop_Frequency_Unit_label+ '<br> Footnote : 5.xx' ; 


                
                    // Escape HTML content for data attributes to prevent breaking HTML structure
                    var escaped_card_information = card_information.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    
                    text +=         '<span id="'+stack_member[k].id+'" class="box" data-content="'+card_header+'" data-detail="'+escaped_card_information+'" style="font-size:'+fontsize+'px; background-image: '+service_order_style+'; margin-left:'+offset_start_freq+'px; line-height:'+height+'px; height:'+height+'px; width:'+width+'px; background-color:'+mapped_color+';' ;
                
        
                if (stack_member[k].EngService == "gap")
                {
                    hover_information = "";
                }
                text +=                 'data-toggle="tooltip" data-placement="top" title="'+hover_information+'";>'+block_label+'</span>';    

               
            } // end of stack member loop

            text +=     '</span>'; //End of stack Container
        } // end of stack-loop

        //End of mainContainer for each row
        text +=     '</span>'; 

        // open label-container
        text += '<span id="labelContainer_'+i+'" class="label-container">';

        var label_length_ref = 0;
        var label_flag = "yes" // yes = plotted label in previous loop , no = didn't plot in previous loop
        for (var l=0; l<SpectrumChart.data.frequencyLabelArray[i].length; l++ )
        {
            SpectrumChart.config.labelFontSize = 10; // in pixel unit / default is 12
            var label_width = SpectrumChart.config.labelFontSize * 1.5 ;

            var this_freq_label = SpectrumChart.data.frequencyLabelArray[i][l];
            var last_freq_label = SpectrumChart.data.frequencyLabelArray[i][SpectrumChart.data.frequencyLabelArray[i].length - 1];
            var [this_shown_label, last_shown_label, Stop_shown_Unit_label] = labelFrequncyConverter(this_freq_label, last_freq_label);
            shown_label = this_shown_label;

            if (l==0){
                text +=     '<span id="frequency-label_'+i+'_'+l+'" class="label-container" style="height:5 px; writing-mode: vertical-rl; transform: rotate(180deg); text-align:right;">'+ shown_label +'</span>';
                label_length_ref = (this_freq_label*scale_factor) + label_width; // px
            }
            else{
                
                if ( (this_freq_label*scale_factor) > label_length_ref)  //px unit
                {
                    var label_gap = (this_freq_label*scale_factor) - label_length_ref;      // px
                    text +=     '<span id="frequency-label_'+i+'_'+l+'" class="label-container" style=" margin-left:0 px; width:'+label_gap+'px;"> </span>';
                    text +=     '<span id="frequency-label_'+i+'_'+l+'" class="label-container" style="height:5 px; writing-mode: vertical-rl; transform: rotate(180deg);">'+ shown_label +'</span>';
                    label_length_ref = (this_freq_label*scale_factor) + label_width;
                }
            }
        }
        text += '</span>'; // close label-container

        if (row_family[0].EngService == "gap" && row_family.length ==1) { continue; }
        text += '<span id="newline-container" class="newline-container" style="height:'+height_newline+'px;"> </span>'; //insert new line

    } // end of row-loop
    // Horizontal legend container is now in HTML, no need to create it here
        
    DOMCache.get('output').innerHTML += text;
    
    PerformanceUtils.endTimer('plot');
    SpectrumChart.performance.renderCount++;
}


function scaler(data,row_id) {

    var sum_bandwidth=0;
    var current_stack_bandwidth = 0;
    const row_family = data.filter(word => word.row_id == row_id); 
    
    var stack_id_array = getUniqueValuesOfAttributebyAttribute(row_family,"stack_id");

    for (var element of stack_id_array) {   //element is stack_id found in the current row_family

        var stack_member = getStackMembers(row_family, element);    //element is stack_id found in the current row_family
        let min_start_freq = Math.min(...stack_member.map(item => item.Start_Frequency));
        let max_stop_freq = Math.max(...stack_member.map(item => item.Stop_Frequency));
        let stack_width = max_stop_freq - min_start_freq;

        if (element == stack_id_array[0] && row_family[0].EngService == "gap"){
            current_stack_bandwidth = 0;
        }
        else{
            current_stack_bandwidth = stack_width;
        }
        
        sum_bandwidth += parseFloat(current_stack_bandwidth) ;

    }

    // if (sum_bandwidth == 0) {sum_bandwidth = 0.135; } // prevent Infinity
    
    var scale_factor = parseFloat(SpectrumChart.dimensions.containerWidth/sum_bandwidth); // set factor

    return scale_factor;
}

function GroupAndRemoveDupplicate(array) {
      
// Create a map to store unique services and their directions
const resultMap = new Map();

array.forEach(item => {
  const { Service, Direction } = item;

  if (!resultMap.has(Service)) {
    // If Service is not in the map, add it with the current Direction
    resultMap.set(Service, { Service, Direction: [...Direction] });
  } else {
    // If Service is already in the map, merge the Directions (excluding duplicates)
    const existingItem = resultMap.get(Service);
    existingItem.Direction = [...new Set([...existingItem.Direction, ...Direction])];
  }
});

// Convert the map values to an array and sort the directions in ascending order
const result = Array.from(resultMap.values()).map(item => ({
  ...item,
  Direction: item.Direction.sort()
}));
      return result;
      
}

function getColor2(service) {
    const entry = SpectrumChart.data.colorArray.find(entry => entry.Service === service);
    return entry ? entry.Color : null;
  }

/**
 * ========================================
 * LEGEND CREATION & MANAGEMENT SYSTEM
 * ========================================
 * 
 * Functions responsible for creating, managing, and updating
 * the interactive legend system. Supports both vertical and
 * horizontal display modes with real-time filtering.
 */

/**
 * Create vertical service legend with color-coded entries
 * @param {Array} colorArray - Array of service color mappings
 */
function createServiceLegend(colorArray) {
    var colorLegend ="";

    var data_legend = [];

    for (var i=0; i<SpectrumChart.data.jsonArrayFiltered.length; i++) {
        data_legend[i] = {};
        data_legend[i].Service = SpectrumChart.data.jsonArrayFiltered[i].EngService;
        data_legend[i].Direction = SpectrumChart.data.jsonArrayFiltered[i].Direction;
    }
    var grouped_legend = GroupAndRemoveDupplicate(data_legend);
    grouped_legend = leftJoin(colorArray, grouped_legend, 'Service', 'Service');

    for(var i = 0;i<grouped_legend.length; i++){
        colorLegend+= '<span id="'+grouped_legend[i].Service+'"class="legend" style="display:flex">'
        colorLegend+=   '<span id="'+grouped_legend[i].Service+'" onclick="onclickLegend(this)" class="legend" style="display: inline-block; margin-bottom: 0px;cursor:default;">';
        colorLegend+=       '<span class="legend" style="color: '+grouped_legend[i].Color+'; font-size: 20px;">&#x2B23</span>';
        colorLegend+=       '<span class="legend"> '+grouped_legend[i].Service+'</span>';
        colorLegend+=   '</span>';
        colorLegend+=   '<span style="flex: 1;" id="'+grouped_legend[i].Service+'" onclick="onclickLegend(this)" class="legend"> </span>';  //blank
        
        for(var j=0; j<grouped_legend[i].Direction.length; j++) {
            
            var id_string = String(grouped_legend[i].Service+'*'+grouped_legend[i].Direction[j] ).replace(/ /g, "_");
            
            if (grouped_legend[i].Direction[j] == "Earth-to-Space") { colorLegend+=   '<span id='+id_string+' class="legend-direction" style="font-size: 20px; margin-left: auto;" onclick="onclickLegend(this)">&#8593</span>'; }
            else if (grouped_legend[i].Direction[j] == "Space-to-Earth") { colorLegend+=   '<span id='+id_string+' class="legend-direction" style="font-size: 20px; margin-left: auto;" onclick="onclickLegend(this)">&#8595</span>'; }
            else if (grouped_legend[i].Direction[j] == "Space-to-Space") { colorLegend+=   '<span id='+id_string+' class="legend-direction" style="font-size: 18px; margin-left: auto;" onclick="onclickLegend(this)">&#8596</span>'; }
            else if (grouped_legend[i].Direction[j] == "Deep Space") { colorLegend+=   '<span id='+id_string+' class="legend-direction" style="font-size: 12px; margin-left: auto;" onclick="onclickLegend(this)">&#11097</span>'; }
            else { colorLegend+= ""; }
        }
        colorLegend+= '</span>';
        // colorLegend+= '<p id="'+colorArray[i].Service+'" onclick="onclickLegend(this)" class="legend" style="margin-bottom: 0px;cursor:default;"><span style="color: '+colorArray[i].Color+'; font-size: 20px;">&#x2B23;></span><span>'+colorArray[i].Service+'</span>'
    }
    DOMCache.get('Legend').innerHTML = colorLegend; // Replace instead of append
}

function leftJoin(leftArray, rightArray, leftKey, rightKey) {
    return leftArray.map(leftItem => {
        let matchingRightItem = rightArray.find(rightItem => leftItem[leftKey] === rightItem[rightKey]);
        return { ...leftItem, ...matchingRightItem };
    });
}

function createServiceLegendHorizontal(colorArray) {
    var colorLegend = "";

    var data_legend = [];

    for (var i = 0; i < SpectrumChart.data.jsonArrayFiltered.length; i++) {
        data_legend[i] = {};
        data_legend[i].Service = SpectrumChart.data.jsonArrayFiltered[i].EngService;
        data_legend[i].Direction = SpectrumChart.data.jsonArrayFiltered[i].Direction;
    }
    var grouped_legend = GroupAndRemoveDupplicate(data_legend);
    grouped_legend = leftJoin(colorArray, grouped_legend, "Service", "Service");

    for (var i = 0; i < grouped_legend.length; i++) {
        colorLegend += '<div id="' + grouped_legend[i].Service + '" class="legend-hor" style="display: inline-flex; align-items: center; cursor: default;">';
        colorLegend += '<span class="legend-hor" style="color: ' + grouped_legend[i].Color + '; font-size: 20px;">&#x2B23;</span>';
        colorLegend += '<span class="legend-hor" style="margin-left: 5px;" >' + grouped_legend[i].Service + '</span>';

        for (var j = 0; j < grouped_legend[i].Direction.length; j++) {
            var id_string = String(grouped_legend[i].Service + "*" + grouped_legend[i].Direction[j]).replace(/ /g, "_");

            var directionSymbol = "";
            if (grouped_legend[i].Direction[j] == "Earth-to-Space") directionSymbol = "&#8593"; // ↑
            else if (grouped_legend[i].Direction[j] == "Space-to-Earth") directionSymbol = "&#8595"; // ↓
            else if (grouped_legend[i].Direction[j] == "Space-to-Space") directionSymbol = "&#8596"; // ↔
            else if (grouped_legend[i].Direction[j] == "Deep Space") directionSymbol = "&#11097"; // ⦿

            if (directionSymbol) {
                colorLegend += '<span id="' + id_string + '" class="legend-direction-hor" style="font-size: 18px; margin-left: 8px;" >' + directionSymbol + '</span>';
            }
        }
        colorLegend += '</div>';
    }

    const horizontalLegend = document.getElementById('Legend-horizontal');
    if (horizontalLegend) {
        horizontalLegend.innerHTML = colorLegend;
    }
}

/**
 * ========================================
 * FOOTNOTE LEGEND FUNCTIONS
 * ========================================
 */

/**
 * Create vertical footnote legend list
 * @param {Array} footnotes - Array of footnote objects with number and detail
 */
function createFootnoteLegend(footnotes) {
    var footnoteLegend = "";
    
    for (var i = 0; i < footnotes.length; i++) {
        var footnote = footnotes[i];
        var footnoteId = 'footnote-' + footnote.number.replace('.', '-');
        const footnoteType = footnote.type || 'International';
        const clickHandler = footnoteType === 'Thailand' ? 'showThailandFootnoteCardInCenter' : 'showFootnoteCardInCenter';
        
        footnoteLegend += '<span id="' + footnoteId + '" class="footnote-legend legend" style="display:flex;">';
        footnoteLegend += '<span class="footnote-legend" onclick="' + clickHandler + '(\'' + footnote.number + '\')" style="display: inline-block; cursor: pointer; width: 100%;">';
        footnoteLegend += '<span class="footnote-legend">' + footnoteType + ' Footnote ' + footnote.number + '</span>';
        footnoteLegend += '</span>';
        footnoteLegend += '</span>';
    }
    
    DOMCache.get('Legend').innerHTML = footnoteLegend;
}

/**
 * Create horizontal footnote legend list
 * @param {Array} footnotes - Array of footnote objects with number and detail
 */
function createFootnoteLegendHorizontal(footnotes) {
    var footnoteLegend = "";
    
    for (var i = 0; i < footnotes.length; i++) {
        var footnote = footnotes[i];
        var footnoteId = 'footnote-hor-' + footnote.number.replace('.', '-');
        const footnoteType = footnote.type || 'International';
        const clickHandler = footnoteType === 'Thailand' ? 'showThailandFootnoteCardInCenter' : 'showFootnoteCardInCenter';
        
        footnoteLegend += '<div id="' + footnoteId + '" class="footnote-legend-hor legend-hor" style="display: inline-flex; align-items: center; cursor: pointer;" onclick="' + clickHandler + '(\'' + footnote.number + '\')">';
        footnoteLegend += '<span class="footnote-legend-hor">' + footnoteType + ' Footnote ' + footnote.number + '</span>';
        footnoteLegend += '</div>';
    }
    
    const horizontalLegend = document.getElementById('Legend-horizontal');
    if (horizontalLegend) {
        horizontalLegend.innerHTML = footnoteLegend;
    }
    
}

/**
 * Generate vertical footnote legend HTML string (for appending to existing content)
 * @param {Array} footnotes - Array of footnote objects with number and detail
 * @returns {string} HTML string for footnote legend
 */
function createFootnoteLegendHTML(footnotes) {
    var footnoteLegend = "";
    
    for (var i = 0; i < footnotes.length; i++) {
        var footnote = footnotes[i];
        // Extract footnote number from object - handle different object structures
        var footnoteNumber = footnote.displayNumber || footnote.number || footnote.Number || footnote;
        
        if (typeof footnoteNumber === 'object') {
            footnoteNumber = footnoteNumber.number || footnoteNumber.displayNumber || JSON.stringify(footnoteNumber);
        }
        var footnoteId = 'footnote-' + (typeof footnoteNumber === 'string' ? footnoteNumber.replace('.', '-') : footnoteNumber);
        const footnoteType = footnote.footnoteType === 'international' ? 'International' : footnote.type || 'International';
        const clickHandler = footnoteType === 'Thailand' ? 'showThailandFootnoteCardInCenter' : 'showFootnoteCardInCenter';
        
        footnoteLegend += '<span id="' + footnoteId + '" class="footnote-legend legend" style="display:flex;">';
        footnoteLegend += '<span class="footnote-legend" onclick="' + clickHandler + '(\'' + footnoteNumber + '\')" style="display: inline-block; cursor: pointer; width: 100%;">';
        footnoteLegend += '<span class="footnote-legend">' + footnoteType + ' Footnote ' + footnoteNumber + '</span>';
        footnoteLegend += '</span>';
        footnoteLegend += '</span>';
    }
    
    return footnoteLegend;
}

/**
 * Generate horizontal footnote legend HTML string (for appending to existing content)
 * @param {Array} footnotes - Array of footnote objects with number and detail  
 * @returns {string} HTML string for horizontal footnote legend
 */
function createFootnoteLegendHorizontalHTML(footnotes) {
    var footnoteLegend = "";
    
    for (var i = 0; i < footnotes.length; i++) {
        var footnote = footnotes[i];
        // Extract footnote number from object - handle different object structures
        var footnoteNumber = footnote.displayNumber || footnote.number || footnote.Number || footnote;
        
        if (typeof footnoteNumber === 'object') {
            footnoteNumber = footnoteNumber.number || footnoteNumber.displayNumber || JSON.stringify(footnoteNumber);
        }
        var footnoteId = 'footnote-hor-' + (typeof footnoteNumber === 'string' ? footnoteNumber.replace('.', '-') : footnoteNumber);
        const footnoteType = footnote.footnoteType === 'international' ? 'International' : footnote.type || 'International';
        const clickHandler = footnoteType === 'Thailand' ? 'showThailandFootnoteCardInCenter' : 'showFootnoteCardInCenter';
        
        footnoteLegend += '<div id="' + footnoteId + '" class="footnote-legend-hor legend-hor" style="display: inline-flex; align-items: center; cursor: pointer;" onclick="' + clickHandler + '(\'' + footnoteNumber + '\')">';
        footnoteLegend += '<span class="footnote-legend-hor">' + footnoteType + ' Footnote ' + footnoteNumber + '</span>';
        footnoteLegend += '</div>';
    }
    
    return footnoteLegend;
}

/**
 * Generate Thailand footnote legend HTML string for language-specific search results
 * @param {Array} footnotes - Array of Thailand footnote objects with displayNumber and displayDescription
 * @returns {string} HTML string for Thailand footnote legend
 */
function createThailandFootnoteLegendHTML(footnotes) {
    var footnoteLegend = "";
    
    for (var i = 0; i < footnotes.length; i++) {
        var footnote = footnotes[i];
        var footnoteNumber = footnote.displayNumber || footnote.Number || 'N/A';
        var footnoteId = 'thailand-footnote-' + String(footnoteNumber).replace('.', '-');
        
        footnoteLegend += '<span id="' + footnoteId + '" class="footnote-legend legend" style="display:flex;">';
        footnoteLegend += '<span class="footnote-legend" onclick="showThailandFootnoteCardInCenter(\'' + footnoteNumber + '\')" style="display: inline-block; cursor: pointer; width: 100%;">';
        footnoteLegend += '<span class="footnote-legend">Thailand Footnote ' + footnoteNumber + '</span>';
        footnoteLegend += '</span>';
        footnoteLegend += '</span>';
    }
    
    return footnoteLegend;
}

/**
 * Generate Thailand horizontal footnote legend HTML string for language-specific search results
 * @param {Array} footnotes - Array of Thailand footnote objects with displayNumber and displayDescription
 * @returns {string} HTML string for horizontal Thailand footnote legend
 */
function createThailandFootnoteLegendHorizontalHTML(footnotes) {
    var footnoteLegend = "";
    
    for (var i = 0; i < footnotes.length; i++) {
        var footnote = footnotes[i];
        var footnoteNumber = footnote.displayNumber || footnote.Number || 'N/A';
        var footnoteId = 'thailand-footnote-hor-' + String(footnoteNumber).replace('.', '-');
        
        footnoteLegend += '<div id="' + footnoteId + '" class="footnote-legend-hor legend-hor" style="display: inline-flex; align-items: center; cursor: pointer;" onclick="showThailandFootnoteCardInCenter(\'' + footnoteNumber + '\')">';
        footnoteLegend += '<span class="footnote-legend-hor">Thailand Footnote ' + footnoteNumber + '</span>';
        footnoteLegend += '</div>';
    }
    
    return footnoteLegend;
}

/**
 * Show footnote card in center of screen
 * @param {string} footnoteNumber - The footnote number to display
 */
function showFootnoteCardInCenter(footnoteNumber) {
    
    // Enhanced frequency box highlighting based on International footnote content
    highlightFrequencyBoxesByInternationalFootnote(footnoteNumber);
    
    const footnoteDetail = PerformanceUtils.getFootnoteDetail(footnoteNumber);
    
    // Check if card already exists for this footnote
    const existingCard = document.querySelector('.center-footnote-card[data-footnote="' + footnoteNumber + '"]');
    if (existingCard) {
        // Bring existing card to front
        bringToFront(existingCard);
        return;
    }
    
    const footnoteCard = document.createElement('div');
    footnoteCard.className = 'custom-card footnote-card center-footnote-card';
    footnoteCard.setAttribute('data-footnote', footnoteNumber);
    
    // Position in exact center of viewport
    const centerX = (window.innerWidth / 2) - 200;  // Assuming 400px card width
    const centerY = (window.innerHeight / 2) - 150; // Assuming 300px card height
    
    footnoteCard.style.position = 'fixed';
    footnoteCard.style.left = `${centerX}px`;
    footnoteCard.style.top = `${centerY}px`;
    footnoteCard.style.zIndex = '1000';
    footnoteCard.style.minWidth = '400px';
    footnoteCard.style.maxWidth = '600px';
    footnoteCard.style.border = '2px solid #007bff';
    footnoteCard.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    footnoteCard.style.backgroundColor = '#ffffff';
    
    footnoteCard.innerHTML = `
        <div class="card-header" style="background-color: #007bff; color: white; font-weight: bold;">
            <span>Footnote ${footnoteNumber}</span>
            <div class="close-btn">×</div>
        </div>
        <div class="card-body" style="max-height: 300px; overflow-y: auto;">${footnoteDetail}</div>
    `;
    
    const closeBtn = footnoteCard.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        footnoteCard.remove();
    });
    
    // Make footnote card draggable
    const header = footnoteCard.querySelector('.card-header');
    let isDragging = false;
    let offset = [0, 0];
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset = [footnoteCard.offsetLeft - e.clientX, footnoteCard.offsetTop - e.clientY];
        bringToFront(footnoteCard);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            footnoteCard.style.left = `${e.clientX + offset[0]}px`;
            footnoteCard.style.top = `${e.clientY + offset[1]}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Add to DOM and bring to front
    document.getElementById('cards-container').appendChild(footnoteCard);
    bringToFront(footnoteCard);
    
}

/**
 * Highlight frequency boxes based on Thailand footnote content
 * @param {string} footnoteNumber - Thailand footnote number to check
 */
function highlightFrequencyBoxesByThailandFootnote(footnoteNumber) {
    
    // Get all frequency boxes
    const allFrequencyBoxes = document.querySelectorAll('.box, .highlight, .click, .faddd');
    
    
    
    const frequencyDataWithFootnote = SpectrumChart.data.jsonArray.filter(entry => {
        let hasFootnote = false;
        
        if (entry.Thailand_Footnote) {
            // The Thailand_Footnote contains HTML with data-thailand-footnote attributes
            const footnoteStr = String(entry.Thailand_Footnote);
            
            
            // Extract footnote names from data-thailand-footnote attributes
            // Try multiple regex patterns to handle different quote formats
            const regexPatterns = [
                /data-thailand-footnote="([^"]+)"/g,  // Normal quotes
                /data-thailand-footnote='([^']+)'/g,  // Single quotes
                /data-thailand-footnote=&quot;([^&]+)&quot;/g,  // HTML encoded
            ];
            
            const footnotes = [];
            for (const regex of regexPatterns) {
                let match;
                while ((match = regex.exec(footnoteStr)) !== null) {
                    footnotes.push(match[1]);
                }
            }
            
            // Check if our target footnote is in the list (with trimmed comparison for safety)
            hasFootnote = footnotes.some(footnote => footnote.trim() === footnoteNumber.trim());
            
        }
        
        return hasFootnote;
    });
    
    // Get the unique IDs of frequency boxes that should be highlighted
    const idsToHighlight = new Set();
    frequencyDataWithFootnote.forEach(entry => {
        // The frequency boxes use array indices as IDs, so we need to find the index
        const entryIndex = SpectrumChart.data.jsonArray.indexOf(entry);
        if (entryIndex !== -1) {
            // Convert to string to match DOM element IDs
            idsToHighlight.add(String(entryIndex));
        }
    });
    
    // If no IDs found, try using alternative matching approach
    if (idsToHighlight.size === 0 && frequencyDataWithFootnote.length > 0) {
        // Try to find matching boxes by checking if the box ID exists in our data
        frequencyDataWithFootnote.forEach(entry => {
            // Check various possible ID patterns
            const possibleIds = [
                entry.Start_Frequency + '-' + entry.Stop_Frequency,
                entry.EngService,
                entry.Start_Frequency + '_' + entry.EngService,
            ];
            
            possibleIds.forEach(possibleId => {
                if (possibleId && document.getElementById(possibleId)) {
                    idsToHighlight.add(String(possibleId));
                }
            });
        });
    }
    
    // Ultra-fast DOM updates for immediate visual response
    // Separate elements into highlight and fade groups for batch processing
    const elementsToHighlight = [];
    const elementsToFade = [];
    
    allFrequencyBoxes.forEach((box) => {
        if (idsToHighlight.has(box.id)) {
            elementsToHighlight.push(box);
        } else {
            elementsToFade.push(box);
        }
    });
    
    // Apply states instantly using optimized methods
    DOMCache.setFrequencyBoxState(elementsToHighlight, 'highlight');
    elementsToHighlight.forEach(box => box.classList.add('thailand-highlighted'));
    
    DOMCache.setFrequencyBoxState(elementsToFade, 'fade');
    
}

/**
 * Highlight frequency boxes based on International footnote content
 * @param {string} footnoteNumber - International footnote number to check
 */
function highlightFrequencyBoxesByInternationalFootnote(footnoteNumber) {
    
    // Get all frequency boxes
    const allFrequencyBoxes = document.querySelectorAll('.box, .highlight, .click, .faddd');
    
    const frequencyDataWithFootnote = SpectrumChart.data.jsonArray.filter(entry => {
        let hasFootnote = false;
        
        if (entry.International_Footnote && Array.isArray(entry.International_Footnote)) {
            // Check if the footnoteNumber exists in the International_Footnote array
            hasFootnote = entry.International_Footnote.some(footnote => {
                // Handle both plain text and HTML footnotes
                let footnoteText = footnote;
                if (typeof footnote === 'string' && footnote.includes('data-footnote=')) {
                    // Extract footnote number from HTML data-footnote attribute
                    const match = footnote.match(/data-footnote="([^"]+)"/);
                    footnoteText = match ? match[1] : footnote;
                }
                return footnoteText.trim() === footnoteNumber.trim();
            });
        }
        
        return hasFootnote;
    });
    
    // Get the unique IDs of frequency boxes that should be highlighted
    const idsToHighlight = new Set();
    frequencyDataWithFootnote.forEach(entry => {
        // The frequency boxes use array indices as IDs, so we need to find the index
        const entryIndex = SpectrumChart.data.jsonArray.indexOf(entry);
        if (entryIndex !== -1) {
            // Convert to string to match DOM element IDs
            idsToHighlight.add(String(entryIndex));
        }
    });
    
    // If no IDs found, try using alternative matching approach
    if (idsToHighlight.size === 0 && frequencyDataWithFootnote.length > 0) {
        // Try to find matching boxes by checking if the box ID exists in our data
        frequencyDataWithFootnote.forEach(entry => {
            // Check various possible ID patterns
            const possibleIds = [
                entry.Start_Frequency + '-' + entry.Stop_Frequency,
                entry.EngService,
                entry.Start_Frequency + '_' + entry.EngService,
            ];
            
            possibleIds.forEach(possibleId => {
                if (possibleId && document.getElementById(possibleId)) {
                    idsToHighlight.add(String(possibleId));
                }
            });
        });
    }
    
    // Ultra-fast DOM updates for immediate visual response
    // Separate elements into highlight and fade groups for batch processing
    const elementsToHighlight = [];
    const elementsToFade = [];
    
    allFrequencyBoxes.forEach((box) => {
        if (idsToHighlight.has(box.id)) {
            elementsToHighlight.push(box);
        } else {
            elementsToFade.push(box);
        }
    });
    
    // Apply states instantly using optimized methods
    DOMCache.setFrequencyBoxState(elementsToHighlight, 'highlight');
    
    DOMCache.setFrequencyBoxState(elementsToFade, 'fade');
    
}

/**
 * Show Thailand footnote card in center of screen
 * @param {string} footnoteNumber - The Thailand footnote number to display
 */
function showThailandFootnoteCardInCenter(footnoteNumber) {
    
    // Enhanced frequency box highlighting based on Thailand footnote content
    highlightFrequencyBoxesByThailandFootnote(footnoteNumber);
    
    const footnoteDetail = PerformanceUtils.getThailandFootnoteDetail(footnoteNumber);
    
    // Check if card already exists for this footnote
    const existingCard = document.querySelector('.center-footnote-card[data-thailand-footnote="' + footnoteNumber + '"]');
    if (existingCard) {
        // Bring existing card to front
        bringToFront(existingCard);
        return;
    }
    
    const footnoteCard = document.createElement('div');
    footnoteCard.className = 'custom-card footnote-card center-footnote-card thailand-footnote-card';
    footnoteCard.setAttribute('data-thailand-footnote', footnoteNumber);
    
    // Position in exact center of viewport
    const centerX = window.innerWidth / 2 - 200; // 400px card width / 2
    const centerY = window.innerHeight / 2 - 100; // Approximate card height / 2
    
    footnoteCard.style.position = 'fixed';
    footnoteCard.style.left = `${centerX}px`;
    footnoteCard.style.top = `${centerY}px`;
    footnoteCard.style.zIndex = '1000';
    footnoteCard.style.minWidth = '400px';
    footnoteCard.style.border = '2px solid #28a745';
    footnoteCard.style.backgroundColor = '#f8ffe8';
    footnoteCard.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    footnoteCard.innerHTML = `
        <div class="card-header" style="background-color: #28a745; color: white; font-weight: bold;">
            <span>${footnoteNumber}</span>
            <div class="close-btn">×</div>
        </div>
        <div class="card-content">${footnoteDetail}</div>
    `;
    
    const closeBtn = footnoteCard.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        footnoteCard.remove();
    });
    
    // Make Thailand footnote card draggable
    const header = footnoteCard.querySelector('.card-header');
    let isDragging = false;
    let offset = [0, 0];
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offset = [footnoteCard.offsetLeft - e.clientX, footnoteCard.offsetTop - e.clientY];
        bringToFront(footnoteCard);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            footnoteCard.style.left = `${e.clientX + offset[0]}px`;
            footnoteCard.style.top = `${e.clientY + offset[1]}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Add to DOM and bring to front
    document.getElementById('cards-container').appendChild(footnoteCard);
    bringToFront(footnoteCard);
    
}



function createApplicationLegend(application_legend_array) {
    var application_legend ="";
    for(var i = 0;i<application_legend_array.length; i++){
        application_legend+= '<p id="'+application_legend_array[i].Application+'" onclick="onclickLegend(this)" class="legend" style="margin-bottom: 0px;cursor:default;"><span style="color: '+application_legend_array[i].Color+'; font-size: 20px;">&#x2B23;</span><span> '+application_legend_array[i].Application+'</button>'
    }
    $('#Legend').append(application_legend);
}

function assignGapFrequencyLabel(data) {
    if (!data || data.length === 0) return;
    for (var i=0; i<=data[data.length-1].row_id; i++) 
    {
        const row_family = data.filter(word => word.row_id == i);
        var Frequency_array = [];

        for (var j=0; j<row_family.length; j++)
        {  
            if (row_family[j].EngService != "gap")
            {
                Frequency_array.push(row_family[j].Start_Frequency);
                Frequency_array.push(row_family[j].Stop_Frequency);
            }
            else{

                if (j != 0)
                {
                    Frequency_array.push(row_family[j].Start_Frequency);
                    Frequency_array.push(row_family[j].Stop_Frequency);
                }
            }
        } // end of for

        var sorted_family = Frequency_array.sort((a, b) => a - b);  // Sort frequencies
        var uniqueArray = [...new Set(sorted_family)];              // Remove duplicates using the Set object
        SpectrumChart.data.frequencyLabelArray.push(uniqueArray);
    }
    // frequencyLabelArray = frequencyLabelArray.filter(subArray => subArray.length > 0);
    // console.log(frequencyLabelArray);
}


function labelFrequncyConverter(Start_Frequency, Stop_Frequency) {
    var Start_Frequency_label = "";
    var Stop_Frequency_label = "";
    var Stop_Frequency_Unit_label = "";

    //prepare frequency for showing label  convert MHz to GHz / kHz
    if (Stop_Frequency > 10000) // > 10000 MHz
    {
        Start_Frequency_label = parseFloat(Start_Frequency) / 1000;
        Stop_Frequency_label = parseFloat(Stop_Frequency) / 1000;
        Stop_Frequency_Unit_label = "GHz";
    }
    else if (Stop_Frequency < 1) // < 1 MHz
    {
        Start_Frequency_label = parseFloat(Start_Frequency) * 1000;
        Stop_Frequency_label = parseFloat(Stop_Frequency) * 1000;
        Stop_Frequency_Unit_label = "kHz";
    }
    else // MHz
    {
        Start_Frequency_label = Start_Frequency;
        Stop_Frequency_label = Stop_Frequency;
        Stop_Frequency_Unit_label = "MHz";
    }
    return [Start_Frequency_label, Stop_Frequency_label, Stop_Frequency_Unit_label];
}


// function toggleDarkMode() {
//     const body = document.body;
//     body.classList.toggle('dark-mode');

//     // Get all elements with the common class
//     const commonElements = document.querySelectorAll('.main-container');

//     // Toggle the dark mode class for each element
//     commonElements.forEach(element => {
//         element.classList.toggle('dark_mode');
        
//     });
// }

/**
 * ========================================
 * USER INTERFACE & INTERACTION HANDLERS
 * ========================================
 * 
 * Functions managing user interactions, menu selections,
 * UI mode toggles, and class management for visual feedback.
 * Includes dark mode, legend toggles, and element styling.
 */

/**
 * Toggle dark mode for the legend display
 */
function toggleDarkMode() {
    var section = document.getElementById("Legend");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });
    removeElementsByIds(output_elementIds);
    var section = document.getElementById("output");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });
    removeElementsByIds(output_elementIds);
}


function toggletoService() {
    var section = document.getElementById("Legend");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });
    removeElementsByIds(output_elementIds);
    createServiceLegend(colorArray_filtered);
    createServiceLegendHorizontal(colorArray_filtered);
    SpectrumChart.legend.toggleMode = "service";
    console.log("to service")    
}

function toggletoApplication() {
    var section = document.getElementById("Legend");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });
    removeElementsByIds(output_elementIds);
    createApplicationLegend(colorArray_application_filtered);
    SpectrumChart.legend.toggleMode = "application";
    console.log("to application") 
}


function onclickChart(clickedElement){
    var elementId = clickedElement.id;
    var element = document.getElementById(elementId);

    //...
}


function onclickLegend(clickedElement){

    var clicked_elementId = clickedElement.id;
    // var temp_elementId_direction = clickedElement.id;
    var separated_string_array = clicked_elementId.split("*");
    var elementId = separated_string_array[0].replace(/\s/g, "_");
    // var element = document.getElementById(elementId);
    
    // check if user clicks on service or service's direction
    if (clicked_elementId.includes("*")) { 
        // if click on direction of service legend
        if (!SpectrumChart.legend.selected.includes(elementId)) {
            SpectrumChart.legend.selected.push(elementId);
        }
        var elementId_direction = clicked_elementId;
        // var element_direction = document.getElementById(elementId_direction);
        if(SpectrumChart.legend.selectedDirection.includes(clicked_elementId)){
            // if already exists in the global array -> delete & unfilter its direction
            SpectrumChart.legend.selectedDirection = SpectrumChart.legend.selectedDirection.filter(item => item !== clicked_elementId);    //remove from the global array
            var temp_elementId_direction_array = [];
            temp_elementId_direction_array[0] = clicked_elementId;
            toggleClassesbyID(temp_elementId_direction_array, "legend-direction");
        }
        else{
            // not exists -> put the direction id to the global array & filter its direction
            SpectrumChart.legend.selectedDirection.push(elementId_direction);
            
            toggleClassesbyID(SpectrumChart.legend.selectedDirection, "legend-direction-clicked");
            var temp_elementId = [];
            temp_elementId[0] = elementId.replace(/_/g, " ");   //  need to replace _ with blank space to map with the ID of legends with spaces
            toggleClassesbyID(temp_elementId, "legend-checked");
        }
    }
    else {    //if click on service legend
        if(SpectrumChart.legend.selected.includes(elementId)){    // service is already selected
            SpectrumChart.legend.selected = SpectrumChart.legend.selected.filter(item => item !== elementId);  // remove the service id from the global array
            var unselected_legend_direction = [];
            var separated_direction ;
            var service_name ;
            // to remove all its directions from SelectedLegendDirection
            var selected_legend_direction_temp = SpectrumChart.legend.selectedDirection;       // temp var for prevention of loop paradox  to use its constant length in loop
            for (var i = 0; i < SpectrumChart.legend.selectedDirection.length; i++) {
                separated_direction = SpectrumChart.legend.selectedDirection[i].split("*")
                service_name = separated_direction[0].replace(/\s/g, "_");      // replace blank space with _
                if (service_name == elementId) {  // if current direction belongs to the service
                    unselected_legend_direction.push(SpectrumChart.legend.selectedDirection[i]);   // push clicked service to unclick state
                    selected_legend_direction_temp = selected_legend_direction_temp.filter(item => item !== SpectrumChart.legend.selectedDirection[i]); // filter out directions under the clicked service
                }
            }
            SpectrumChart.legend.selectedDirection = selected_legend_direction_temp;
            var temp_elementId = [];
            temp_elementId[0] = elementId.replace(/_/g, " ");
            toggleClassesbyID(temp_elementId, "legend");
            toggleClassesbyID(unselected_legend_direction, "legend-direction");
            
        }
        else { // service is just selected
            SpectrumChart.legend.selected.push(elementId);
            var temp_elementId = [];
            temp_elementId[0] = elementId.replace(/_/g, " ");
            toggleClassesbyID(temp_elementId, "legend-checked");
        }
    }





    // for data
    var set = new Set([...SpectrumChart.legend.selected, ...SpectrumChart.legend.selectedDirection]); // union both arrays
    var selected_service_and_direction = Array.from(set);

    for (var i = 0; i < selected_service_and_direction.length; i++) {
        if (!selected_service_and_direction[i].includes("*")) {
            // if no direction, concat "*undefined" to it for mapping with data
            selected_service_and_direction[i] += "*undefined";
        }
    }


    var selected_data = [];
    var unselected_data = [];

    for (var i = 0; i < selected_service_and_direction.length; i++) {
        selected_data = SpectrumChart.data.jsonArrayFiltered.filter(item => selected_service_and_direction[i].includes(item[SpectrumChart.data.jsonArrayFiltered]));
    }

    selected_data, unselected_data  = filterAndPartitionData(SpectrumChart.data.jsonArrayFiltered, 'Service_and_direction', selected_service_and_direction);
    selected_data = unselected_data.filteredData;
    unselected_data = unselected_data.unfilteredData;
    
    // for no service is selected but still perform search
    if ((SpectrumChart.legend.inputValue != "") && (SpectrumChart.legend.selected.length == 0)){
        selected_data = SpectrumChart.data.jsonArrayFiltered.filter(item => SpectrumChart.data.serviceArrayFiltered.includes(item.EngService));
        unselected_data = SpectrumChart.data.jsonArrayFiltered.filter(item => !SpectrumChart.data.serviceArrayFiltered.includes(item.EngService));
console.log("YES");
    }


    var selected_data_id =[];
    for(var i = 0; i < selected_data.length; i++){
        selected_data_id[i] = selected_data[i].id;
    }

    var unselected_data_id =[];
    for(var i = 0; i < unselected_data.length; i++){
        unselected_data_id[i] = unselected_data[i].id;
    }
    
    // console.log(selected_data_id);
    // console.log(unselected_data_id);

    
    if(selected_data_id.length != 0){
    toggleClassesbyID(selected_data_id, "highlight");
    toggleClassesbyID(unselected_data_id, "faddd");
    }
    else (toggleClasses(SpectrumChart.data.jsonArrayFiltered, "box"));

    
    
}

  
// Function to group and union
function groupAndUnionServiceDirection(array) {
    const grouped = {};
    
    // Iterate through each object in the array
    array.forEach(obj => {
      // Check if attribute1 already exists in grouped
      if (!grouped[obj.service]) {
        // If not, create a new array for that attribute1 value
        grouped[obj.service] = [];
      }
      
      // Push attribute2 value to the corresponding attribute1 array
      grouped[obj.service].push(obj.direction);
    });
    
    // Convert grouped object to an array of objects
    const result = Object.keys(grouped).map(key => ({
        service: key,
        direction: grouped[key]
    }));
    
    return result;
}

function removeDuplicates(array, attributes) {
    const uniqueArray = [];
  
    array.forEach(obj => {
      // Check if there's no existing object in uniqueArray with the same combination of attribute values
      if (!uniqueArray.some(item =>
        attributes.every(attr => item[attr] === obj[attr])
      )) {
        uniqueArray.push(obj);
      }
    });
  
    return uniqueArray;
  }
  

function filterAndPartitionData(data, attribute, attributeArray) {
    console.log(attributeArray);
    var attributeArray_splitted = [];
    for (var i = 0 ; i < attributeArray.length ; i++){
        let text = attributeArray[i].replace(/_/g, " ");    // replace "_" with blank space
        attributeArray_splitted[i] = text.split('*');
    }

    const attributeNames = ['service', 'direction'];
    // Create a new array of objects with attribute names
    attributeArray_splitted = attributeArray_splitted.map(item => Object.fromEntries(attributeNames.map((name, index) => [name, item[index]])));

    var attributeArray_groupped = groupAndUnionServiceDirection(attributeArray_splitted);
    // console.log(attributeArray_groupped);

    let filteredData = [];
    let filteredData_id = [];
    let unfilteredData = [];

    for (var i = 0 ; i < attributeArray_groupped.length ; i++){
        if ((attributeArray_groupped[i].direction.length == 1) && (attributeArray_groupped[i].direction[0] == "undefined")){    //for selected with no direction
            var temp_selected = data.filter(item => item.EngService === attributeArray_groupped[i].service);
        }
        else {  // for selected with directions
            var service_and_direction =[];
            for (var j = 0; j < attributeArray_groupped[i].direction.length; j++){
                service_and_direction.push(String(attributeArray_groupped[i].service).replace(/_/g, " ") + "*" + attributeArray_groupped[i].direction[j]);  // need to replace blank space back to _ for mapping
            }
            console.log(service_and_direction);
            var temp_selected = data.filter(item => service_and_direction.includes(item.Service_and_direction));
        }

        for (var j = 0; j < temp_selected.length; j++) {
            filteredData.push(temp_selected[j]);
            filteredData_id.push(temp_selected[j].id);
        }
    }

    // data.forEach(item => {
    //     if (attributeArray.includes(item[attribute])) {
    //         filteredData.push(item);
    //     } else {
    //         unfilteredData.push(item);
    //     }
    // });

    // Define the attributes based on which you want to check for duplicates
    const attributesToCheck = ['id'];
    
    // Remove duplicate objects based on the specified attributes
    filteredData = removeDuplicates(filteredData, attributesToCheck);
    // unfilteredData = removeDuplicates(unfilteredData, attributesToCheck);
    var idsToRemove = filteredData_id;
    unfilteredData = data.filter(item => !idsToRemove.includes(item.id));


    // console.log(filteredData);
    // console.log(unfilteredData);
    return { filteredData, unfilteredData };
}


function logInput() {
    SpectrumChart.legend.inputValue = DOMCache.get('inputBox_legend').value;
    
    resetTimer();
    if (timeoutFlag == false) {
        // console.log("Reset occurred. Exiting the function.");
        return; // Exit the function
    }

    
}


let timeoutFlag = false;
let delayTimer;
function resetTimer() {
    clearTimeout(delayTimer);
    timeoutFlag = false

    delayTimer = setTimeout(function() {
        timeoutFlag = true;
        // console.log("User stopped typing for 1 second");
        PerformSearch(SpectrumChart.legend.inputValue);
    }, 0);
}

/**
 * ========================================
 * SEARCH & FILTERING ENGINE
 * ========================================
 * 
 * Comprehensive search and filtering system for real-time
 * data filtering by frequency range, service type, and legend.
 * Optimized with performance caching and efficient algorithms.
 */

/**
 * ========================================
 * FOOTNOTE SEARCH FUNCTIONS
 * ========================================
 */

/**
 * Detect search language and determine search type
 * @param {string} searchTerm - Search query string
 * @returns {string} 'thai' | 'thailand' | 'general'
 */
function detectSearchLanguage(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return 'general';
    
    const trimmedSearch = searchTerm.trim().toLowerCase();
    
    // Thai Unicode range: U+0E00-U+0E7F (Thai characters)
    const thaiPattern = /[\u0E00-\u0E7F]/;
    
    if (thaiPattern.test(trimmedSearch)) {
        return 'thai';
    } else if (trimmedSearch === 't' || trimmedSearch.startsWith('t-') || trimmedSearch.startsWith('timt') || trimmedSearch.startsWith('tfixed')) {
        // Only trigger Thailand mode for very specific patterns:
        // - Just "t" (show all Thailand footnotes starting with T)
        // - "t-" prefix (Thailand footnote pattern like "T-IMT")  
        // - Known Thailand-specific terms like "timt", "tfixed"
        return 'thailand';
    } else {
        return 'general';
    }
}

/**
 * Hide frequency range input boxes and fade all frequency rectangles
 */
function hideFrequencyRangeDisplay() {
    // Hide frequency range input controls
    const startFreqInput = DOMCache.get('inputBox_StartFrequency');
    const stopFreqInput = DOMCache.get('inputBox_StopFrequency');
    const unitDropdown = DOMCache.get('unit_dropdown');
    const labels = document.querySelectorAll('.frequency-search-container label');
    
    if (startFreqInput) startFreqInput.style.display = 'none';
    if (stopFreqInput) stopFreqInput.style.display = 'none';
    if (unitDropdown) unitDropdown.style.display = 'none';
    labels.forEach(label => label.style.display = 'none');
    
    // For Thailand footnote search mode, keep frequency boxes as normal "box" class
    // They will be highlighted/faded when specific footnotes are clicked
    const allFrequencyBoxes = document.querySelectorAll('.highlight, .click, .faddd');
    allFrequencyBoxes.forEach(box => {
        box.classList.remove('highlight', 'click', 'faddd');
        box.classList.add('box');
    });
    
    SpectrumChart.search.frequencyRangeHidden = true;
}

/**
 * Restore frequency range input boxes and normal frequency rectangle display
 */
function restoreFrequencyRangeDisplay() {
    // Show frequency range input controls
    const startFreqInput = DOMCache.get('inputBox_StartFrequency');
    const stopFreqInput = DOMCache.get('inputBox_StopFrequency');
    const unitDropdown = DOMCache.get('unit_dropdown');
    const labels = document.querySelectorAll('.frequency-search-container label');
    
    if (startFreqInput) startFreqInput.style.display = '';
    if (stopFreqInput) stopFreqInput.style.display = '';
    if (unitDropdown) unitDropdown.style.display = '';
    labels.forEach(label => label.style.display = '');
    
    // Restore normal frequency rectangle display
    const allFrequencyBoxes = document.querySelectorAll('.faddd');
    allFrequencyBoxes.forEach(box => {
        box.classList.remove('faddd');
        box.classList.add('box');
    });
    
    SpectrumChart.search.frequencyRangeHidden = false;
}

/**
 * Display only footnote results for language-specific searches
 * @param {Array} footnoteMatches - Array of matching footnote objects
 * @param {string} footnoteType - Type of footnotes ('international' or 'thailand')
 */
function displayFootnoteOnlyResults(footnoteMatches, footnoteType) {
    // Clear all existing legends
    clearAllLegends();
    
    // Display only footnote legend based on type
    if (footnoteType === 'international') {
        const legendHTML = createFootnoteLegendHTML(footnoteMatches);
        DOMCache.get('Legend').innerHTML = legendHTML;
        
        // For horizontal legend
        const horizontalLegend = document.querySelector('#Legend-horizontal');
        if (horizontalLegend) {
            horizontalLegend.innerHTML = createFootnoteLegendHorizontalHTML(footnoteMatches);
        }
    } else if (footnoteType === 'thailand') {
        const legendHTML = createThailandFootnoteLegendHTML(footnoteMatches);
        DOMCache.get('Legend').innerHTML = legendHTML;
        
        // For horizontal legend
        const horizontalLegend = document.querySelector('#Legend-horizontal');
        if (horizontalLegend) {
            horizontalLegend.innerHTML = createThailandFootnoteLegendHorizontalHTML(footnoteMatches);
        }
    }
    
}

/**
 * Clear all legend displays
 */
function clearAllLegends() {
    DOMCache.get('Legend').innerHTML = '';
    const horizontalLegend = document.querySelector('#Legend-horizontal');
    if (horizontalLegend) {
        horizontalLegend.innerHTML = '';
    }
}

/**
 * Enhanced findFootnotesByText with type filtering support
 * @param {string} searchText - Text to search for
 * @param {string} footnoteType - Optional type filter ('international', 'thailand', or undefined for both)
 * @returns {Array} Array of matching footnote objects with type information
 */
function findFootnotesByText(searchText, footnoteType = undefined) {
    if (!searchText || searchText.trim() === '') return [];
    
    const searchLower = searchText.toLowerCase();
    const matches = [];
    
    // Search International footnotes if not specifically filtering for Thailand footnotes
    if (!footnoteType || footnoteType === 'international') {
        if (SpectrumChart.data.footnoteArray && SpectrumChart.data.footnoteArray.length > 0) {
            SpectrumChart.data.footnoteArray.forEach(footnote => {
                const description = String(footnote.Explaination || footnote.Description || '').toLowerCase();
                const number = String(footnote.Number || footnote['Footnote number'] || '').toLowerCase();
                
                // Enhanced search: remove special characters and spaces for flexible matching
                // This allows "timt" to match "T-IMT", "mobilesatellite" to match "Mobile Satellite", etc.
                const normalizedDescription = description.replace(/[-\s_\.]/g, '');
                const normalizedNumber = number.replace(/[-\s_\.]/g, '');
                const normalizedSearch = searchLower.replace(/[-\s_\.]/g, '');
                
                // Check both original and normalized versions for flexible matching
                const descriptionMatch = description.includes(searchLower) || normalizedDescription.includes(normalizedSearch);
                const numberMatch = number.includes(searchLower) || normalizedNumber.includes(normalizedSearch);
                
                if (descriptionMatch || numberMatch) {
                    matches.push({
                        ...footnote,
                        footnoteType: 'international',
                        displayNumber: footnote.Number || footnote['Footnote number'],
                        displayDescription: footnote.Explaination || footnote.Description
                    });
                }
            });
        }
    }
    
    // Search Thailand footnotes if not specifically filtering for International footnotes
    if (!footnoteType || footnoteType === 'thailand') {
        if (SpectrumChart.data.thailandFootnoteArray && SpectrumChart.data.thailandFootnoteArray.length > 0) {
            if (SpectrumChart.data.thailandFootnoteArray.length > 0) {
            }
            
            let matchCount = 0;
            
            SpectrumChart.data.thailandFootnoteArray.forEach(footnote => {
                const description = String(footnote.Explaination || footnote.Explanation || footnote.Description || '').toLowerCase();
                const number = String(footnote.Number || footnote['Footnote number'] || '').toLowerCase();
                
                // Enhanced search: remove special characters and spaces for flexible matching
                // This allows "timt" to match "T-IMT", "tdigitalradio" to match "T-Digital Radio", etc.
                const normalizedDescription = description.replace(/[-\s_\.]/g, '');
                const normalizedNumber = number.replace(/[-\s_\.]/g, '');
                const normalizedSearch = searchLower.replace(/[-\s_\.]/g, '');
                
                
                // Enhanced matching logic
                let match = false;
                let matchReason = '';
                
                if (searchLower === 't') {
                    // For single "t", only match footnotes that START with "T"
                    if (number.startsWith('t') || description.startsWith('t')) {
                        match = true;
                        matchReason = 'startsWithT';
                    }
                } else {
                    // For longer searches like "timt", use flexible matching
                    const descriptionMatch = description.includes(searchLower) || normalizedDescription.includes(normalizedSearch);
                    const numberMatch = number.includes(searchLower) || normalizedNumber.includes(normalizedSearch);
                    
                    if (descriptionMatch || numberMatch) {
                        match = true;
                        matchReason = descriptionMatch ? 'description' : 'number';
                    }
                }
                
                if (match) {
                    matchCount++;
                    const displayNumber = footnote.Number;  // Use exact column name from Excel
                    const displayDescription = footnote.Explaination;  // Use exact column name from Excel
                    
                    
                    matches.push({
                        ...footnote,
                        footnoteType: 'thailand',
                        displayNumber: displayNumber,
                        displayDescription: displayDescription
                    });
                }
            });
            
        } else {
        }
    }
    
    
    // Debug: Show first few matches
    if (matches.length > 0) {
        matches.slice(0, 5).forEach((match, index) => {
        });
    }
    
    return matches;
}

/**
 * Check if search term contains footnote number pattern
 * @param {string} searchTerm - Search query string
 * @returns {boolean} True if contains footnote pattern
 */
function containsFootnotePattern(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return false;
    // Detect footnote patterns: "5", "5.1", "5.123", etc.
    const footnotePattern = /\d+\.?\d*/;
    return footnotePattern.test(searchTerm.trim());
}

/**
 * Find matching footnotes based on search term (searches both numbers and descriptions)
 * @param {string} searchTerm - Search query string
 * @returns {Array} Array of matching footnote objects
 */
function findMatchingFootnotes(searchTerm) {
    const matches = [];
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Search International footnotes
    SpectrumChart.performance.footnoteIndexMap.forEach((detail, number) => {
        // Search in footnote number
        const numberMatch = number.toLowerCase().includes(searchLower);
        
        // Search in footnote description text
        const textMatch = detail && detail.toLowerCase().includes(searchLower);
        
        if (numberMatch || textMatch) {
            matches.push({
                number: number,
                detail: detail,
                type: 'International'
            });
        }
    });
    
    // Search Thailand footnotes
    SpectrumChart.performance.thailandFootnoteIndexMap.forEach((detail, number) => {
        // Search in footnote number
        const numberMatch = number.toLowerCase().includes(searchLower);
        
        // Search in footnote description text
        const textMatch = detail && detail.toLowerCase().includes(searchLower);
        
        if (numberMatch || textMatch) {
            matches.push({
                number: number,
                detail: detail,
                type: 'Thailand'
            });
        }
    });
    
    // Sort footnotes numerically
    return matches.sort((a, b) => {
        const numA = parseFloat(a.number);
        const numB = parseFloat(b.number);
        return numA - numB;
    });
}

/**
 * Find footnotes by text search (for any text, not just numbers)
 * @param {string} searchTerm - Search query string
 * @returns {Array} Array of matching footnote objects
 */
function findFootnotesByTextLegacy(searchTerm) {
    const matches = [];
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Skip empty searches
    if (!searchLower) return matches;
    
    // Search International footnotes by text
    SpectrumChart.performance.footnoteIndexMap.forEach((detail, number) => {
        // Only search in footnote description text for text-based searches
        if (detail && detail.toLowerCase().includes(searchLower)) {
            matches.push({
                number: number,
                detail: detail,
                type: 'International'
            });
        }
    });
    
    // Search Thailand footnotes by text
    SpectrumChart.performance.thailandFootnoteIndexMap.forEach((detail, number) => {
        // Only search in footnote description text for text-based searches
        if (detail && detail.toLowerCase().includes(searchLower)) {
            matches.push({
                number: number,
                detail: detail,
                type: 'Thailand'
            });
        }
    });
    
    // Sort footnotes numerically
    return matches.sort((a, b) => {
        const numA = parseFloat(a.number);
        const numB = parseFloat(b.number);
        return numA - numB;
    });
}

/**
 * Perform footnote search and display footnote legend
 * @param {string} searchTerm - Search query string
 */
function performFootnoteSearch(searchTerm) {
    
    // Clear current legend
    removeElementsByIds(SpectrumChart.data.serviceArray);
    
    // Find matching footnotes
    const matchingFootnotes = findMatchingFootnotes(searchTerm);
    
    // Create footnote legend list
    if (matchingFootnotes.length > 0) {
        createFootnoteLegend(matchingFootnotes);
        createFootnoteLegendHorizontal(matchingFootnotes);
    } else {
    }
}

/**
 * Perform real-time search and filtering on legend items
 * @param {string} inputValue_legend - Search query string
 * Optimized with single-pass filtering and Set operations
 */
function PerformSearch(inputValue_legend) {
    PerformanceUtils.startTimer('PerformSearch');
    
    // If search is empty, restore frequency range display and exit footnote mode
    if (!inputValue_legend || inputValue_legend.trim() === '') {
        SpectrumChart.search.footnoteMode = false;
        restoreFrequencyRangeDisplay();
        
        // Clear any search-related selections and restore normal state
        SpectrumChart.legend.selected = [];
        SpectrumChart.legend.selectedDirection = [];
        
        // Restore normal service legend display
        if (SpectrumChart.data.colorArray && SpectrumChart.data.colorArray.length > 0) {
            createServiceLegend(SpectrumChart.data.colorArray);
            createServiceLegendHorizontal(SpectrumChart.data.colorArray);
        }
        
        PerformanceUtils.endTimer('PerformSearch');
        return;
    }
    
    // Detect search language and set appropriate search mode
    const languageMode = detectSearchLanguage(inputValue_legend);
    SpectrumChart.search.languageMode = languageMode;
    
    
    // Handle language-specific search behavior
    if (languageMode === 'thai') {
        // Thai language → search International footnotes only, hide frequency range
        SpectrumChart.search.footnoteMode = true;
        hideFrequencyRangeDisplay();
        
        // Search only International footnotes for Thai text
        const internationalFootnoteMatches = findFootnotesByText(inputValue_legend, 'international');
        if (internationalFootnoteMatches.length > 0) {
            displayFootnoteOnlyResults(internationalFootnoteMatches, 'international');
        } else {
            // No matches found, show empty results
            clearAllLegends();
        }
        PerformanceUtils.endTimer('PerformSearch');
        return;
        
    } else if (languageMode === 'thailand') {
        // English starting with 't' → search Thailand footnotes only, hide frequency range
        SpectrumChart.search.footnoteMode = true;
        hideFrequencyRangeDisplay();
        
        // Search only Thailand footnotes for English 't' prefix
        
        // Special handling: if just "t", show all Thailand footnotes that start with "T"
        // If longer term like "timt", search for partial matches
        let searchTerm = inputValue_legend.toLowerCase();
        if (searchTerm === 't') {
            // Show all Thailand footnotes that start with "T"
            searchTerm = 't'; // This will match footnotes starting with T
        }
        
        const thailandFootnoteMatches = findFootnotesByText(searchTerm, 'thailand');
        if (thailandFootnoteMatches.length > 0) {
            displayFootnoteOnlyResults(thailandFootnoteMatches, 'thailand');
        } else {
            // No matches found, show empty results but also show debug info
            if (SpectrumChart.data.thailandFootnoteArray && SpectrumChart.data.thailandFootnoteArray.length > 0) {
                SpectrumChart.data.thailandFootnoteArray.forEach((footnote, index) => {
                    if (index < 5) { // Show first 5 for debugging
                    }
                });
            }
            clearAllLegends();
        }
        PerformanceUtils.endTimer('PerformSearch');
        return;
        
    } else {
        // General search mode - ensure frequency range is always visible
        restoreFrequencyRangeDisplay();
        SpectrumChart.search.footnoteMode = false;
    }
    
    // Check if searching for footnote numbers (exclusive footnote search)
    if (containsFootnotePattern(inputValue_legend)) {
        performFootnoteSearch(inputValue_legend);
        PerformanceUtils.endTimer('PerformSearch');
        return; // Skip regular service/application search
    }
    
    // Check if there are any footnote text matches for regular text searches
    const footnoteMatches = findFootnotesByTextLegacy(inputValue_legend);
    let hasFootnoteMatches = footnoteMatches.length > 0;
    
    cards = [];
    cardheight = 0;
    SpectrumChart.legend.selected = [];            //to clear before search legend
    SpectrumChart.legend.selectedDirection = [];   //to clear before search legend

    // Get the current input value
    inputValue_legend = inputValue_legend.toLowerCase();

    if (SpectrumChart.legend.toggleMode == "service") {

        // Filter services based on the filtered start/stop frequency
        var filtered_service_from_data = getUniqueValuesOfAttributebyAttribute(SpectrumChart.data.jsonArrayFiltered,"EngService");

        // Optimized filtering using single pass
        var filtered_legend = [];
        var unselected_legend = [];
        
        // Single loop instead of multiple filter operations
        for (let i = 0; i < filtered_service_from_data.length; i++) {
            const service = filtered_service_from_data[i];
            if (service.toLowerCase().includes(inputValue_legend)) {
                filtered_legend.push(service);
            } else {
                unselected_legend.push(service);
            }
        }
        
        SpectrumChart.data.serviceArrayFiltered = filtered_legend;

        var selected_data = FilterDataByAttribute(SpectrumChart.data.jsonArrayFiltered, "EngService", filtered_legend)
        var unselected_data = FilterDataByAttribute(SpectrumChart.data.jsonArrayFiltered, "EngService", unselected_legend)

        // Optimized color array filtering using lookup
        SpectrumChart.data.colorArrayFiltered = [];
        const filteredSet = new Set(filtered_legend);
        for (let i = 0; i < SpectrumChart.data.colorArray.length; i++) {
            if (filteredSet.has(SpectrumChart.data.colorArray[i].Service)) {
                SpectrumChart.data.colorArrayFiltered.push(SpectrumChart.data.colorArray[i]);
            }
        }
        
        if(selected_data.length != 0){
            toggleClasses(selected_data, "highlight");
            toggleClasses(unselected_data, "faddd");
            }
        
        else{
            toggleClasses(selected_data, "box");
            }

        removeElementsByIds(SpectrumChart.data.serviceArray);
        createServiceLegend(SpectrumChart.data.colorArrayFiltered);
        createServiceLegendHorizontal(SpectrumChart.data.colorArrayFiltered);
        
        // Add footnote results if any text matches found
        if (hasFootnoteMatches) {
            // Append footnote legend to existing service legend
            const currentLegend = DOMCache.get('Legend').innerHTML;
            DOMCache.get('Legend').innerHTML = currentLegend + createFootnoteLegendHTML(footnoteMatches);
            
            // For horizontal legend, append to existing content  
            const currentHorLegend = document.querySelector('#Legend-horizontal');
            if (currentHorLegend) {
                currentHorLegend.innerHTML += createFootnoteLegendHorizontalHTML(footnoteMatches);
            }
        }
    }
    
    else {      //ToggleLegend == "application"


        // Filter applications based on the filtered start/stop frequency
        var filtered_application_from_data = getUniqueValuesOfAttributebyAttribute(SpectrumChart.data.jsonArrayFiltered,"Application");


        // Filter items based on the input
        var filtered_legend2 = filtered_application_from_data.filter(item => item.toLowerCase().includes(inputValue_legend));
        SpectrumChart.data.applicationArrayFiltered = filtered_legend2;

        const unselected_legend2 = filtered_application_from_data.filter(value => !filtered_legend2.includes(value));
        const filtered_color2 = SpectrumChart.data.colorArrayApplication.filter(word => filtered_legend2.includes(word.Application));

        var selected_data2 = FilterDataByAttribute(SpectrumChart.data.jsonArrayFiltered, "Application", filtered_legend2)
        var unselected_data2 = FilterDataByAttribute(SpectrumChart.data.jsonArrayFiltered, "Application", unselected_legend2)

        if(selected_data2.length != 0){
            toggleClasses(selected_data2, "highlight");
            toggleClasses(unselected_data2, "faddd");
            }
        
        else{
            toggleClasses(selected_data2, "box");
            }
        // console.log(filtered_color2);
        SpectrumChart.data.colorArrayApplicationFiltered = filtered_color2;
        removeElementsByIds(SpectrumChart.data.applicationArray);
        createApplicationLegend(filtered_color2);
        
        // Add footnote results if any text matches found (application mode)
        if (hasFootnoteMatches) {
            // Append footnote legend to existing application legend
            const currentLegend = DOMCache.get('Legend').innerHTML;
            DOMCache.get('Legend').innerHTML = currentLegend + createFootnoteLegendHTML(footnoteMatches);
        }
        
    }
    
    PerformanceUtils.endTimer('PerformSearch');
    SpectrumChart.performance.filterCount++;
}


function removeElementsByIds(idsToRemove) {
    
    idsToRemove.forEach(function(id) {
      var elementToRemove = document.getElementById(id);
      if (elementToRemove) {
        elementToRemove.parentNode.removeChild(elementToRemove);
      }
    });
}


function toggleClasses(data, addnewclass) {
    // Optimized DOM operations with batching
    const fragment = document.createDocumentFragment();
    const elementsToUpdate = [];
    
    // Extract IDs in single pass and cache DOM elements
    for(var i=0; i<data.length; i++) {
        const element = DOMCache.get(data[i].id);
        if (element) {
            elementsToUpdate.push(element);
        }
    }
    
    // Batch DOM updates to minimize reflows
    const startTime = performance.now();
    elementsToUpdate.forEach(function(element) {
        // More efficient class management
        element.className = addnewclass;
    });
    
}

function toggleClassesbyID(id, addnewclass) {
    // console.log("id in Function toggleClassesbyID: " + id)
    // Loop through each element ID
    id.forEach(function(id) {
        // Get the element by ID
        var element = document.getElementById(id);

        // Toggle between currentClass and newClass
            element.classList.remove(element.classList);
            element.classList.add(addnewclass);
    }
    );

}




function FilterDataByAttribute(data_array, attribute, attribute_array) {
    var temp = [];
    var result = [];
    for(var i=0; i<attribute_array.length; i++){
        temp = data_array.filter(item => item[attribute] === attribute_array[i]);
        for(var j=0; j<temp.length; j++) {
            result.push(temp[j]);
        }
    }
    return result;
}




//------------------------------------------- functions for user filtering -------------------------------------------

/**
 * Filter frequency data based on user-specified start and stop frequencies
 * Supports multiple units (Hz, kHz, MHz, GHz) with automatic conversion
 * Rebuilds performance caches after filtering for optimal rendering
 */
function filterFrequency() {
    cards = [];
    cardheight = 0;
    SpectrumChart.legend.selected = [];            //to clear before search legend
    SpectrumChart.legend.selectedDirection = [];   //to clear before search legend
    SpectrumChart.legend.selectedTemp = [];

    var inputValue_StartFrequency = DOMCache.get('inputBox_StartFrequency').value;
    var inputValue_StopFrequency = DOMCache.get('inputBox_StopFrequency').value;

    var section = DOMCache.get("output");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });

    var unit_dropdown = DOMCache.get("unit_dropdown");
    var selected_unit = unit_dropdown.value;

    //normalize start frequency unit
    if (inputValue_StartFrequency != "") {
        if (selected_unit == "MHz") {
            // do nothing, because jsonDataArray is normalized to MHz already.
            var input_frequency = inputValue_StartFrequency;
        }
        else if (selected_unit == "GHz") {
            var input_frequency = inputValue_StartFrequency * 1000;
        }
        else if (selected_unit == "kHz") {
            var input_frequency = inputValue_StartFrequency / 1000;
        }
        else if (selected_unit == "Hz") {
            var input_frequency = inputValue_StartFrequency / 1000000;
        }
        else {
            console.log("selected frequency unit is error!");
        }
    }
    else {
        var input_frequency = 0;
    }
    var start_frequency = input_frequency;
    var result = SpectrumChart.data.jsonArray.filter(word => (word.Start_Frequency >= input_frequency) || ((word.Start_Frequency < input_frequency) && (word.Stop_Frequency > input_frequency)));

    
    //normalize start frequency unit
    if (inputValue_StopFrequency != "") {
        if (selected_unit == "MHz") {
            // do nothing, because jsonDataArray is normalized to MHz already.
            var input_frequency = inputValue_StopFrequency;
        }
        else if (selected_unit == "GHz") {
            var input_frequency = inputValue_StopFrequency * 1000;
        }
        else if (selected_unit == "kHz") {
            var input_frequency = inputValue_StopFrequency / 1000;
        }
        else if (selected_unit == "Hz") {
            var input_frequency = inputValue_StopFrequency / 1000000;
        }
        else {
            console.log("selected frequency unit is error!");
        }
    }
    else {
        var input_frequency = SpectrumChart.data.jsonArray[SpectrumChart.data.jsonArray.length-1].Stop_Frequency;
    }
    var stop_frequency = input_frequency;

    // to break program if stop < start freq
    if (start_frequency > stop_frequency) {
        //...
    }
    
    result = result.filter(word => word.Start_Frequency < input_frequency);

    SpectrumChart.data.jsonArrayFiltered = result;
    // console.log(jsonDataArray_filtered);

    removeElementsByIds(output_elementIds);

    // Check if filtered result has data before processing
    if (result && result.length > 0) {
        assignStackID2(SpectrumChart.data.jsonArrayFiltered); // done
        insertGap2(SpectrumChart.data.jsonArrayFiltered); //done
        sortStackMembers2(SpectrumChart.data.jsonArrayFiltered);
        assignRowID2(SpectrumChart.data.jsonArrayFiltered);
        assignGapFrequencyLabel2(SpectrumChart.data.jsonArrayFiltered);
        
        // Rebuild performance optimizations for filtered data
        PerformanceUtils.buildLookupMaps(SpectrumChart.data.jsonArrayFiltered);
        PerformanceUtils.cacheFrequencyRanges(SpectrumChart.data.jsonArrayFiltered);
        
        plot(SpectrumChart.data.jsonArrayFiltered);
        filteredLegend();
    } else {
        // Handle empty results - clear display
        // Clear any existing display
        const outputSection = DOMCache.get('output');
        if (outputSection) {
            outputSection.innerHTML = '';
        }
        // Clear legends
        clearAllLegends();
    }
}


function assignStackID2(data) {

    if (!data || data.length === 0) {
        return;
    }

    //sort order by start frequency
    var sorted_data = data.sort(function(a, b) {
        return a.Start_Frequency - b.Start_Frequency;
    });

    var stack_id = 0;
    var last_max_stopfreq = sorted_data[0].Stop_Frequency ;
    sorted_data[0].stack_id = stack_id;

    for (var i = 1 ; i < sorted_data.length ; i++){

        // if current block is within previous block, assign the same stack_id
        if (sorted_data[i].Start_Frequency >= last_max_stopfreq){
            stack_id = stack_id + 1;
            sorted_data[i].stack_id = stack_id ;
        }
        else  //(sorted_data[i].Start_Frequency > sorted_data[i-1].Stop_Frequency){     // if current block is not within previous block, assign new stack_id (+1)
        {    
            sorted_data[i].stack_id = stack_id ;
        }

        // to record max stop frequency to keep prior overlap block
        if (sorted_data[i].Stop_Frequency > last_max_stopfreq) { 
            last_max_stopfreq = sorted_data[i].Stop_Frequency;
        }
        
        sorted_data[i].i = i;
        sorted_data[i].last_max_stopfreq = last_max_stopfreq;
    }
    SpectrumChart.data.jsonArrayFiltered = sorted_data;

    // console.log("End assignStackID2------------");
}


function insertGap2(data) {
    if (!data || data.length === 0) return;
    var last_stackid = data[data.length-1].stack_id
    // displayOutput(data);
    var gap_position = [];
    for(var i=0; i<last_stackid; i++){
        var current_stack_member = getStackMembers(data,i);
        var next_stack_member = getStackMembers(data,i+1);
        let min_start_freq = Math.min(...next_stack_member.map(item => item.Start_Frequency));
        let max_stop_freq = Math.max(...current_stack_member.map(item => item.Stop_Frequency));
        var current = i;
        var next = i+1;
        bandwidth = min_start_freq - max_stop_freq;
        if(bandwidth > 0 ){
            data.push({ stack_id:null, Start_Frequency: max_stop_freq, Stop_Frequency: min_start_freq, Bandwidth: bandwidth, EngService : "gap"});
        }
    } 
        assignStackID2(data);
}


function assignRowID2(data) {
    if (!data || data.length === 0) return;
    var number_of_stacks = data[data.length-1].stack_id;
    var row_id = 0;
    var length_accum = 0;   // to find index of data array for each stack

    var assigned_stack_count = 0;
    
    // let min_bandwidth = Math.min(...data.map(item => item.Bandwidth));
    // var scale_factor = 10/min_bandwidth;
    // var accum_px = 0;

    for (var i=0; i<=number_of_stacks; i++)
    {
        var number_of_stack_member = countStackMembers(data,i);
        var stack_member = getStackMembers(data,i);
        let min_start_freq = Math.min(...stack_member.map(item => item.Start_Frequency));
        let max_stop_freq = Math.max(...stack_member.map(item => item.Stop_Frequency));
        let stack_width = max_stop_freq - min_start_freq;

        const row_family = data.filter(word => word.row_id == row_id);  
        let min_start_freq_of_row_family = Math.min(...row_family.map(item => item.Start_Frequency));
        if (min_start_freq_of_row_family==0) {
            min_start_freq_of_row_family = 0.03;
        }

        ////////////////////////////////////////////////////////////////////////////////////
        // criteria for new row
        if ( max_stop_freq > min_start_freq_of_row_family*10 ) {
            row_id += 1;
        }

        if (SpectrumChart.data.jsonArrayFiltered.length == SpectrumChart.data.jsonArray.length) {
            // if ( max_stop_freq > min_start_freq_of_row_family*10 ) {
            //     row_id += 1;
            // }
        }
        else {
            if ( assigned_stack_count > 30 ) {
                row_id += 1;
                assigned_stack_count = 0;
            }
        }
        
        ////////////////////////////////////////////////////////////////////////////////////


        for (var j=0; j<number_of_stack_member; j++){
            data[length_accum+j].row_id = row_id;       //assign row_id in data array
        }
        length_accum += number_of_stack_member;

        assigned_stack_count += 1;
    }

    SpectrumChart.data.jsonArrayFiltered = data;

    if (SpectrumChart.data.jsonArrayFiltered.length != SpectrumChart.data.jsonArray.length) {
        assignRowID3(SpectrumChart.data.jsonArrayFiltered)
    }
}

function assignRowID3(data) {
    if (!data || data.length === 0) return;
    var row_num = SpectrumChart.data.jsonArrayFiltered[SpectrumChart.data.jsonArrayFiltered.length-1].row_id + 1
    var number_of_stacks = data[data.length-1].stack_id + 1;
    var stack_per_row = Math.ceil(number_of_stacks/row_num);
    var row_id = 0;
    var assigned_stack_count = 0;
    var length_accum = 0;   // to find index of data array for each stack

    for (var i=0; i<=number_of_stacks; i++)
    {
        
        if ( assigned_stack_count > stack_per_row ) {    //stack_per_row
            row_id += 1;
            assigned_stack_count = 0;
        }

        var number_of_stack_member = countStackMembers(data,i);
        for (var j=0; j<number_of_stack_member; j++){
            data[length_accum+j].row_id = row_id;       //assign row_id in data array
        }
        length_accum += number_of_stack_member;

        assigned_stack_count += 1;
    }
    if (data && data.length > 0 && data[data.length-1].EngService == "Not Allocation") {
        data[data.length-1].row_id = data[data.length-1].row_id + 1;
    }

    SpectrumChart.data.jsonArrayFiltered = data;
}


function assignUniqueID2(data){  
    for(var i=0; i<data.length; i++){
        data[i].id = i;
    }

    SpectrumChart.data.jsonArrayFiltered = data;
}


function sortStackMembers2(data) {
    // console.log("sortStackMembers2");
    //sort order by Bandwidth in every stack
    var result = [];
    if (!data || data.length === 0) return result;
    for(var i=0; i<=data[data.length-1].stack_id; i++){  // loop by the number of stacks e.g. 6 rounds for 6 stacks
        var family = getStackMembers(data, i);
        var sorted_family = family.sort(function(a, b) {
            return a.Bandwidth - b.Bandwidth;
        });
        for (var j=0; j< sorted_family.length; j++){
            result.push(sorted_family[j]);
        }   
    }

    SpectrumChart.data.jsonArrayFiltered = result;
    // console.log("End sortStackMembers2------------");
}


function assignGapFrequencyLabel2(data) {
    SpectrumChart.data.frequencyLabelArray = [];
    if (!data || data.length === 0) return;
    for (var i=0; i<=data[data.length-1].row_id; i++) 
    {
        const row_family = data.filter(word => word.row_id == i);
        var Frequency_array = [];

        for (var j=0; j<row_family.length; j++)
        {  
            if (row_family[j].EngService != "gap")
            {
                Frequency_array.push(row_family[j].Start_Frequency);
                Frequency_array.push(row_family[j].Stop_Frequency);
            }
            else{

                if (j != 0)
                {
                    Frequency_array.push(row_family[j].Start_Frequency);
                    Frequency_array.push(row_family[j].Stop_Frequency);
                }
            }
        } // end of for

        var sorted_family = Frequency_array.sort((a, b) => a - b);  // Sort frequencies
        var uniqueArray = [...new Set(sorted_family)];              // Remove duplicates using the Set object
        
        SpectrumChart.data.frequencyLabelArray.push(uniqueArray);
    }
}


function filteredLegend(){
   
    var filtered_services = getUniqueValuesOfAttributebyAttribute(SpectrumChart.data.jsonArrayFiltered,"EngService");

    const filtered_color = SpectrumChart.data.colorArray.filter(word => filtered_services.includes(word.Service));
    removeElementsByIds(SpectrumChart.data.serviceArray);
    createServiceLegend(filtered_color);
    createServiceLegendHorizontal(filtered_color);
    
    SpectrumChart.data.colorArrayFiltered = filtered_color;
    SpectrumChart.data.serviceArrayFiltered = [];
    for (var i=0; i<SpectrumChart.data.colorArrayFiltered.length; i++ ){
        SpectrumChart.data.serviceArrayFiltered[i] = SpectrumChart.data.colorArrayFiltered[i].Service;
    }
    // console.log(ServiceArray_filtered);
}





//---------------------------------------------------------- small functions ----------------------------------------------------------------

function countStackMembers(data,p) {
    const result = data.filter(word => word.stack_id == p).length;  
    return result;
}


function getStackMembers(data,p) {
    const family = data.filter(word => word.stack_id == p);  
    return family;
}


function logContainerWidth() {
    const container = DOMCache.get('section_chart');
    SpectrumChart.dimensions.containerWidth = container.clientWidth;
    SpectrumChart.dimensions.containerWidth = Math.round(SpectrumChart.dimensions.containerWidth / 10) * 10;
}


function logContainerHeight() {
    const container = DOMCache.get('Main');
    SpectrumChart.dimensions.containerHeight = container.clientHeight;
    return SpectrumChart.dimensions.containerHeight;
}


// Function to log the screen width
function logScreenWidth() {
    SpectrumChart.dimensions.screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
}


// Function to log the screen height
function logScreenHeight() {
    SpectrumChart.dimensions.screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
}


// Function to get unique values based on an attribute
function getUniqueValuesOfAttributebyAttribute(arr, attribute) {
    var uniqueValues = [];
    var seenValues = {};

    for (var i = 0; i < arr.length; i++) {
        var value = arr[i][attribute];

        if (!seenValues[value]) {
            uniqueValues.push(value);
            seenValues[value] = true;
        }
    }
    return uniqueValues;
}


// Function to get unique values based on 2 attributes
function getUniqueCombinations(arr, attr1, attr2) {
    var uniqueCombinations = [];
    var seenCombinations = {};

    for (var i = 0; i < arr.length; i++) {
        var combination = arr[i][attr1] + '|' + arr[i][attr2];

        if (!seenCombinations[combination]) {
            uniqueCombinations.push({ [attr1]: arr[i][attr1], [attr2]: arr[i][attr2] });
            seenCombinations[combination] = true;
        }
    }
    return uniqueCombinations;
}


function getColor(data,j){
    var EngService = data[j].EngService;
    const found = SpectrumChart.data.colorArray.findIndex(word=> word.Service == EngService)
    
    var result;
    if(found == -1){ // -1 is not matched
        result = 0;
    }
    else {
        result = SpectrumChart.data.colorArray[found].Color;
    }
    return result;
}


function getcolorarray(color_id){
    var filteredcolor = colorArray.filter(word => word.EngService == color_id);
    return filteredcolor ;
}



/**
 * Handle menu selection between different chart types
 * @param {HTMLElement} menu - The selected menu element
 * Switches between National Frequency Allocation and Unlicensed Frequency tables
 */
function selectMenu(menu) {
    const menus = document.querySelectorAll('.menu-item');

    menus.forEach((m) => {
    m.classList.remove('selected');
    });

    menu.classList.add('selected');

    // Get the id of the selected menu
    SpectrumChart.config.selectedMenu = menu.id;
    
    if (SpectrumChart.config.selectedMenu == "nfat") {
        SpectrumChart.sheets.index0 = 0;
        SpectrumChart.sheets.index1 = 1;
        SpectrumChart.sheets.index2 = 2;
    }
    else if (SpectrumChart.config.selectedMenu == "unlicensed") {
        SpectrumChart.sheets.index0 = 3;
        SpectrumChart.sheets.index1 = 4;
        // SpectrumChart.sheets.index2 = 2;
    }
    else
    {
    }


    

    var section = document.getElementById("Legend");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });
    removeElementsByIds(output_elementIds);
    var section = document.getElementById("output");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });
    removeElementsByIds(output_elementIds);

    


    executeSequentially();
  }



  function rgbToHex(rgb) {
    // Split the RGB string to get the individual values
    const values = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    
    // Convert the RGB values to hexadecimal
    const hex = '#' + 
        ('0' + parseInt(values[1], 10).toString(16)).slice(-2) +
        ('0' + parseInt(values[2], 10).toString(16)).slice(-2) +
        ('0' + parseInt(values[3], 10).toString(16)).slice(-2);
    
    return hex.toUpperCase(); // Convert to uppercase for consistency
}

// -----------------------------Horizontal legend----------------------------------------------------------

    document.addEventListener("DOMContentLoaded", function () {
        let toggleSwitch = document.getElementById('toggleSwitch');
        if (toggleSwitch) {
            toggleSwitch.addEventListener('change', function() {
                let statusText = document.getElementById('ver-hor-text');
                let verticalLegend = document.getElementById('Legend');
                let horizontalLegendRow = document.getElementById('horizontal-legend-row');
                
                if (this.checked) { 
                    // Switch to horizontal legend
                    SpectrumChart.config.hide = 0;
                    statusText.textContent = "Horizontal legend";
                    
                    // Hide vertical legend and show horizontal legend row
                    if (verticalLegend) {
                        verticalLegend.style.display = 'none';
                    }
                    if (horizontalLegendRow) {
                        horizontalLegendRow.style.display = 'block';
                    }
                    
                    filterFrequency()
                } else {
                    // Switch to vertical legend
                    SpectrumChart.config.hide = 1;
                    statusText.textContent = "Vertical legend";
                    
                    // Show vertical legend and hide horizontal legend row
                    if (verticalLegend) {
                        verticalLegend.style.display = 'block';
                    }
                    if (horizontalLegendRow) {
                        horizontalLegendRow.style.display = 'none';
                    }
                    
                    filterFrequency()
                }
            });
        }
        
        // Initialize legend display state based on default configuration
        function initializeLegendDisplay() {
            let verticalLegend = document.getElementById('Legend');
            let horizontalLegendRow = document.getElementById('horizontal-legend-row');
            let statusText = document.getElementById('ver-hor-text');
            let toggleSwitch = document.getElementById('toggleSwitch');
            
            if (SpectrumChart.config.hide === 1) {
                // Default: Vertical legend
                if (verticalLegend) verticalLegend.style.display = 'block';
                if (horizontalLegendRow) horizontalLegendRow.style.display = 'none';
                if (statusText) statusText.textContent = "Vertical legend";
                if (toggleSwitch) toggleSwitch.checked = false;
            } else {
                // Horizontal legend
                if (verticalLegend) verticalLegend.style.display = 'none';
                if (horizontalLegendRow) horizontalLegendRow.style.display = 'block';
                if (statusText) statusText.textContent = "Horizontal legend";
                if (toggleSwitch) toggleSwitch.checked = true;
            }
        }
        
        // Initialize display state after DOM is loaded
        setTimeout(initializeLegendDisplay, 100);
    });



// -----------------------------Create card----------------------------------------------------------

let activeCards = new Map();  
let activeFootnoteCards = new Map(); // Map to track footnote cards
let cardParentChildMap = new Map();  // Map to track parent-child relationships
const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let highestZIndex = 1;

        function setCanvasSize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        document.body.addEventListener('click', (e) => {
            const span = e.target.closest('.box'); // Ensure click is on a span
            if (span && !activeCards.has(span)) {
                createCard(e, span);
            }
        });
        
        function createCard(e, span) {
            // console.log("Card created for:", span.innerText);
            const card = document.createElement('div');
            card.className = 'custom-card card';
                
            // Set initial position accounting for any scroll
            const initialX = e.pageX-150;  // Use pageX instead of clientX
            const initialY = e.pageY-100;  // Use pageY instead of clientY

            card.style.position = 'absolute'; // Make sure position is absolute
            card.style.left = `${initialX}px`;
            card.style.top = `${initialY}px`;

            // Get the span ID to find the original data
            const spanId = span.id;
            const originalData = SpectrumChart.data.jsonArray.find(item => item.id == spanId);
            
            var decodedDetail;
            var cardHeader;
            // Use the same method as normal display - always use span.dataset values
            var cardHeader = span.dataset.content.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            var decodedDetail = span.dataset.detail.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            
            card.innerHTML = `
                <div class="card-header">
                    <span>${cardHeader}</span>
                    <div class="close-btn">×</div>
                </div>
                <div class="card-body">${decodedDetail}</div>
            `;

            const closeBtn = card.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                // Close all footnote cards that belong to this main card
                const footnoteCardsToRemove = [];
                cardParentChildMap.forEach((parentCard, footnoteCard) => {
                    if (parentCard === card) {
                        footnoteCard.remove();
                        footnoteCardsToRemove.push(footnoteCard);
                    }
                });
                
                // Clean up footnote card tracking
                footnoteCardsToRemove.forEach(footnoteCard => {
                    cardParentChildMap.delete(footnoteCard);
                    // Find and remove from activeFootnoteCards
                    for (let [footnoteNumber, fCard] of activeFootnoteCards.entries()) {
                        if (fCard === footnoteCard) {
                            activeFootnoteCards.delete(footnoteNumber);
                            break;
                        }
                    }
                });
                
                card.remove();
                activeCards.delete(span);
                drawConnections();
            });

            const header = card.querySelector('.card-header');
            let isDragging = false;
            let currentX;
            let currentY;
            let initialMouseX;
            let initialMouseY;

            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                offset = [card.offsetLeft - e.clientX, card.offsetTop - e.clientY];
                bringToFront(card);
            });
            const handleMouseMove = (e) => {
                if (isDragging) {
                    // Calculate the distance moved from the initial position
                    const dx = e.clientX - initialMouseX;
                    const dy = e.clientY - initialMouseY;
                    
                    // Update position based on the initial card position plus the movement
                    card.style.left = `${currentX + dx}px`;
                    card.style.top = `${currentY + dy}px`;
                    drawConnections();
                }
            };
        
            const handleMouseUp = () => {
                isDragging = false;
            };
        
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    card.style.left = `${e.clientX + offset[0]}px`;
                    card.style.top = `${e.clientY + offset[1]}px`;
                    drawConnections();
                }
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });

            activeCards.set(span, card);
            document.getElementById('cards-container').appendChild(card);
            bringToFront(card);
            drawConnections();
        }

        function bringToFront(card) {
            highestZIndex++;
            card.style.zIndex = highestZIndex;
            drawConnections();
        }

        // Add event listener for footnote clicks
        document.body.addEventListener('click', (e) => {
            const footnoteLink = e.target.closest('.footnote-link');
            if (footnoteLink) {
                e.stopPropagation(); // Prevent triggering other click events
                const footnoteNumber = footnoteLink.dataset.footnote;
                const parentCard = footnoteLink.closest('.custom-card');
                if (parentCard && !activeFootnoteCards.has(footnoteNumber)) {
                    createFootnoteCard(e, footnoteNumber, parentCard);
                }
            }
        });

        // Add event listener for Thailand footnote clicks
        document.body.addEventListener('click', (e) => {
            const thailandFootnoteLink = e.target.closest('.thailand-footnote-link');
            if (thailandFootnoteLink) {
                e.stopPropagation(); // Prevent triggering other click events
                const footnoteNumber = thailandFootnoteLink.dataset.thailandFootnote;
                const parentCard = thailandFootnoteLink.closest('.custom-card');
                if (parentCard && !activeFootnoteCards.has('thailand-' + footnoteNumber)) {
                    createThailandFootnoteCard(e, footnoteNumber, parentCard);
                }
            }
        });

        function createFootnoteCard(e, footnoteNumber, parentCard) {
            const footnoteDetail = PerformanceUtils.getFootnoteDetail(footnoteNumber);
            
            const footnoteCard = document.createElement('div');
            footnoteCard.className = 'custom-card footnote-card';
            
            // Position footnote card relative to parent card
            const parentRect = parentCard.getBoundingClientRect();
            const initialX = parentRect.right + 20; // 20px to the right of parent card
            const initialY = parentRect.top;
            
            footnoteCard.style.position = 'absolute';
            footnoteCard.style.left = `${initialX}px`;
            footnoteCard.style.top = `${initialY}px`;
            footnoteCard.style.borderLeft = '3px solid #007bff';
            footnoteCard.style.backgroundColor = '#f8f9fa';
            
            footnoteCard.innerHTML = `
                <div class="card-header" style="background-color: #e3f2fd; font-weight: bold;">
                    <span>Footnote ${footnoteNumber}</span>
                    <div class="close-btn">×</div>
                </div>
                <div class="card-body">${footnoteDetail}</div>
            `;
            
            const closeBtn = footnoteCard.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                footnoteCard.remove();
                activeFootnoteCards.delete(footnoteNumber);
                cardParentChildMap.delete(footnoteCard);
                drawConnections();
            });
            
            // Make footnote card draggable
            const header = footnoteCard.querySelector('.card-header');
            let isDragging = false;
            let offset = [0, 0];
            
            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                offset = [footnoteCard.offsetLeft - e.clientX, footnoteCard.offsetTop - e.clientY];
                bringToFront(footnoteCard);
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    footnoteCard.style.left = `${e.clientX + offset[0]}px`;
                    footnoteCard.style.top = `${e.clientY + offset[1]}px`;
                    drawConnections();
                }
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            // Track relationships
            activeFootnoteCards.set(footnoteNumber, footnoteCard);
            cardParentChildMap.set(footnoteCard, parentCard);
            
            document.getElementById('cards-container').appendChild(footnoteCard);
            bringToFront(footnoteCard);
            drawConnections();
        }

        function createThailandFootnoteCard(e, footnoteNumber, parentCard) {
            const footnoteDetail = PerformanceUtils.getThailandFootnoteDetail(footnoteNumber);
            
            const footnoteCard = document.createElement('div');
            footnoteCard.className = 'custom-card thailand-footnote-card';
            
            // Position footnote card relative to parent card (slightly offset from international footnotes)
            const parentRect = parentCard.getBoundingClientRect();
            const initialX = parentRect.right + 20; // 20px to the right of parent card
            const initialY = parentRect.top + 50; // 50px lower than international footnotes
            
            footnoteCard.style.position = 'absolute';
            footnoteCard.style.left = `${initialX}px`;
            footnoteCard.style.top = `${initialY}px`;
            footnoteCard.style.borderLeft = '3px solid #28a745';
            footnoteCard.style.backgroundColor = '#f8ffe8';
            
            footnoteCard.innerHTML = `
                <div class="card-header" style="background-color: #d4edda; font-weight: bold; color: #155724;">
                    <span>${footnoteNumber}</span>
                    <div class="close-btn">×</div>
                </div>
                <div class="card-body">${footnoteDetail}</div>
            `;
            
            const closeBtn = footnoteCard.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                footnoteCard.remove();
                activeFootnoteCards.delete('thailand-' + footnoteNumber);
                cardParentChildMap.delete(footnoteCard);
                drawConnections();
            });
            
            // Make Thailand footnote card draggable
            const header = footnoteCard.querySelector('.card-header');
            let isDragging = false;
            let offset = [0, 0];
            
            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                offset = [footnoteCard.offsetLeft - e.clientX, footnoteCard.offsetTop - e.clientY];
                bringToFront(footnoteCard);
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    footnoteCard.style.left = `${e.clientX + offset[0]}px`;
                    footnoteCard.style.top = `${e.clientY + offset[1]}px`;
                    drawConnections();
                }
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            // Track relationships (use 'thailand-' prefix to distinguish)
            activeFootnoteCards.set('thailand-' + footnoteNumber, footnoteCard);
            cardParentChildMap.set(footnoteCard, parentCard);
            
            document.getElementById('cards-container').appendChild(footnoteCard);
            bringToFront(footnoteCard);
            drawConnections();
        }

        function drawConnections() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        
            // Draw primary connections (frequency rectangle → main card)
            activeCards.forEach((card, span) => {
                const spanRect = span.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
        
                // Get canvas position relative to the document
                const canvasRect = canvas.getBoundingClientRect();
                
                // Adjust positions by subtracting canvas offset
                const spanX = spanRect.left + spanRect.width / 2 - canvasRect.left;
                const spanY = spanRect.top + spanRect.height / 2 - canvasRect.top;
                const cardX = cardRect.left + cardRect.width / 2 - canvasRect.left;
                const cardY = cardRect.top - canvasRect.top;
        
                // Primary thread style
                ctx.beginPath();
                ctx.moveTo(spanX, spanY);
                ctx.lineTo(cardX, cardY);
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            // Draw secondary connections (main card → footnote card)
            activeFootnoteCards.forEach((footnoteCard, footnoteNumber) => {
                const parentCard = cardParentChildMap.get(footnoteCard);
                if (parentCard) {
                    const parentRect = parentCard.getBoundingClientRect();
                    const footnoteRect = footnoteCard.getBoundingClientRect();
                    
                    // Get canvas position relative to the document
                    const canvasRect = canvas.getBoundingClientRect();
                    
                    // Adjust positions by subtracting canvas offset
                    const parentX = parentRect.right - canvasRect.left;
                    const parentY = parentRect.top + parentRect.height / 2 - canvasRect.top;
                    const footnoteX = footnoteRect.left - canvasRect.left;
                    const footnoteY = footnoteRect.top + footnoteRect.height / 2 - canvasRect.top;
                    
                    // Secondary thread style (same as main card threads)
                    ctx.beginPath();
                    ctx.moveTo(parentX, parentY);
                    ctx.lineTo(footnoteX, footnoteY);
                    ctx.strokeStyle = '#666';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
        }
        
    

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close all footnote cards first
                activeFootnoteCards.forEach(card => card.remove());
                activeFootnoteCards.clear();
                
                // Close all main cards
                activeCards.forEach(card => card.remove());
                activeCards.clear();
                
                // Close all center footnote cards
                const centerFootnoteCards = document.querySelectorAll('.center-footnote-card');
                centerFootnoteCards.forEach(card => card.remove());
                
                // Clear parent-child relationships
                cardParentChildMap.clear();
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });