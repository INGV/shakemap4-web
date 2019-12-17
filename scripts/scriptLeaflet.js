// ##################################################
// Get event ID from URL
function getURLParameter(name) {
  return (
    decodeURIComponent(
      (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(
        location.search
      ) || [null, ''])[1].replace(/\+/g, '%20')
    ) || null
  );
}

var eventid = getURLParameter('eventid');

// #####################################################
// Open the double map view
//
function open_double() {
  window.location = './viewLeaflet2.html?eventid=' + eventid;
}

// #####################################################
// Write json attributes to a div

function attr_div(attr_collection, div_id) {
  var content = '';
  try {
    Object.keys(attr_collection).forEach(function(key) {
      if (attr_collection[key].hasOwnProperty('module')) {
        content +=
          '<b>' +
          key +
          ' module:</b> ' +
          attr_collection[key]['module'] +
          '<br/>';

      } else {
        content += '<b>' + key + ':</b> ' + attr_collection[key] + '<br/>';
      }
    });
    document.getElementById(div_id).innerHTML = content;
  } catch (err) {
    console.log(err)
  }
}

// ##################################################
// Show fault
function faultSurface() {
  $.getJSON('./data/' + eventid + '/current/products/rupture.json', function(
    json
  ) {
    var fault = json.features;
    show_fault(fault);
  });

  function show_fault(fault) {
    // Show fault only if there is more than one point in rupture.json
    if (fault[0].geometry.coordinates[0].constructor === Array) { //check if the fault is an array or a scalar
      var faultLayer = L.geoJSON(fault);
      control.addOverlay(faultLayer, 'Show fault');
    }
  }
}

// ##################################################
// Show stations
function stationList() {
  $.getJSON(
    './data/' + eventid + '/current/products/stationlist.json',
    function(json) {
      var stations = json.features;
      show_stations(stations);
    }
  );

  function show_stations (stations) {
    var stations_layer = L.geoJSON (stations, {
      pointToLayer: function (feature, latlng) {
        return new L.shapeMarker (latlng, {
          fillColor: 'black',
          color: stationColors[feature.properties.network] || 'blue',
          shape: 'triangle',
          radius: 5
        });
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(
          'Station: ' +
          feature.properties.code +
          '<br/>Network: ' +
          feature.properties.network +
          '<br/>Distance: ' +
          feature.properties.distance +
          '<br/>Intensity: ' +
          feature.properties.intensity +
          '<br/>PGA: ' +
          feature.properties.pga +
          '<br/>PGV: ' +
          feature.properties.pgv +
          '<br/>Vs30: ' +
          feature.properties.vs30
        );
      }
    });

    control.addOverlay(stations_layer, 'Show stations');
  }
}

// ##################################################
// Show epicenter and write info in sidebar
function event_info() {
  $.getJSON('./data/' + eventid + '/current/products/info.json', function(
    json
  ) {
    var info_input = json.input.event_information;
    epi_lat = info_input.latitude;
    epi_lon = info_input.longitude;

    magnitude = info_input.magnitude;
    depth = info_input.depth;

    attr_div(info_input, 'input_content');
    attr_div(json.output.uncertainty, 'motions_content');
    attr_div(json.processing.ground_motion_modules, 'processing_content');



    show_epi(epi_lat, epi_lon, magnitude, depth);
  });

  function show_epi(latitude, longitude, magnitude, depth) {
    mymap.setView(new L.LatLng(latitude, longitude), 8);

    // options = {
    //   html: '<i class="material-icons epi_icon">star</i>'
    // };

    var pulsingIcon = L.icon.pulse({
      iconSize: [10, 10],
      color: 'red',
      heartbeat: 3
    });

    L.marker([latitude, longitude], {
      icon: pulsingIcon
    })
      .addTo(mymap)
      .bindPopup('Latitude:' + latitude + '° <br/>Longitude: ' + longitude +
        '° <br/>Magnitude: ' + magnitude + '<br/>Depth: ' + depth + ' km');

    // epi.bindPopup("Latitude: <br/>Longitude: ");
  }
}

