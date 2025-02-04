// Declare Global variables
var SelectedMenu = "nfat";
var height_factor = 0.07;        // set factor to X % of screen height   / the bigger number, the taller blocks
var height_newline_factor = 10;  // the bigger number, the smaller newline
var label_font_size = 10; // in pixel unit / default is 12
var hide = 1;

var screenWidth = 0;
var screenHeight = 0;
var containerWidth = 0;
var containerHeight = 0;

var jsonDataArray = [];
var colorArray = [];
var colorArray_filtered = [];
var colorArray_application = [];
var colorArray_application_filtered = [];
var ServiceArray = [];
var ApplicationArray = [];
var ApplicationArray_filtered = [];
var ServiceArray_filtered = [];
var frequencyLabelArray = [];
var jsonDataArray_filtered = [];

var SelectedLegend = [];
var SelectedLegend_tmp = [];
var SelectedLegendDirection = [];
var unselected_legend = [];

var inputValue_legend = "";
var selected_data_id_box = [];      //global
var unselected_data_id_box = [];    //global
var ToggleLegend = "service";

var sheet_index0 = 0;
var sheet_index1 = 1;
var sheet_index2 = 2;

// Call the function on page load
logScreenWidth();
logScreenHeight();
logContainerWidth();
logContainerHeight();

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


// Execute the functions sequentially
async function executeSequentially() {
    // document.addEventListener('DOMContentLoaded', function () {
    //     // Automatically load the Excel file when the page loads    
    // });
    
    await ExceltoJson(); // Wait for asyncFunction1 to complete
}


async function ExceltoJson() {
    // console.log("ExceltoJson");
    // Specify the path to your Excel file
    var excelFilePath = 'datasource.xlsx';

    // Use XMLHttpRequest to read the Excel file
    var xhr = new XMLHttpRequest();
    xhr.open('GET', excelFilePath, true);
    xhr.responseType = 'arraybuffer';


    jsonDataArray = [];
    colorArray = [];
    colorArray_filtered = [];
    colorArray_application = [];
    colorArray_application_filtered = [];
    ServiceArray = [];
    ApplicationArray = [];
    ApplicationArray_filtered = [];
    ServiceArray_filtered = [];
    frequencyLabelArray = [];
    jsonDataArray_filtered = [];


    xhr.onload = function () {
        if (xhr.status === 200) {
            var data = new Uint8Array(xhr.response);
            var workbook = XLSX.read(data, { type: 'array' });

            // Convert Sheet1 to JSON and store in the array
            var sheet1_name_list = workbook.SheetNames[sheet_index0];
            var sheet1 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet1_name_list]);

            // Convert Sheet2 to JSON and store in the array
            var sheet2_name_list = workbook.SheetNames[sheet_index1];
            var sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet2_name_list]);

            // Convert Sheet3 to JSON and store in the array
            var sheet3_name_list = workbook.SheetNames[sheet_index2];
            var sheet3 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet3_name_list]);


            // Store the JSON data in the array
            colorArray = sheet2;
            colorArray_filtered = colorArray;
            colorArray_application = sheet3;
            colorArray_application_filtered = colorArray_application;
            // console.log("ApplicationArray "+ApplicationArray);
            for(var i=0; i<sheet1.length; i++){
                jsonDataArray[i] = sheet1[i];
                if (jsonDataArray[i].Application == undefined)  { jsonDataArray[i].Application = "x"; }
            }

            for(var i=0; i<colorArray.length; i++){
                ServiceArray[i] = colorArray[i].Service;
            }

            for(var i=0; i<colorArray_application.length; i++){
                ApplicationArray[i] = colorArray_application[i].Application;
            }

            // for (var i=0; i<jsonDataArray.length; i++){
            //     if(jsonDataArray[i].Application != undefined){ ApplicationArray.push(jsonDataArray[i].Application);}
            // }

            // ApplicationArray = [...new Set(ApplicationArray)];  
            // console.log("ApplicationArray "+ApplicationArray);
            // Display the Excel data on the webpage
            // displayOutput(jsonDataArray);
                         
            // Call a function after the data is loaded
            normalizeFrequencyUnitToMHz(jsonDataArray);
            assignStackID(jsonDataArray); // done
            insertGap(jsonDataArray); //done
            splitTextToArray(jsonDataArray);
            sortStackMembers(jsonDataArray);
            assignRowID(jsonDataArray);
            assignUniqueID(jsonDataArray);
            assignGapFrequencyLabel(jsonDataArray);
            jsonDataArray_filtered = jsonDataArray;
            plot(jsonDataArray);
            createServiceLegend(colorArray);
            createServiceLegendHorizontal(colorArray);

        } else {
            console.error('Failed to load Excel file:', xhr.statusText);
        }
    };

    xhr.send();
    // console.log("End ExceltoJson------------");
    return jsonDataArray;
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


