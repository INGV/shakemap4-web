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
// Open the static map view
//
function open_static() {
  window.location = './view.html?eventid=' + eventid;
}

// #####################################################
// Open the download page for event
//
function open_download() {
  window.location = './downloadPage.html?eventid=' + eventid;
}

// #####################################################
// Open the Analysis page for event
//
function open_analysis() {
  window.location = './viewAnalysis.html?eventid=' + eventid + '&eventyear=' + eventYear;
}

// #####################################################
// Open the MetaData page for event
//
function open_meta() {
  window.location = './metaDataPage.html?eventid=' + eventid;
}

// #####################################################
// Open the StationList page for event
//
function open_stations() {
  window.location = './stationList.html?eventid=' + eventid + '&eventyear=' + eventYear;
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

    control.addOverlay(stations_layer, 'Show stations');
    stations_layer.addTo(mymap);
  }
}

// ##################################################
// Show DYFI observations
function dyfiList() {
  $.getJSON(
    './data/' + eventid + '/current/products/stationlist.json',
    function(json) {
      var stations = json.features;
      show_dyfi(stations);
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

    control.addOverlay(dyfi_layer, 'Show DYFI observations');
    // dyfi_layer.addTo(mymap);
  }
}
// ##################################################
// Show event title above the map
function ev_title(desc, or_time, magnitude, lat, lon, depth) {
  or_time = new Date(Date.parse(or_time));
  document.getElementById('evInfo').innerHTML += 'ShakeMap:' + desc + '<br/>'
      + or_time.toUTCString() + ' '  + Number(magnitude).toFixed(1) + ' ' + Number(lat).toFixed(2) + ' ' + Number(lon).toFixed(2)
        + ' Depth:' + Number(depth).toFixed(1) + ' km ID:' + eventid;
};
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
    desc = info_input.event_description;
    or_time = info_input.origin_time;
    eventYear = info_input.origin_time.substring(0,4);
    // attr_div(info_input, 'input_content');
    // attr_div(json.output.uncertainty, 'motions_content');
    // attr_div(json.processing.ground_motion_modules, 'processing_content');

    ev_title(desc, or_time, magnitude, epi_lat, epi_lon, depth);

    show_epi(epi_lat, epi_lon, magnitude, depth);
  });

  function show_epi(latitude, longitude, magnitude, depth) {
    mymap.setView(new L.LatLng(latitude, longitude), 8);

    var pulsingIcon = L.icon.pulse({
      iconSize: [4, 4],
      color: 'black',
      heartbeat: 3,
    });

    L.marker([latitude, longitude], {
      icon: pulsingIcon
    })
      .addTo(mymap);

    var thisIcon = new L.Icon({
        iconUrl: '../images/epicenterIconStar.png',
        iconSize: [16, 16], // [x, y] in pixels
        iconAnchor: [8, 8]
    });

    L.marker([latitude, longitude], {
      icon: thisIcon
    })
      .addTo(mymap)
      .bindPopup('Latitude:' + latitude + '° <br/>Longitude: ' + longitude +
        '° <br/>Magnitude: ' + magnitude + '<br/>Depth: ' + depth + ' km');


  };


}

// ##################################################
// Function call to show contours of PGA, PGV and PSAs on the map

function show_contours(fileName, layerName) {
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

    control.addBaseLayer(contours_layer, layerName);
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

  function plot_int (intensities) {
    var intensity_layer = L.geoJSON(intensities, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'Intensity: ' + feature.properties.value;
        layer.bindPopup(popupContent);
      },
      style: function(feature) {
        return {
          color: feature.properties.color,
          weight: 8 / feature.properties.weight, // weights are lower for integer values of intensity in the shakemap output, so here it's reversed to have the weights in integer values higher
          dashArray: lineStyle[feature.properties.value % 1]
        };
      }
    }).addTo(mymap);

    control.addBaseLayer(intensity_layer, 'Intensity-contour');
  }
}

// #######################################################
// Show raster intensity overlay

function intensityOverlay() {
  var imgIntHelper = new Image();

  var height = 0;
  var width = 0;

  var imagePath = './data/' + eventid + '/current/products/intensity_overlay.png';
  // var fileIntensity = './data/' + eventid + '/current/products/intensity_overlay.pngw'

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
          {opacity: 0.3}
        );

        control.addOverlay(overlayLayer, 'Intensity-overlay');
        // console.log(imageBounds)
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
      var widthSize = 0.375 * $(window).width();
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

  L.control.watermark({ position: 'bottomleft' }).addTo(mymap);
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

L.control.scale({
  position: 'bottomright'
}).addTo(mymap);

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

var eventYear = 3000;
event_info();

show_intensity();
show_contours('cont_pga.json', 'PGA');
show_contours('cont_pgv.json', 'PGV');
show_contours('cont_psa0p3.json', 'PSA 0.3 s');
show_contours('cont_psa1p0.json', 'PSA 1.0 s');
show_contours('cont_psa3p0.json', 'PSA 3.0 s');
stationList();
dyfiList();
faultSurface();
intensityOverlay();
legend_box();


// var sidebar = L.control.sidebar('sidebar').addTo(mymap);
