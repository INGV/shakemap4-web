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
function open_single() {
  window.location = './viewLeaflet.html?eventid=' + eventid;
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
function faultSurface(controlName) {
  $.getJSON('./data/' + eventid + '/current/products/rupture.json', function(
    json
  ) {
    var fault = json.features;
    show_fault(fault);
  });

  function show_fault(fault) {
    if (fault[0].geometry.coordinates[0].constructor === Array) {
      var faultLayer = L.geoJSON(fault);
      controlName.addOverlay(faultLayer, 'Show fault');
    }
  }
}

// ##################################################
// Show stations
function stationList(mapName, controlName, showOnMap) {
  $.getJSON(
    './data/' + eventid + '/current/products/stationlist.json',
    function(json) {
      var stations = json.features;
      show_stations(stations, controlName);
    }
  );

  function show_stations(stations) {
    var stations_layer = L.geoJSON(stations, {
      pointToLayer: function (feature, latlng) {
        if (feature.properties.station_type == 'seismic') {
          if (feature.properties.intensity < 5) {
            var result = feature.properties.mmi_from_pgm.filter(obj => {
              return obj.name === 'pga';
            });
            var stationColor = Math.round(result[0].value);
          } else if (feature.properties.intensity >= 5) {
            var result = feature.properties.mmi_from_pgm.filter(obj => {
              return obj.name === 'pgv';
            });
            var stationColor = Math.round(result[0].value);
          } else {
            var stationWidth = 1;
            var stationRadius = 3;
          }
          var stationShape = 'triangle';
          return new L.shapeMarker (latlng, {
            fillColor: 'black',
            color: intColors_USGS[stationColor] || 'black',
            shape: 'triangle',
            radius: stationRadius || 5,
            weight: stationWidth || 3
          });
        };
      },
      onEachFeature: function(feature, layer) {
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

    controlName.addOverlay(stations_layer, 'Show stations');
    if (showOnMap == true) {
      stations_layer.addTo(mapName);
    }
  }
}

// ##################################################
// Show DYFI observations
function dyfiList(controlName) {
  $.getJSON(
    './data/' + eventid + '/current/products/stationlist.json',
    function(json) {
      var stations = json.features;
      show_dyfi(stations, controlName);
    }
  );

  function show_dyfi (stations) {
    var dyfi_layer = L.geoJSON (stations, {
      pointToLayer: function (feature, latlng) {
        if (feature.properties.station_type == 'macroseismic') {
           var stationShape = 'circle';
           var stationColor = Math.round(feature.properties.intensity)
          return new L.shapeMarker (latlng, {
            fillColor: 'black',
            color: intColors_USGS[stationColor] || 'black',
            shape: 'circle',
            radius: 4,
            weight: 2
          });
        };
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(
          'Station: ' +
          feature.properties.code +
          '<br/>Network: ' +
          feature.properties.network +
          '<br/>Distance: ' +
          feature.properties.distance +
          ' km <br/>Intensity: ' +
          feature.properties.intensity +
          '<br/>PGA: ' +
          feature.properties.pga +
          '<br/>PGV: ' +
          feature.properties.pgv +
          '<br/>Vs30: ' +
          feature.properties.vs30 +
          ' m/s'
        );
      }
    });

    controlName.addOverlay(dyfi_layer, 'Show DYFI observations');
    // dyfi_layer.addTo(mapName);
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

    // attr_div(info_input, 'input_content');
    // attr_div(json.output.uncertainty, 'motions_content');
    // attr_div(json.processing.ground_motion_modules, 'processing_content');
    //

    show_epi(epi_lat, epi_lon, magnitude, depth);
  });

  function show_epi(latitude, longitude, magnitude, depth) {
    map1.setView(new L.LatLng(latitude, longitude), 8);
    map2.setView(new L.LatLng(latitude, longitude), 8);

    // synchronise maps to zoom in and out together
    map1.sync(map2);
    map2.sync(map1);

    var pulsingIcon = L.icon.pulse({
      iconSize: [4, 4],
      color: 'black',
      heartbeat: 3
    });

    L.marker([latitude, longitude], {
        icon: pulsingIcon
      })
      .addTo(map1);

    L.marker([latitude, longitude], {
        icon: pulsingIcon
      })
      .addTo(map2);

    var starIcon = new L.Icon({
          iconUrl: '../images/epicenterIconStar.png',
          iconSize: [16, 16], // [x, y] in pixels
          iconAnchor: [8, 8]
      });

    L.marker([latitude, longitude], {
        icon: starIcon
      })
        .addTo(map1)
        .bindPopup('Latitude:' + latitude + '° <br/>Longitude: ' + longitude +
          '° <br/>Magnitude: ' + magnitude + '<br/>Depth: ' + depth + ' km');


    L.marker([latitude, longitude], {
      icon: starIcon
    })
      .addTo(map2)
      .bindPopup('Latitude:' + latitude + '° <br/>Longitude: ' + longitude +
        '° <br/>Magnitude: ' + magnitude + '<br/>Depth: ' + depth + ' km');

  }
}

// ##################################################
// Function to show contours of PGA, PGV and PSAs on the map

function show_contours(fileName, layerName, controlName, asPrimaryLayer) {
  $.getJSON(
    './data/' + eventid + '/current/products/' + fileName,
    function(json) {
      var contours = json.features;
      plot_contours(contours);
    }
  );

  function plot_contours(contours) {
    var unit = ' %g';
    if (layerName == 'PGV') {
      unit = ' cm/s'
    };
    var contours_layer = L.layerGroup([L.geoJSON(contours, {
      onEachFeature: function (feature, layer) {
        var popupContent = layerName + ': ' + feature.properties.value.toString() + unit;
        layer.bindPopup(popupContent);
      },
      style: function (feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(contours, {
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
              ).bindTooltip(feature.properties.value.toString() + unit, {
                permanent: true,
                direction: 'center',
                className: 'my-labels'
              });
              contours_layer.addLayer(marker);
            }
          }
        }
      }
    });

    if (asPrimaryLayer == true) {
      contours_layer.addTo(map2);
    };
    controlName.addBaseLayer(contours_layer, layerName);
  }
}



// #########################################################
// Function call to show Intensity contours on the map

function show_intensity(controlName, asPrimaryLayer) {
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
          color: feature.properties.color,
          weight: 8 / feature.properties.weight, // weights are lower for integer values of intensity in the shakemap output, so here it's reversed to have the weights in integer values higher
          dashArray: lineStyle[feature.properties.value % 1]
        }
      }
    });

    if (asPrimaryLayer == true) {
      intensity_layer.addTo(map1)
    }
    controlName.addBaseLayer(intensity_layer, 'Intensity-contour');
  }
}