function normalizeFrequencyUnitToMHz(data) {
    // console.log("normalizeFrequencyUnitToMHz");

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
    jsonDataArray = data;
    // console.log("end normalizeFrequencyUnitToMHz -----");
    CombineServiceAndDirectionToNewColumn(jsonDataArray);
    // console.log(jsonDataArray);
}

function CombineServiceAndDirectionToNewColumn(data) {
    for (var i = 0 ; i < data.length ; i++){ 
        data[i].Service_and_direction = data[i].EngService + '*' + data[i].Direction;
    }
    jsonDataArray = data;
}


function splitTextToArray(data) {
    // console.log("splitTextToArray");

    for (var i = 0 ; i < data.length ; i++){
        var text = data[i].Direction;
        if (text != undefined) {
            let splitted_text = text.split(',');
            data[i].Direction = splitted_text;
        }
        else { data[i].Direction = []; }
    }
      
   
    jsonDataArray = data;
    // console.log("end splitTextToArray -----");
}



function assignStackID(data) {
    // console.log("assignStackID");

    //sort order by start frequency
    var sorted_data = data.sort(function(a, b) {
        return a.Start_Frequency - b.Start_Frequency;
    });

    // console.log("sorted_data len = " + sorted_data.length);
    // displayOutput(sorted_data[0]);
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

    jsonDataArray = sorted_data;
    // jsonDataArray_filtered = sorted_data;
    // displayOutput(jsonDataArray_sorted_data);
    // console.log("assignStackID :" + jsonDataArray);
    // console.log("End assignStackID------------");
}


function insertGap(data) {
    // console.log("insertGap");
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
            // console.log("stack "+current+"and stack " + next +" have gap");
            data.push({ stack_id:null, Start_Frequency: max_stop_freq, Stop_Frequency: min_start_freq, Bandwidth: bandwidth, EngService : "gap"});
        }
    } 
        assignStackID(data);
        // console.log("End insertGap------------");
}


function assignRowID(data) {

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
    
    jsonDataArray = data;                               //return to global data array
    // jsonDataArray_filtered = data;

}


function assignUniqueID(data){
    
    for(var i=0; i<data.length; i++){
        data[i].id = i;
    }
    jsonDataArray = data;
    jsonDataArray_filtered = data;
}


function sortStackMembers(data) {
    // console.log("sortStackMembers");
    //sort order by Bandwidth in every stack
    var result = [];
    for(var i=0; i<=data[data.length-1].stack_id; i++){  // loop by the number of stacks e.g. 6 rounds for 6 stacks
        var family = getStackMembers(data, i);
        // console.log("family "+family);
        var sorted_family = family.sort(function(a, b) {
            return a.Bandwidth - b.Bandwidth;
        });
        for (var j=0; j< sorted_family.length; j++){
            result.push(sorted_family[j]);
        }   
    }

    jsonDataArray = result;
    // jsonDataArray_filtered = result;
    // console.log("End sortStackMembers------------");
}


function RowHeightScaler() {
    var row_num = jsonDataArray_filtered[jsonDataArray_filtered.length-1].row_id + 1;
    var factor = 0.25 / row_num;
    if (factor > 0.125) { factor = 0.125; }
    if (factor < 0.07) { factor = 0.07; }

    // console.log("factor "+factor);
    return factor;
}

function FontSizeScaler(box_height,box_width,num_direction_charactor) {
    var fontsize = 13;
    fontsize = ((7/107)*box_height)+(13-((7/107)*11))
    if ( fontsize > 20) { fontsize = 20; }

    var required_width = fontsize * num_direction_charactor;
    if(box_width < required_width){fontsize = 0;}

// console.log ("box_height "+box_height);
// console.log ("fontsize "+fontsize);
    return fontsize;
}


