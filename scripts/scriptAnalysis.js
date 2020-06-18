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
function plot_data (data, div_id) {
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

  // set the scales
  var x = d3.scaleLog().range([0, width]);
  if (div_id == "#intensity") {
    var y = d3.scaleLinear().range([height, 0]);
  } else {
    var y = d3.scaleLog().range([height, 0]);
  };

// Define axes maximums
  distance_max = Math.max(...data.map(o => o.distance), 0)

  x.domain([0.5, distance_max + distance_max*0.05]).nice();
  y.domain([Math.min(...data.map(o => o.value), 0)+0.01, Math.max(...data.map(o => o.value), 0)+0.5]).nice();

// Add the scatterplot
  svg.selectAll("dot")
      .data(data)
    // .enter().append("circle")
    //   .attr("r", 2)
    //   .attr("cx", function(d) { return x(d.distance); })
    //   .attr("cy", function(d) { return y(d.value); })
    //   .style("fill", "#69b3a2"Math.round(number * 10) / 10);
      .enter().append("path")
        .attr("class", "point")
        .attr("r", 1)
        .style("fill", function (d) { return d.color})
        .style("stroke", "#000000")
        .attr("d", d3.symbol().type(d3.symbolTriangle))
        .attr("transform", function(d) { return "translate(" + x(d.distance) + "," + y(d.value) + ")"; });
        console.log(intColors[4.5])
  // Add the X Axis
  svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(5));

  // Add the Y Axis
  svg.append("g")
      .call(d3.axisLeft(y));
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
    var intArr = [];
    var pgaArr = [];
    var pgvArr = [];
    for (var i=0; i<stations.length; i++) {
      if (stations[i].properties.intensity != "null") {
        intArr.push({distance:stations[i].properties.distance,
                      value:stations[i].properties.intensity,
                      color:intColors[Math.round(stations[i].properties.intensity)],
                      prediction:stations[i].properties.predictions[5].value});
      };

      if (stations[i].properties.pga != "null") {
        pgaArr.push({distance:stations[i].properties.distance,
                    value:stations[i].properties.pga,
                    color:intColors[Math.round(stations[i].properties.intensity)],
                    prediction:stations[i].properties.predictions[4].value});
      };
      if (stations[i].properties.pgv != "null") {
        pgvArr.push({distance:stations[i].properties.distance,
                    value:stations[i].properties.pgv,
                    color:intColors[Math.round(stations[i].properties.intensity)],
                    prediction:stations[i].properties.predictions[2].value});
      };
      };
  plot_data(intArr, "#intensity");
  plot_data(pgaArr, "#pga");
  plot_data(pgvArr, "#pgv");
  // plot_data(sa03Arr, "#dropdown1");
  // plot_data(sa10Arr, "#dropdown2");
  // plot_data(sa30Arr, "#dropdown3")
  }
}

var eventid = getURLParameter('eventid');

stationList();
