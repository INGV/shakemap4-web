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
function plot_data (data, regrArr, comp_id) {

  var div_id = '#' + comp_id;
  var predID = comp_id + 'Prediction';
  var stdID = comp_id + 'Std';

  // Calculate standard deviation array
  var stdArr = regrArr.map(function(item) { return {[stdID]:item[stdID], "distance":item.distance}; });
  var stdArrRev = stdArr.map(a => Object.assign({}, a));
  stdArrRev =  stdArrRev.reverse();
  for (var i=0; i<stdArrRev.length; i++) {
      if (stdID == 'intensityStd') {
        stdArr[i][stdID] = regrArr[i][comp_id]+stdArr[i][stdID];

        stdArrRev[i][stdID] = regrArr[stdArrRev.length-1-i][comp_id]-stdArrRev[i][stdID];
      } else {
      stdArr[i][stdID] = regrArr[i][comp_id]*stdArr[i][stdID];

      stdArrRev[i][stdID] = regrArr[stdArrRev.length-1-i][comp_id]/stdArrRev[i][stdID];
      };
      stdArr.push(stdArrRev[i]);
    };

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


// Define axes domains
  var distance_max = Math.max(...data.map(o => o.distance), 0)
  var distance_minData = Math.min(...data.map(o => o.distance), distance_max)

  var distance_min = 1;
  if (distance_minData < 1) {
    distance_min = 1;
  } else if (distance_minData < 10){
    distance_min = distance_minData-1;
  } else {
    distance_min = Math.floor(distance_minData/10)*10;
  };

  console.log(distance_minData);
  console.log(distance_min);

  var yMax = Math.max(...data.map(o => o[comp_id]), 0);
  var yMin = Math.min(...data.map(o => o[comp_id]), yMax);

  var stdMax = Math.max(...stdArr.map(o => o[stdID]), 0);
  var stdMin = Math.min(...stdArr.map(o => o[stdID]), stdMax);

  if (stdMax > yMax) {
    yMax = stdMax;
  };
  if (stdMin < yMin) {
    yMin = stdMin;
  };

  x.domain([Math.round(distance_min), distance_max]);
  y.domain([yMin-0.1*yMin, yMax+0.1*yMax]);


// Regression plot

var regrStdLine = d3.line()
    .x(function(d) { return x(d.distance); })
    .y(function(d) { return y(d[stdID]); });

svg.append("path")
    .data([stdArr])
    .attr("class", "line")
    .attr("stroke", "#E0D6E0")
    .attr("stroke-width", 4)
    .attr("fill", "#E0D6E0")
    .attr('r', 2)
    .attr("d", regrStdLine);


var regrLine = d3.line()
    .x(function(d) { return x(d.distance); })
    .y(function(d) { return y(d[comp_id]); });

  svg.append("path")
    .data([regrArr])
    .attr("class", "line")
    .attr("stroke", "#A971A8")
    .attr("stroke-width", 4)
    .attr("fill", "none")
    .attr('r', 2)
    .attr("d", regrLine);


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
     .attr("width", 140)
     .attr("height", 58)
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

  svg.append("rect")
    .attr("transform","translate(" + (width-width*0.207).toString() + ", 27)" )
    .style("fill", "#A971A8")
    .attr("width", 20)
    .attr("height", 4);

  // svg.append("circle").attr("cx", width-width*0.2).attr("cy", 30).attr("r", 6).style("fill", "#808080").style("stroke", "#000000");
  svg.append("text").attr("x", width-width*0.18).attr("y", 10).text("Observed").style("font-size", "15px").attr("alignment-baseline","middle");
  svg.append("text").attr("x", width-width*0.18).attr("y", 30).text("Predicted").style("font-size", "15px").attr("alignment-baseline","middle");
  svg.append("text").attr("x", width-width*0.18).attr("y", 45).text("(+/- 1 std dev)").style("font-size", "15px").attr("alignment-baseline","middle");


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
// Get regression curve
//
function getRegression (obsArr) {
  $.getJSON(
    './data/' + eventid + '/current/products/attenuation_curves.json',
    function(json) {
      var regrPoints = json;
      return_data(regrPoints, obsArr);
    }
  );
  function return_data(regrPoints, obsArr) {
    var regrArr = [];

    var distance_min = Math.min(...obsArr.map(o => o.distance), 300);
    var pga_min = Math.min(...obsArr.map(o => o.pga), 0.0098);
    var pgv_min = Math.min(...obsArr.map(o => o.pgv), 0.00098);

    for (var i=0; i<regrPoints['distances']['repi'].length; i++) {
      if (regrPoints['distances']['repi'][i]  < 301
            && regrPoints['distances']['repi'][i] > distance_min
            && (100*Math.exp(regrPoints['gmpe']['rock']['PGA']['mean'][i])) > pga_min
            && (Math.exp(regrPoints['gmpe']['rock']['PGV']['mean'][i])) > pgv_min
            ) {
        regrArr.push({
                      distance:regrPoints['distances']['repi'][i],
                      intensity:regrPoints['gmpe']['rock']['MMI']['mean'][i],
                      intensityStd:regrPoints['gmpe']['rock']['MMI']['stddev'][i],
                      pga:100*Math.exp(regrPoints['gmpe']['rock']['PGA']['mean'][i]),
                      pgaStd:Math.exp(regrPoints['gmpe']['rock']['PGA']['stddev'][i]),
                      pgv:Math.exp(regrPoints['gmpe']['rock']['PGV']['mean'][i]),
                      pgvStd:Math.exp(regrPoints['gmpe']['rock']['PGV']['stddev'][i])});
        };

      };

      plot_data(clean_array(obsArr, 'intensity'),  clean_array(regrArr, 'intensity'), 'intensity');
      plot_data(clean_array(obsArr, 'pga'),  clean_array(regrArr, 'pga'), 'pga');
      plot_data(clean_array(obsArr, 'pgv'),  clean_array(regrArr, 'pgv'), 'pgv');
}
}
// #####################################################
// Get stationList
//

function getPredictedValue(component, predictions) {
  for (var i=0; i<predictions.length; i++) {
    if (predictions[i].name == component) {
      return predictions[i].value;
    };
  };
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
    }
  );
  function return_data(stations) {
    var objArr = [];
    for (var i=0; i<stations.length; i++) {
      if (stations[i].properties.distance  < 301
            && stations[i].properties.distance > 1
            && stations[i].properties.pga > 0.0098
            && stations[i].properties.pgv > 0.00098) {
        objArr.push({ id: stations[i].id,
                      distance:stations[i].properties.distance,
                      intensity:stations[i].properties.intensity,
                      pga:stations[i].properties.pga,
                      pgv:stations[i].properties.pgv,
                      color:intColors[Math.round(stations[i].properties.intensity)],
                      intensityPrediction:getPredictedValue('mmi', stations[i].properties.predictions),
                      pgaPrediction:getPredictedValue('pga', stations[i].properties.predictions),
                      pgvPrediction:getPredictedValue('pgv', stations[i].properties.predictions)
                    });
        };
      };
    getRegression(objArr);

  }
}

var eventid = getURLParameter('eventid');

stationList();