function plot(data){

    height_factor = RowHeightScaler();

    var text ="";

    var last_rowid = data[data.length-1].row_id;
    var length_accum = 0;

    for (var i=0; i <= last_rowid; i++)
    {
        var row_family = data.filter(word => word.row_id == i);
        var first_stack_of_row = row_family[0].stack_id;
        var last_stack_of_row = row_family[row_family.length-1].stack_id;

        var scale_factor = scaler(row_family,i);
        if(row_family[0].EngService == "gap" && row_family.length > 1)
        {
            var row_family_without0 = [];
            for (var p=1; p<row_family.length ; p++)
            {
                row_family_without0.push(row_family[p]);
            }
        console.log(row_family_without0);
            var min_freq_row = Math.min(...row_family_without0.map(item => item.Start_Frequency));
        }
        else
        {
            var min_freq_row = Math.min(...row_family.map(item => item.Start_Frequency));
        }
        var max_freq_row = Math.max(...row_family.map(item => item.Stop_Frequency));

        if (row_family.length == 1 && row_family[0].EngService == "gap" ) {
            text += '<span id='+row_family[0].id+' class="box"></span>';
            continue;
        }
        // Add frequency text for header
        var [Start_Frequency_label, Stop_Frequency_label, Stop_Frequency_Unit_label] = labelFrequncyConverter(min_freq_row, max_freq_row);
        text += '<h6 id="headline'+i+'">' + Start_Frequency_label + ' - ' + Stop_Frequency_label + ' ' + Stop_Frequency_Unit_label + '</h6>';

        // open new mainContainer for each row
        text += '<span id="mainContainer_'+i+'" class="main-container" style="width:'+containerWidth+'px;">'; 

        for (var j=first_stack_of_row ; j<=last_stack_of_row ; j++)
        {
            // skip if first stack is a gap
            if (j == first_stack_of_row && row_family[0].EngService == "gap") { 
                text += '<span id='+row_family[0].id+' class="box"></span>';
                continue;
            }

            text +=     '<span id="stack-container_'+ j +'" class="stack-container">';     // open stack Container

            var number_of_stack_member = countStackMembers(row_family,j);
            var stack_member = getStackMembers(row_family,j);
            let min_start_freq = Math.min(...stack_member.map(item => item.Start_Frequency));  
            let max_stop_freq = Math.max(...stack_member.map(item => item.Stop_Frequency));
            var height = (screenHeight/number_of_stack_member) * height_factor;
            var height_newline = height/height_newline_factor*number_of_stack_member;

            // console.log(stack_member);
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
            // console.log("Bandwidth "+stack_member[k].Bandwidth+" scale_factor "+scale_factor+" width "+width );
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

                    

                    // '<span style="color:'+mapped_color+';">&#x2B23</span>'
                    var card_header = Start_Frequency_label + " - " + Stop_Frequency_label + " " + Stop_Frequency_Unit_label ;
                    var card_information = stack_member[k].EngService + ' Service '+card_information_direction+' <br>Designation : ' +stack_member[k].order+ '<br>Bandwidth : '+ stack_member[k].Bandwidth +' '+Stop_Frequency_Unit_label+ '<br> Footnote : 5.xx (to be develop)' ; 
                    // var card_information = stack_member[k].EngService + ' Service<br>Designation : ' +stack_member[k].order+ '<br>' +Start_Frequency_label + " - " + Stop_Frequency_label + " " + Stop_Frequency_Unit_label + '<br>Bandwidth : '+ stack_member[k].Bandwidth +' '+Stop_Frequency_Unit_label+ '<br> Footnote : 5.xx' ; 



                
                    text +=         '<span id="'+stack_member[k].id+'" class="box" data-content="'+card_header+'" data-detail="'+card_information+'" style="font-size:'+fontsize+'px; background-image: '+service_order_style+'; margin-left:'+offset_start_freq+'px; line-height:'+height+'px; height:'+height+'px; width:'+width+'px; background-color:'+mapped_color+';' ;
                
        
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
        for (var l=0; l<frequencyLabelArray[i].length; l++ )
        {
            label_font_size = 10; // in pixel unit / default is 12
            var label_width = label_font_size * 1.5 ;

            var this_freq_label = frequencyLabelArray[i][l];
            var last_freq_label = frequencyLabelArray[i][frequencyLabelArray[i].length - 1];
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
    if(hide==0){text +='<div id="Legend-horizontal"></div>'}
        
    $('#output').append(text);
        
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
    
    var scale_factor = parseFloat(containerWidth/sum_bandwidth); // set factor

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
    const entry = colorArray.find(entry => entry.Service === service);
    return entry ? entry.Color : null;
  }


function createServiceLegend(colorArray) {
    var colorLegend ="";

    var data_legend = [];

    for (var i=0; i<jsonDataArray_filtered.length; i++) {
        data_legend[i] = {};
        data_legend[i].Service = jsonDataArray_filtered[i].EngService;
        data_legend[i].Direction = jsonDataArray_filtered[i].Direction;
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
    $('#Legend').append(colorLegend);
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

    for (var i = 0; i < jsonDataArray_filtered.length; i++) {
        data_legend[i] = {};
        data_legend[i].Service = jsonDataArray_filtered[i].EngService;
        data_legend[i].Direction = jsonDataArray_filtered[i].Direction;
    }
    var grouped_legend = GroupAndRemoveDupplicate(data_legend);
    grouped_legend = leftJoin(colorArray, grouped_legend, "Service", "Service");

    colorLegend += '<div id="Legend-horizontal" style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">';

    for (var i = 0; i < grouped_legend.length; i++) {
        colorLegend += '<div id="' + grouped_legend[i].Service + '" class="legend" style="display: inline-flex; align-items: center; cursor: default;">';
        colorLegend += '<span class="legend" style="color: ' + grouped_legend[i].Color + '; font-size: 20px;">&#x2B23;</span>';
        colorLegend += '<span class="legend" style="margin-left: 5px;" onclick="onclickLegend(this)">' + grouped_legend[i].Service + '</span>';

        for (var j = 0; j < grouped_legend[i].Direction.length; j++) {
            var id_string = String(grouped_legend[i].Service + "*" + grouped_legend[i].Direction[j]).replace(/ /g, "_");

            var directionSymbol = "";
            if (grouped_legend[i].Direction[j] == "Earth-to-Space") directionSymbol = "&#8593"; // ↑
            else if (grouped_legend[i].Direction[j] == "Space-to-Earth") directionSymbol = "&#8595"; // ↓
            else if (grouped_legend[i].Direction[j] == "Space-to-Space") directionSymbol = "&#8596"; // ↔
            else if (grouped_legend[i].Direction[j] == "Deep Space") directionSymbol = "&#11097"; // ⦿

            if (directionSymbol) {
                colorLegend += '<span id="' + id_string + '" class="legend-direction" style="font-size: 18px; margin-left: 8px; cursor: pointer;" onclick="onclickLegend(this)">' + directionSymbol + '</span>';
            }
        }
        colorLegend += '</div>';
    }

    colorLegend += "</div>";

    $("#Legend-horizontal").html(colorLegend);
}



function createApplicationLegend(application_legend_array) {
    var application_legend ="";
    for(var i = 0;i<application_legend_array.length; i++){
        application_legend+= '<p id="'+application_legend_array[i].Application+'" onclick="onclickLegend(this)" class="legend" style="margin-bottom: 0px;cursor:default;"><span style="color: '+application_legend_array[i].Color+'; font-size: 20px;">&#x2B23;</span><span> '+application_legend_array[i].Application+'</button>'
    }
    $('#Legend').append(application_legend);
}

function assignGapFrequencyLabel(data) {

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
        frequencyLabelArray.push(uniqueArray);
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
    ToggleLegend = "service";
    console.log("to service")    
}

function toggletoApplication() {
    var section = document.getElementById("Legend");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });
    removeElementsByIds(output_elementIds);
    createApplicationLegend(colorArray_application_filtered);
    ToggleLegend = "application";
    console.log("to application") 
}


function onclickChart(clickedElement){
    var elementId = clickedElement.id;
    var element = document.getElementById(elementId);

    //...
}


function onclickLegend(clickedElement){

    var clicked_elementId = clickedElement.id;
    console.log("________________________");
    console.log("clicked_elementId: "+clicked_elementId);
    // var temp_elementId_direction = clickedElement.id;
    var separated_string_array = clicked_elementId.split("*");
    var elementId = separated_string_array[0].replace(/\s/g, "_");
    // var element = document.getElementById(elementId);
    
    // check if user clicks on service or service's direction
    if (clicked_elementId.includes("*")) { 
        // if click on direction of service legend
        if (!SelectedLegend.includes(elementId)) {
            SelectedLegend.push(elementId);
        }
        var elementId_direction = clicked_elementId;
        // var element_direction = document.getElementById(elementId_direction);
        if(SelectedLegendDirection.includes(clicked_elementId)){
            // if already exists in the global array -> delete & unfilter its direction
            SelectedLegendDirection = SelectedLegendDirection.filter(item => item !== clicked_elementId);    //remove from the global array
            var temp_elementId_direction_array = [];
            temp_elementId_direction_array[0] = clicked_elementId;
            toggleClassesbyID(temp_elementId_direction_array, "legend-direction");
        }
        else{
            // not exists -> put the direction id to the global array & filter its direction
            SelectedLegendDirection.push(elementId_direction);
            
            toggleClassesbyID(SelectedLegendDirection, "legend-direction-clicked");
            var temp_elementId = [];
            temp_elementId[0] = elementId.replace(/_/g, " ");   //  need to replace _ with blank space to map with the ID of legends with spaces
            toggleClassesbyID(temp_elementId, "legend-checked");
        }
    }
    else {    //if click on service legend
        // console.log("click on service name");
        if(SelectedLegend.includes(elementId)){    // service is already selected
          //hereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee 
          console.log("click on service"); 
            SelectedLegend = SelectedLegend.filter(item => item !== elementId);  // remove the service id from the global array
            var unselected_legend_direction = [];
            var separated_direction ;
            var service_name ;
            // to remove all its directions from SelectedLegendDirection
            var selected_legend_direction_temp = SelectedLegendDirection;       // temp var for prevention of loop paradox  to use its constant length in loop
            for (var i = 0; i < SelectedLegendDirection.length; i++) {
                separated_direction = SelectedLegendDirection[i].split("*")
                service_name = separated_direction[0].replace(/\s/g, "_");      // replace blank space with _
                if (service_name == elementId) {  // if current direction belongs to the service
                    unselected_legend_direction.push(SelectedLegendDirection[i]);   // push clicked service to unclick state
                    selected_legend_direction_temp = selected_legend_direction_temp.filter(item => item !== SelectedLegendDirection[i]); // filter out directions under the clicked service
                }
            }
            SelectedLegendDirection = selected_legend_direction_temp;
            var temp_elementId = [];
            temp_elementId[0] = elementId.replace(/_/g, " ");
            toggleClassesbyID(temp_elementId, "legend");
            toggleClassesbyID(unselected_legend_direction, "legend-direction");
            
        }
        else { // service is just selected
            SelectedLegend.push(elementId);
            var temp_elementId = [];
            temp_elementId[0] = elementId.replace(/_/g, " ");
            toggleClassesbyID(temp_elementId, "legend-checked");
        }
    }

    console.log("elementId: "+elementId);
    console.log("direction id: "+elementId_direction);

    console.log("SelectedLegend: "+SelectedLegend);
    console.log("SelectedLegendDirection: "+SelectedLegendDirection);
    console.log("________________________");

    // var All_element_id = [];

    // for(var i=0; i<jsonDataArray_filtered.length; i++){
    //     All_element_id[i]=jsonDataArray_filtered[i].id;
    // }

    
    // console.log(ServiceArray_filtered);
    // console.log(colorArray_filtered);
    
    // var ServiceArray_filtered =[];
    // for(var i = 0; i < colorArray_filtered.length; i++){
    //     ServiceArray_filtered[i] = colorArray_filtered[i].Service;
    // }

    // unselected_legend = ServiceArray_filtered.filter(element => !SelectedLegend.includes(element));


    // toggleClassesbyID(SelectedLegend, "legend-checked");
    // toggleClassesbyID(unselected_legend, "legend");

    // for data
    var set = new Set([...SelectedLegend, ...SelectedLegendDirection]); // union both arrays
    var selected_service_and_direction = Array.from(set);

    for (var i = 0; i < selected_service_and_direction.length; i++) {
        if (!selected_service_and_direction[i].includes("*")) {
            // if no direction, concat "*undefined" to it for mapping with data
            selected_service_and_direction[i] += "*undefined";
        }
    }

    // console.log(selected_service_and_direction);

    var selected_data = [];
    var unselected_data = [];

    for (var i = 0; i < selected_service_and_direction.length; i++) {
        selected_data = jsonDataArray_filtered.filter(item => selected_service_and_direction[i].includes(item[jsonDataArray_filtered]));
    }

    selected_data, unselected_data  = filterAndPartitionData(jsonDataArray_filtered, 'Service_and_direction', selected_service_and_direction);
    selected_data = unselected_data.filteredData;
    unselected_data = unselected_data.unfilteredData;
    
    // for no service is selected but still perform search
    if ((inputValue_legend != "") && (SelectedLegend.length == 0)){
        console.log(ServiceArray_filtered);
        selected_data = jsonDataArray_filtered.filter(item => ServiceArray_filtered.includes(item.EngService));
        unselected_data = jsonDataArray_filtered.filter(item => !ServiceArray_filtered.includes(item.EngService));
console.log("YES");
    }
    // //hereeeeee
    //     ServiceArray_filtered = [];
    //     for (var i=0; i < colorArray_filtered.length ; i++){
    //         ServiceArray_filtered[i] = colorArray_filtered[i].Service;
    //     }
    //     // selected_data = jsonDataArray_filtered.filter(item => ServiceArray_filtered.includes(item.EngService));
    //     // unselected_data = jsonDataArray_filtered.filter(item => !ServiceArray_filtered.includes(item.EngService));
    //     selected_data, unselected_data  = filterAndPartitionData(jsonDataArray_filtered, 'Service_and_direction', ServiceArray_filtered);
    //     selected_data = unselected_data.filteredData;
    //     unselected_data = unselected_data.unfilteredData;
    // }


    // console.log(SelectedLegend);
    // console.log(unselected_legend);
    // console.log(SelectedLegendDirection);

    // console.log(selected_data);
    // console.log(unselected_data);

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
    else (toggleClasses(jsonDataArray_filtered, "box"));

    
    
    // 
    // Toggle between currentClass and newClass
    // if (element.classList.contains("legend")) {
    //     element.classList.remove("legend");
    //     element.classList.add("legend-checked");
        
    // }
    // else {
    //     element.classList.remove("legend-checked");
    //     element.classList.add("legend");
    // }

    // if (element_direction.classList.contains("legend-direction")) {
    //     element_direction.classList.remove("legend-direction");
    //     element_direction.classList.add("legend-direction-clicked");
    // }
    // else {
    //     element_direction.classList.remove("legend-direction-clicked");
    //     element_direction.classList.add("legend-direction");
    // }


    
//     var elementsWithClassclicked = document.getElementsByClassName("legend-checked");
//     var elementsWithClassUnclicked = document.getElementsByClassName("legend");
    
//     // Extract IDs and log them
//     var selected_legend = Array.from(elementsWithClassclicked).map(element => element.id);
//     var unselected_legend = Array.from(elementsWithClassUnclicked).map(element => element.id);
// // console.log(selected_legend);

//     if (ToggleLegend == "service") { 
//         var legend_type = "EngService";
//         if (selected_legend.length == 0 ) {
//             selected_legend = ServiceArray_filtered;
//         }
//     }
//     else {
//         var legend_type = "Application";
//         if (selected_legend.length == 0 ) {
//             selected_legend = ApplicationArray_filtered;
//         }
//     }

//     var selected_data = FilterDataByAttribute(jsonDataArray_filtered, legend_type, selected_legend)
//     // var unselected_data = FilterDataByAttribute(jsonDataArray_filtered, legend_type, unselected_legend)
//     var unselected_data = jsonDataArray_filtered.filter(element => !selected_data.includes(element));

// console.log(unselected_data);

//     if(selected_data.length != 0){
//         toggleClasses(selected_data, "highlight");
//         toggleClasses(unselected_data, "faddd");
//     }
//     else{
//         if (inputValue_legend != ""){
//             selected_data = FilterDataByAttribute(jsonDataArray_filtered, legend_type, ServiceArray_filtered)
//             unselected_legend = jsonDataArray_filtered.filter(value => !ServiceArray_filtered.includes(value));
//             unselected_data = FilterDataByAttribute(jsonDataArray_filtered, legend_type, unselected_legend)
//             toggleClasses(selected_data, "highlight");
//             toggleClasses(unselected_data, "faddd");
//         }
//         else {toggleClasses(jsonDataArray_filtered, "box") }
//     }
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


    console.log(filteredData);
    console.log(unfilteredData);
    return { filteredData, unfilteredData };
}


function logInput() {
    inputValue_legend = inputBox_legend.value;
    
    resetTimer();
    if (timeoutFlag == false) {
        // console.log("Reset occurred. Exiting the function.");
        return; // Exit the function
    }

    console.log(inputValue_legend);
    
}


let timeoutFlag = false;
let delayTimer;
function resetTimer() {
    clearTimeout(delayTimer);
    timeoutFlag = false

    delayTimer = setTimeout(function() {
        timeoutFlag = true;
        // console.log("User stopped typing for 1 second");
        PerformSearch(inputValue_legend);
    }, 0);
}


function PerformSearch(inputValue_legend) {
    
    cards = [];
    cardheight = 0;
    SelectedLegend = [];            //to clear before search legend
    SelectedLegendDirection = [];   //to clear before search legend

    // Get the current input value
    inputValue_legend = inputValue_legend.toLowerCase();

    if (ToggleLegend == "service") {

        // Filter services based on the filtered start/stop frequency
        var filtered_service_from_data = getUniqueValuesOfAttributebyAttribute(jsonDataArray_filtered,"EngService");

        // Filter items based on the input
        var filtered_legend = filtered_service_from_data.filter(item => item.toLowerCase().includes(inputValue_legend));
        ServiceArray_filtered = filtered_legend;
        
        var unselected_legend = filtered_service_from_data.filter(value => !filtered_legend.includes(value));

        var selected_data = FilterDataByAttribute(jsonDataArray_filtered, "EngService", filtered_legend)
        var unselected_data = FilterDataByAttribute(jsonDataArray_filtered, "EngService", unselected_legend)

        colorArray_filtered = colorArray.filter(word => filtered_legend.includes(word.Service));
        
        if(selected_data.length != 0){
            toggleClasses(selected_data, "highlight");
            toggleClasses(unselected_data, "faddd");
            }
        
        else{
            toggleClasses(selected_data, "box");
            }

        removeElementsByIds(ServiceArray);
        createServiceLegend(colorArray_filtered);
        createServiceLegendHorizontal(colorArray_filtered);
    }
    
    else {      //ToggleLegend == "application"

        // var filtered_application_from_data = [];
        // for (var i=0; i<jsonDataArray_filtered.length; i++) {
        //     filtered_application_from_data[i] = jsonDataArray_filtered[i].Application;
        //     // if (filtered_application_from_data[i] == undefined) { filtered_application_from_data[i] = ""; }
        // }

        // Filter applications based on the filtered start/stop frequency
        var filtered_application_from_data = getUniqueValuesOfAttributebyAttribute(jsonDataArray_filtered,"Application");

        // console.log(filtered_application_from_data);

        // Filter items based on the input
        var filtered_legend2 = filtered_application_from_data.filter(item => item.toLowerCase().includes(inputValue_legend));
        ApplicationArray_filtered = filtered_legend2;

        const unselected_legend2 = filtered_application_from_data.filter(value => !filtered_legend2.includes(value));
        const filtered_color2 = colorArray_application.filter(word => filtered_legend2.includes(word.Application));

        var selected_data2 = FilterDataByAttribute(jsonDataArray_filtered, "Application", filtered_legend2)
        var unselected_data2 = FilterDataByAttribute(jsonDataArray_filtered, "Application", unselected_legend2)

        if(selected_data2.length != 0){
            toggleClasses(selected_data2, "highlight");
            toggleClasses(unselected_data2, "faddd");
            }
        
        else{
            toggleClasses(selected_data2, "box");
            }
        // console.log(filtered_color2);
        colorArray_application_filtered = filtered_color2;
        removeElementsByIds(ApplicationArray);
        createApplicationLegend(filtered_color2);
        
    }

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
    
    // //find id from data
    var id = [];
    for(var i=0; i<data.length; i++) {
        id[i] = data[i].id;
    }
    
    
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

function filterFrequency() {
    cards = [];
    cardheight = 0;
    SelectedLegend = [];            //to clear before search legend
    SelectedLegendDirection = [];   //to clear before search legend
    SelectedLegend_tmp = [];

    var inputValue_StartFrequency = inputBox_StartFrequency.value;
    var inputValue_StopFrequency = inputBox_StopFrequency.value;

    var section = document.getElementById("output");
    var output_elementIds = Array.from(section.children).map(function(child) {
        return child.id; });

    var unit_dropdown = document.getElementById("unit_dropdown");
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
    var result = jsonDataArray.filter(word => (word.Start_Frequency >= input_frequency) || ((word.Start_Frequency < input_frequency) && (word.Stop_Frequency > input_frequency)));

    
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
        var input_frequency = jsonDataArray[jsonDataArray.length-1].Stop_Frequency;
    }
    var stop_frequency = input_frequency;

    // to break program if stop < start freq
    if (start_frequency > stop_frequency) {
        //...
    }
    
    result = result.filter(word => word.Start_Frequency < input_frequency);

    jsonDataArray_filtered = result;
    // console.log(jsonDataArray_filtered);

    removeElementsByIds(output_elementIds);

    assignStackID2(jsonDataArray_filtered); // done
    insertGap2(jsonDataArray_filtered); //done
    sortStackMembers2(jsonDataArray_filtered);
    assignRowID2(jsonDataArray_filtered);
    assignGapFrequencyLabel2(jsonDataArray_filtered);
    plot(jsonDataArray_filtered);
    filteredLegend();
}


function assignStackID2(data) {
    // console.log("assignStackID2");

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
    jsonDataArray_filtered = sorted_data;

    // console.log("End assignStackID2------------");
}


function insertGap2(data) {
    console.log("insertGap");
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
            // console.log("stack "+current+"and stack " + next +" have gap");
            data.push({ stack_id:null, Start_Frequency: max_stop_freq, Stop_Frequency: min_start_freq, Bandwidth: bandwidth, EngService : "gap"});
        }
    } 
        assignStackID2(data);
        console.log("End insertGap2------------");
}


