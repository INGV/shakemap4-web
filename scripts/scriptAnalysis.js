// var fas = require("fs");
// var text = fas.readFileSync("./eventlist.txt", "utf-8");
// var list = text.split("\n")
//
// console.log(list)

function getURLParameter(name) {
  return (
    decodeURIComponent(
      (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(
        location.search
      ) || [null, ''])[1].replace(/\+/g, '%20')
    ) || null
  );
};

// #####################################################
// Open the download page for an event
//
function open_download () {
  window.location = './downloadPage.html?eventid=' + eventid;
};

// #####################################################
// Open the double map view
//
function open_leaflet () {
  window.location = './viewLeaflet.html?eventid=' + eventid;
}

// #####################################################
// Plot data
//
function plot_data (data, comp_id) {
  var div_id = '#' + comp_id;
  var predID = comp_id + 'Prediction';

  // set the dimensions and margins of the graph
  var margin = {top: 10, right: 30, bottom: 30, left: 60},
      width = 1100 - margin.left - margin.right,
      height = 700 - margin.top - margin.bottom;

  // append the svg obgect to the body of the page
  // appends a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  var svg = d3.select(div_id).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  var div = d3.select(div_id).append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  // set the scales
  var x = d3.scaleLog().range([0, width]);
  if (div_id == "#intensity") {
    var y = d3.scaleLinear().range([height, 0]);
    var tickNumber = 10;
  } else {
    var y = d3.scaleLog().range([height, 0]);
    var tickNumber = 4;
  };


// Define axes maximums
  var distance_max = Math.max(...data.map(o => o.distance), 0)
  var distance_min = Math.min(...data.map(o => o.distance), distance_max)

  if (distance_min < 10) {
    distance_min = 1;
  } else {
    distance_min = 10;
  };

  x.domain([distance_min, distance_max]);
  y.domain([Math.min(...data.map(o => o[comp_id]), +0.01)-0.001, Math.max(...data.map(o => o[comp_id]), 0)+0.5]);


// Add the scatterplot
    // Predicted scatterplot
svg.selectAll("dot")
    .data(data)
    .enter().append("path")
      .attr("class", "point")
      .attr("r", 0.1)
      .style("fill", "#808080")
      .style("stroke", "#000000")
      .attr("d", d3.symbol().type(d3.symbolCircle))
      .attr("transform", function(d) { return "translate(" + x(d.distance) + "," + y(d[predID]) + ")"; });

      // Observed data scatterplot
  svg.selectAll("dot")
      .data(data)
      .enter().append("path")
        .attr("class", "point")
        .attr("r", 1)
        .style("fill", function (d) { return d.color})
        .style("stroke", "#000000")
        .attr("d", d3.symbol().type(d3.symbolTriangle))
        .attr("transform", function(d) { return "translate(" + x(d.distance) + "," + y(d[comp_id]) + ")"; })
        .on("mouseover", function(d) {
               div.transition()
                 .duration(200)
                 .style("opacity", .7);
               div.html(
                 'Station ID: ' + d.id +
                 '<br/>Distance: ' + d.distance +
                 ' km<br/> MMI: ' + d.intensity +
                 '<br/> MMI predicted: ' + d.intensityPrediction +
                 '<br/> PGA: ' + d.pga +
                 ' %g<br/> PGA pred: ' + d.pgaPrediction +
                 ' %g<br/> PGV: ' + d.pgv +
                 ' cm/s<br/> PGV pred: ' + d.pgvPrediction +
                 ' cm/s'
                  )
                 .style("left", (d3.event.pageX + 5) + "px")
                 .style("top", (d3.event.pageY - 28) + "px");
               })
          .on("mouseout", function(d){
            div.transition()
              .duration(2000)
              .style("opacity", 0);
            });

  // Legend
 svg.append("rect")
     .attr("x", width-width*0.21)
     .attr("y", 0)
     .attr("width", 100)
     .attr("height", 40)
     .style("stroke", "#000000")
     .attr("stroke-width", 2)
     .style("fill", "#F0E0C0");

  svg.selectAll("dot")
      .data([0])
      .enter().append("path")
        .attr("class", "point")
        .attr("r", 0.1)
        .style("fill", "#FFFFFF")
        .style("stroke", "#000000")
        .attr("d", d3.symbol().type(d3.symbolTriangle))
        .attr("transform","translate(" + (width-width*0.2).toString() + ", 10)" );

  svg.append("circle").attr("cx", width-width*0.2).attr("cy", 30).attr("r", 6).style("fill", "#808080").style("stroke", "#000000");
  svg.append("text").attr("x", width-width*0.18).attr("y", 10).text("Observed").style("font-size", "15px").attr("alignment-baseline","middle");
  svg.append("text").attr("x", width-width*0.18).attr("y", 30).text("Predicted").style("font-size", "15px").attr("alignment-baseline","middle");


// Add the X Axis
  svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(5));

  svg.append("text")
    .attr("transform",
          "translate(" + (width/2) + " ," +
                         (height + margin.top + 20) + ")")
    .style("text-anchor", "middle")
    .text("Distance (km)");
  // Add the Y Axis
  svg.append("g")
      .call(d3.axisLeft(y).ticks(tickNumber));

  var yVar = 'Intensity (MMI)';
  if (comp_id == 'pga') {
    yVar = 'Peak ground acceleration (%g)'
  } else if (comp_id == 'pgv') {
      yVar = 'Peak ground velocity (cm/s)'
  };

  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(yVar);

};

// #####################################################
// Clean array from null values
//
function clean_array(array, keyName) {
  var newArray = [];

  for (var i=0; i<array.length; i++) {
    if (array[i][keyName] != "null") {
      newArray.push(array[i]);
    };
  };

  return newArray;
};
// #####################################################
// Get stationList
//
function stationList() {
  $.getJSON(
    './data/' + eventid + '/current/products/stationlist.json',
    function(json) {
      var stations = json.features;
      return_data(stations);
      console.log(stations[0]);
    }
  );
  function return_data(stations) {
    var objArr = [];
    for (var i=0; i<stations.length; i++) {
      if (stations[i].properties.distance  < 301 && stations[i].properties.distance > 1 && stations[i].properties.pga > 0.0098) {
        objArr.push({ id: stations[i].id,
                      distance:stations[i].properties.distance,
                      intensity:stations[i].properties.intensity,
                      pga:stations[i].properties.pga,
                      pgv:stations[i].properties.pgv,
                      color:intColors[Math.round(stations[i].properties.intensity)],
                      intensityPrediction:stations[i].properties.predictions[5].value,
                      pgaPrediction:stations[i].properties.predictions[4].value,
                      pgvPrediction:stations[i].properties.predictions[2].value});
        };
      };

  plot_data(clean_array(objArr, 'intensity'), 'intensity');
  plot_data(clean_array(objArr, 'pga'), 'pga');
  plot_data(clean_array(objArr, 'pgv'), 'pgv');
  }
}

var eventid = getURLParameter('eventid');

stationList();