// ##################################################
// Function call to show pga contours on the map

function show_pga() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_pga.json',
    function(json) {
      var pga = json.features;
      plot_pga(pga);
    }
  );

  function plot_pga(pga) {
    var layers_combined = L.layerGroup([L.geoJSON(pga)]);
    var pga_layer = L.geoJSON(pga, {
      onEachFeature: function(feature, layer) {
        for (i = 0; i < feature.geometry.coordinates.length; i++) {
          for (j = 0; j < feature.geometry.coordinates[i].length; j++) {
            if (j % 50 == 0) {
              var marker = L.circleMarker(
                [
                  feature.geometry.coordinates[i][j][1],
                  feature.geometry.coordinates[i][j][0]
                ], {
                  fillColor: '#f03',
                  fillOpacity: 0,
                  radius: 0.1
                }
              ).bindTooltip(feature.properties.value.toString() + ' %g', {
                permanent: true,
                direction: 'center',
                className: 'my-labels'
              });
              layers_combined.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(layers_combined, 'PGA');
  }
}

// ##################################################
// Function call to show pgv contours on the map

function show_pgv() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_pgv.json',
    function(json) {
      var pgv = json.features;
      plot_pgv(pgv);
    }
  );

  function plot_pgv(pgv) {
    var layers_combined = L.layerGroup([L.geoJSON(pgv)]);
    var pgv_layer = L.geoJSON(pgv, {
      onEachFeature: function(feature, layer) {
        for (i = 0; i < feature.geometry.coordinates.length; i++) {
          for (j = 0; j < feature.geometry.coordinates[i].length; j++) {
            if (j % 50 == 0) {
              var marker = L.circleMarker(
                [
                  feature.geometry.coordinates[i][j][1],
                  feature.geometry.coordinates[i][j][0]
                ], {
                  fillColor: '#f03',
                  fillOpacity: 0,
                  radius: 0.1
                }
              ).bindTooltip(feature.properties.value.toString() + ' cm/s', {
                permanent: true,
                direction: 'center',
                className: 'my-labels'
              });
              layers_combined.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(layers_combined, 'PGV');
  }
}

// ##################################################
// Function call to show PSA 0.3 contours on the map

function show_psa0p3() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_psa0p3.json',
    function(json) {
      var psa0p3 = json.features;
      plot_psa0p3(psa0p3);
    }
  );

  function plot_psa0p3(psa0p3) {
    var layers_combined = L.layerGroup([L.geoJSON(psa0p3)]);
    var psa0p3_layer = L.geoJSON(psa0p3, {
      onEachFeature: function(feature, layer) {
        for (i = 0; i < feature.geometry.coordinates.length; i++) {
          for (j = 0; j < feature.geometry.coordinates[i].length; j++) {
            if (j % 50 == 0) {
              var marker = L.circleMarker(
                [
                  feature.geometry.coordinates[i][j][1],
                  feature.geometry.coordinates[i][j][0]
                ], {
                  fillColor: '#f03',
                  fillOpacity: 0,
                  radius: 0.1
                }
              ).bindTooltip(feature.properties.value.toString() + ' %g', {
                permanent: true,
                direction: 'center',
                className: 'my-labels'
              });
              layers_combined.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(layers_combined, 'PSA 0.3');
  }
}

// ##################################################
// Function call to show PSA 1.0 contours on the map

function show_psa1p0() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_psa1p0.json',
    function(json) {
      var psa1p0 = json.features;
      plot_psa1p0(psa1p0);
    }
  );

  function plot_psa1p0(psa1p0) {
    var layers_combined = L.layerGroup([L.geoJSON(psa1p0)]);
    var psa1p0_layer = L.geoJSON(psa1p0, {
      onEachFeature: function(feature, layer) {
        for (i = 0; i < feature.geometry.coordinates.length; i++) {
          for (j = 0; j < feature.geometry.coordinates[i].length; j++) {
            if (j % 50 == 0) {
              var marker = L.circleMarker(
                [
                  feature.geometry.coordinates[i][j][1],
                  feature.geometry.coordinates[i][j][0]
                ], {
                  fillColor: '#f03',
                  fillOpacity: 0,
                  radius: 0.1
                }
              ).bindTooltip(feature.properties.value.toString() + ' %g', {
                permanent: true,
                direction: 'center',
                className: 'my-labels'
              });
              layers_combined.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(layers_combined, 'PSA 1.0 s');
  }
}

// ##################################################
// Function call to show PSA 3.0 contours on the map

function show_psa3p0() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_psa3p0.json',
    function(json) {
      var psa3p0 = json.features;
      plot_psa3p0(psa3p0);
    }
  );

  function plot_psa3p0(psa3p0) {
    var layers_combined = L.layerGroup([L.geoJSON(psa3p0)]);
    var psa3p0_layer = L.geoJSON(psa3p0, {
      onEachFeature: function(feature, layer) {
        for (i = 0; i < feature.geometry.coordinates.length; i++) {
          for (j = 0; j < feature.geometry.coordinates[i].length; j++) {
            if (j % 50 == 0) {
              var marker = L.circleMarker(
                [
                  feature.geometry.coordinates[i][j][1],
                  feature.geometry.coordinates[i][j][0]
                ], {
                  fillColor: '#f03',
                  fillOpacity: 0,
                  radius: 0.1
                }
              ).bindTooltip(feature.properties.value.toString() + ' %g', {
                permanent: true,
                direction: 'center',
                className: 'my-labels'
              });
              layers_combined.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(layers_combined, 'PSA 3.0 s');
  }
}

// #########################################################
// Function call to show Intensity contours on the map
function show_intensity() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_mmi.json',
    function(json) {
      var intensity = json.features;
      plot_int(intensity);
    }
  );

  function plot_int(intensities) {
    var intensity_layer = L.geoJSON(intensities, {
      onEachFeature: function(feature, layer) {
        var popupContent = "Intensity: " + feature.properties.value;
        layer.bindPopup(popupContent)
      },
      style: function(feature) {
        return {
          color: intColors[feature.properties.value] || '#FFFFFF',
          weight: intWeights[feature.properties.value % 1],
          dashArray: lineStyle[feature.properties.value % 1]
        }
      }
    }).addTo(mymap);

    control.addBaseLayer(intensity_layer, 'Intensity-contour');
  }
}

// #######################################################
// Loading raster intensity file

function intensityOverlay() {
  var imgIntHelper = new Image();

  var height = 0;
  var width = 0;

  var imagePath = './data/' + eventid + '/current/products/intensity_overlay.png'
  var fileIntensity = './data/' + eventid + '/current/products/intensity_overlay.pngw'

  $.getJSON('./data/' + eventid + '/current/products/overlay.json',
    function(json) {
      imgIntHelper.onload = function() {
        height = imgIntHelper.height;
        width = imgIntHelper.width;

        var lower_right_x = json['dx'] * width + json['upper_left_x'];
        var lower_right_y = json['dy'] * height + json['upper_left_y'];

        var imageBounds = [[json['upper_left_y'], json['upper_left_x']],
                            [lower_right_y, lower_right_x]];

        overlayLayer = L.imageOverlay(imagePath, imageBounds,
          {opacity: 0.4}
        );

        control.addBaseLayer(overlayLayer, 'Intensity-overlay');
        // console.log(imageBounds)
      }
      imgIntHelper.src = imagePath;
    }
  );
}

// #######################################################
// Drawing the map
// #####################################################

var mymap = L.map('mapid', {
  zoomControl: false
});

var myMapIndex = {
  Map: mymap
};

var control = L.control.layers();
control.addTo(mymap);

L.control
  .zoom({
    position: 'bottomright'
  })
  .addTo(mymap);

// #####################################################
//  Map used for background


var Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(mymap);


event_info();
show_intensity();
show_pga();
show_pgv();
show_psa0p3();
show_psa1p0();
show_psa3p0();
stationList();
faultSurface();
intensityOverlay();

var sidebar = L.control.sidebar('sidebar').addTo(mymap);