function assignRowID2(data) {

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

        if (jsonDataArray_filtered.length == jsonDataArray.length) {
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

    jsonDataArray_filtered = data;

    if (jsonDataArray_filtered.length != jsonDataArray.length) {
        assignRowID3(jsonDataArray_filtered)
    }
}

function assignRowID3(data) {
    var row_num = jsonDataArray_filtered[jsonDataArray_filtered.length-1].row_id + 1
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
    if (data[data.length-1].EngService == "Not Allocation") {
        data[data.length-1].row_id = data[data.length-1].row_id + 1;
    }

    jsonDataArray_filtered = data;
}


function assignUniqueID2(data){  
    for(var i=0; i<data.length; i++){
        data[i].id = i;
    }

    jsonDataArray_filtered = data;
}


function sortStackMembers2(data) {
    // console.log("sortStackMembers2");
    //sort order by Bandwidth in every stack
    var result = [];
    for(var i=0; i<=data[data.length-1].stack_id; i++){  // loop by the number of stacks e.g. 6 rounds for 6 stacks
        var family = getStackMembers(data, i);
        var sorted_family = family.sort(function(a, b) {
            return a.Bandwidth - b.Bandwidth;
        });
        for (var j=0; j< sorted_family.length; j++){
            result.push(sorted_family[j]);
        }   
    }

    jsonDataArray_filtered = result;
    // console.log("End sortStackMembers2------------");
}


function assignGapFrequencyLabel2(data) {
    frequencyLabelArray = [];
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
        
        frequencyLabelArray.push(uniqueArray);
    }
}


