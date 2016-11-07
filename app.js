'use strict';
// Load in our compatibility shim before anything else
var shim = require('./shim.js');
var DataSourceAdapter = require('./lib/data/DAL/DataSourceAdapter');
var ViewAdapter = require('./lib/view/ViewAdapter');
var PropertiesTile = require('./lib/view/PropertiesTile');

// Declare the sunburst object in the global scope so we can reference it in
// event handlers, etc.
DataSourceAdapter.getChartDataSource(function (dataArray) {
    // Initialize the property tile by loading it into its module
    let myPropTile = new PropertiesTile(document.getElementById('properties-tile'));
    // Here we hook up PropertyTile's centerInParent() method to the window's resize event
    window.onresize = function () {
        myPropTile.centerInParent();
    };

    let mySunburst = new wijmo.chart.hierarchical.Sunburst('#periodic-sunburst'); // initialize!
    // Let the Sunburst Chart know we're going to start making changes
    mySunburst.beginUpdate();

    // Set some stylistic properties for the chart
    mySunburst.legend.position = 'None'; // hide the legend
    mySunburst.innerRadius = 0.3; // set up a relatively large space for displaying info
    mySunburst.selectionMode = 'Point';
    mySunburst.dataLabel.position = 'Center'; // center panel labels
    mySunburst.dataLabel.content = '{name}'; // the panel should display its name (derived from bindingName property)

    mySunburst.itemsSource = dataArray; // set the items source to the array generated by the DataSourceAdapter
    mySunburst.binding = 'value'; // bind each item to the constant 'value' property to get equal arc angles for all element panels
    mySunburst.bindingName = ['groupName', 'subGroupName', 'eleSymbol']; // set the property that gives the name we want to display for each chart level
    mySunburst.childItemsPath = ['subGroups', 'elements']; // set the property names that hold the children for each level (remember our data structure is Group.subGroups.elements)

    // Set up a function to listen for click events on the Sunburst Chart's parent DOM element
    mySunburst.hostElement.addEventListener('click', function (e) {
        // If a panel is clicked, visually select it
        markSelectedPanel(e.pageX, e.pageY);

        // Perform a hit test to get a clicked panel's name then use it to set up the info panel via the ViewAdapter
        let ht = mySunburst.hitTest(e.pageX, e.pageY);
        myPropTile.showInfoPanel(ViewAdapter.getObjectFromChartName(ht.name, mySunburst.collectionView));
    });

    // Set selected element variables in this outer scope to preserve them
    let lastSelectedEle;
    let lastSelectedEleFillColor;

    // Determine if we need to reshow any text elements that we hid to find the right panel
    let reshowText = false;
    let hiddenTextElement;

    /**
     * Visually marks a panel at the given coordinates as selected
     * 
     * @param {number} panelX the X coordinate of the panel to mark
     * @param {number} panelY the Y coordinate of the panel to mark
     */
    function markSelectedPanel(panelX, panelY) {
        // First, 'unselect' (restore the fill color of) the element that was selected last, if there is one
        if (typeof (lastSelectedEle) !== 'undefined' && typeof (lastSelectedEleFillColor) !== 'undefined') {
            lastSelectedEle.setAttribute('fill', lastSelectedEleFillColor);
        }

        // Define our selected element and check to see if it's a panel that we can fill
        let selectedElement = document.elementFromPoint(panelX, panelY);
        if (typeof (selectedElement) !== 'undefined' && selectedElement.hasAttribute('fill') && selectedElement.tagName === 'path') {
            if (reshowText) { // if we hid a text element last time, show it now
                hiddenTextElement.style.display = '';
                reshowText = false;
            }

            // Reset the lastSelectedEle and then change the fill color of the clicked panel
            lastSelectedEle = selectedElement;
            let fillColor = selectedElement.getAttribute('fill');
            lastSelectedEleFillColor = fillColor;
            let rgbaValues = fillColor.replace('rgba(', '').replace(')', '').split(',');
            rgbaValues[3] = '1.0';
            selectedElement.setAttribute('fill', 'rgba(' + rgbaValues.join(',') + ')');
        } else if (typeof (selectedElement) !== 'undefined' && selectedElement.tagName === 'text') { // super hacky way to get the right panel if a data label is clicked
            // Hide the data label
            selectedElement.style.display = 'none';
            // Set our outer scope variables so the text element is reshown
            hiddenTextElement = selectedElement;
            reshowText = true;
            // Run the method again with the data label hidden
            markSelectedPanel(panelX, panelY);
        }
    }

    // Let the chart know that everything is updated now
    mySunburst.endUpdate();
});