// #######################################################
// Loading raster intensity file
function intensityOverlay(controlName) {
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

        controlName.addOverlay(overlayLayer, 'Intensity-overlay');
      }
      imgIntHelper.src = imagePath;
    }
  );
}
// #######################################################
// Add legend to lower left corner of the map

function legend_box() {
  L.Control.Watermark = L.Control.extend({
    onAdd: function(map) {
      var img = L.DomUtil.create('img');

      img.src = './data/' + eventid + '/current/products/mmi_legend.png';
      // img.style.width = '70%';
      var widthSize = 0.25 * $(window).width();
      img.style.width =  widthSize.toString() + 'px';
      return img;
  },

    onRemove: function(map) {
      // Nothing to do here
    }
  });

  L.control.watermark = function(opts) {
    return new L.Control.Watermark(opts);
  }

  L.control.watermark({ position: 'bottomleft' }).addTo(map1);
}


// #######################################################
// Drawing the map
// #####################################################

var map1 = L.map('map1', {
  zoomControl: false
});
var map2 = L.map('map2', {
  zoomControl: false
});

var map1Index = {
  Map: map1
};

var map2Index = {
  Map: map2
};

var control = L.control.layers();
control.addTo(map1);

var control2 = L.control.layers();
control2.addTo(map2);

var Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map1);

var Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map2);

L.control.scale({
  position: 'bottomright'
}).addTo(map1);

L.control.scale({
  position: 'bottomright'
}).addTo(map2);

L.control
  .zoom({
    position: 'bottomright'
  })
  .addTo(map2);

event_info();
show_intensity(control, true);
intensityOverlay(control);
show_contours('cont_pga.json', 'PGA', control, false);
show_contours('cont_pgv.json', 'PGV', control, false);
show_contours('cont_psa0p3.json', 'PSA 0.3 s', control, false);
show_contours('cont_psa1p0.json', 'PSA 1.0 s', control, false);
show_contours('cont_psa3p0.json', 'PSA 3.0 s', control, false);
stationList(map1, control, true);
dyfiList(control);
faultSurface(control);
legend_box();

show_intensity(control2, false);
intensityOverlay(control2);
show_contours('cont_pga.json', 'PGA', control2, true);
show_contours('cont_pgv.json', 'PGV', control2, false);
show_contours('cont_psa0p3.json', 'PSA 0.3 s', control2, false);
show_contours('cont_psa1p0.json', 'PSA 1.0 s', control2, false);
show_contours('cont_psa3p0.json', 'PSA 3.0 s', control2, false);
stationList(map2, control2, false);
dyfiList(control2);
faultSurface(control2);

// var sidebar = L.control.sidebar('sidebar').addTo(map1);