function filteredLegend(){
   
    var filtered_services = getUniqueValuesOfAttributebyAttribute(jsonDataArray_filtered,"EngService");

    // console.log(filtered_services);
    const filtered_color = colorArray.filter(word => filtered_services.includes(word.Service));
    removeElementsByIds(ServiceArray);
    createServiceLegend(filtered_color);
    createServiceLegendHorizontal(filtered_color);
    
    colorArray_filtered = filtered_color;
    ServiceArray_filtered = [];
    for (var i=0; i<colorArray_filtered.length; i++ ){
        ServiceArray_filtered[i] = colorArray_filtered[i].Service;
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
    var container = document.getElementById('section_chart');
    containerWidth = container.clientWidth;
    containerWidth = Math.round(containerWidth / 10) * 10;
    console.log("Container Width: " + containerWidth + " pixels");
}


function logContainerHeight() {
    var container = document.getElementById('Main');
    containerHeight  = container.clientHeight;
    console.log("Container Height: " + containerHeight + " pixels");
    return containerHeight;
}


// Function to log the screen width
function logScreenWidth() {
    screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    console.log("Screen Width: " + screenWidth + " pixels");
}


// Function to log the screen height
function logScreenHeight() {
    screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    console.log("Screen Height: " + screenHeight + " pixels");
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
    const found = colorArray.findIndex(word=> word.Service == EngService)
    
    var result;
    if(found == -1){ // -1 is not matched
        result = 0;
    }
    else {
        result = colorArray[found].Color;
    }
    return result;
}


function getcolorarray(color_id){
    var filteredcolor = colorArray.filter(word => word.EngService == color_id);
    return filteredcolor ;
}



function selectMenu(menu) {
    const menus = document.querySelectorAll('.menu-item');

    menus.forEach((m) => {
    m.classList.remove('selected');
    });

    menu.classList.add('selected');

    // Get the id of the selected menu
    SelectedMenu = menu.id;
    
    console.log("--------------------------------------------")
    if (SelectedMenu == "nfat") {
        sheet_index0 = 0;
        sheet_index1 = 1;
        sheet_index2 = 2;
    }
    else if (SelectedMenu == "unlicensed") {
        sheet_index0 = 3;
        sheet_index1 = 4;
        // sheet_index2 = 2;
    }
    else
    {
        console.log("Error! unknown selected menu")
    }
    console.log("SelectedMenu "+SelectedMenu);


    

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
                if (this.checked) { 
                    hide = 0;
                    statusText.textContent = "Horizontal legend";
                    filterFrequency()
                } else {
                    hide = 1;
                    statusText.textContent = "Vertical legend";
                    filterFrequency()
                }
            });
        }
    });



// -----------------------------Create card----------------------------------------------------------

let activeCards = new Map();  
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

            card.innerHTML = `
                <div class="card-header">
                    <span>${span.dataset.content}</span>
                    <div class="close-btn">×</div>
                </div>
                <div class="card-body">${span.dataset.detail}</div>
            `;

            const closeBtn = card.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
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

        function drawConnections() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        
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
        
                ctx.beginPath();
                ctx.moveTo(spanX, spanY);
                ctx.lineTo(cardX, cardY);
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
        
    

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                activeCards.forEach(card => card.remove());
                activeCards.clear();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });