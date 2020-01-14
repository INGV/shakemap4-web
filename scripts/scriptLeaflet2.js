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
function faultSurface() {
  $.getJSON('./data/' + eventid + '/current/products/rupture.json', function(
    json
  ) {
    var fault = json.features;
    show_fault(fault);
  });

  function show_fault(fault) {
    if (fault[0].geometry.coordinates[0].constructor === Array) {
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

  function show_stations(stations) {
    var stations_layer = L.geoJSON(stations, {
      pointToLayer: function(feature, latlng) {
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
        return new L.shapeMarker (latlng, {
          fillColor: 'black',
          color: intColors_USGS[stationColor] || 'black',
          shape: 'triangle',
          radius: stationRadius || 5,
          weight: stationWidth || 3
        });
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

    attr_div(info_input, 'input_content');
    attr_div(json.output.uncertainty, 'motions_content');
    attr_div(json.processing.ground_motion_modules, 'processing_content');

    console.log(json);

    show_epi(epi_lat, epi_lon, magnitude);
  });

  function show_epi(latitude, longitude, magnitude) {
    map1.setView(new L.LatLng(latitude, longitude), 8);
    map2.setView(new L.LatLng(latitude, longitude), 8);

    // synchronise maps to zoom in and out together
    map1.sync(map2);
    map2.sync(map1);

    var pulsingIcon = L.icon.pulse({
      iconSize: [10, 10],
      color: 'red',
      heartbeat: 3
    });

    L.marker([latitude, longitude], {
        icon: pulsingIcon
      })
      .addTo(map1)
      .bindPopup('Latitude:' + latitude + ' <br/>Longitude: ' + longitude + '<br/>Magnitude:' + magnitude);

    L.marker([latitude, longitude], {
        icon: pulsingIcon
      })
      .addTo(map2)
      .bindPopup('Latitude:' + latitude + ' <br/>Longitude: ' + longitude + '<br/>Magnitude:' + magnitude);
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
    var pga_layer = L.layerGroup([L.geoJSON(pga, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PGA: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function(feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(pga, {
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
              pga_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(pga_layer, 'PGA');
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
    var pgv_layer = L.layerGroup([L.geoJSON(pgv, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PGV: ' + feature.properties.value.toString() + ' cm/s';
        layer.bindPopup(popupContent);
      },
      style: function(feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(pgv, {
      onEachFeature: function (feature, layer) {
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
              pgv_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(pgv_layer, 'PGV');
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
    var psa0p3_layer = L.layerGroup([L.geoJSON(psa0p3, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PSA 0.3: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function (feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(psa0p3, {
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
              psa0p3_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(psa0p3_layer, 'PSA 0.3');
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
    var psa1p0_layer = L.layerGroup([L.geoJSON(psa1p0, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PSA 0.3: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function (feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(psa1p0, {
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
              psa1p0_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(psa1p0_layer, 'PSA 1.0 s');
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
    var psa3p0_layer = L.layerGroup([L.geoJSON(psa3p0, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PSA 0.3: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function (feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(psa3p0, {
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
              psa3p0_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control.addBaseLayer(psa3p0_layer, 'PSA 3.0 s');
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
          color: feature.properties.color,
          weight: 8 / feature.properties.weight, // weights are lower for integer values of intensity in the shakemap output, so here it's reversed to have the weights in integer values higher
          dashArray: lineStyle[feature.properties.value % 1]
        }
      }
    }).addTo(map1);

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
// ############################################################################
// ##############
// Loading layers for map 2
// ###############
// ############################################################################

function show_pga2() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_pga.json',
    function(json) {
      var pga = json.features;
      plot_pga(pga);
    }
  );

  function plot_pga(pga) {
    var pga_layer = L.layerGroup([L.geoJSON(pga, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PGA: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function(feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(pga, {
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
              pga_layer.addLayer(marker);
            }
          }
        }
      }
    });

    pga_layer.addTo(map2);
    control2.addBaseLayer(pga_layer, 'PGA');
  }
}

// ##################################################
// Function call to show pgv contours on the map

function show_pgv2() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_pgv.json',
    function(json) {
      var pgv = json.features;
      plot_pgv(pgv);
    }
  );

  function plot_pgv(pgv) {
    var pgv_layer = L.layerGroup([L.geoJSON(pgv, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PGV: ' + feature.properties.value.toString() + ' cm/s';
        layer.bindPopup(popupContent);
      },
      style: function(feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(pgv, {
      onEachFeature: function (feature, layer) {
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
              pgv_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control2.addBaseLayer(pgv_layer, 'PGV');
  }
}

// ##################################################
// Function call to show PSA 0.3 contours on the map

function show_psa0p32() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_psa0p3.json',
    function(json) {
      var psa0p3 = json.features;
      plot_psa0p3(psa0p3);
    }
  );

  function plot_psa0p3(psa0p3) {
    var psa0p3_layer = L.layerGroup([L.geoJSON(psa0p3, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PSA 0.3: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function (feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(psa0p3, {
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
              psa0p3_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control2.addBaseLayer(psa0p3_layer, 'PSA 0.3');
  }
}

// ##################################################
// Function call to show PSA 1.0 contours on the map

function show_psa1p02() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_psa1p0.json',
    function(json) {
      var psa1p0 = json.features;
      plot_psa1p0(psa1p0);
    }
  );

  function plot_psa1p0(psa1p0) {
    var psa1p0_layer = L.layerGroup([L.geoJSON(psa1p0, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PSA 0.3: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function (feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(psa1p0, {
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
              psa1p0_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control2.addBaseLayer(psa1p0_layer, 'PSA 1.0 s');
  }
}

// ##################################################
// Function call to show PSA 3.0 contours on the map

function show_psa3p02() {
  $.getJSON(
    './data/' + eventid + '/current/products/cont_psa3p0.json',
    function(json) {
      var psa3p0 = json.features;
      plot_psa3p0(psa3p0);
    }
  );

  function plot_psa3p0(psa3p0) {
    var psa3p0_layer = L.layerGroup([L.geoJSON(psa3p0, {
      onEachFeature: function (feature, layer) {
        var popupContent = 'PSA 0.3: ' + feature.properties.value.toString() + ' %g';
        layer.bindPopup(popupContent);
      },
      style: function (feature) {
        return {
          color: feature.properties.color,
          weight: feature.properties.weight
        };
      }
    })]);

    var marker_layer = L.geoJSON(psa3p0, {
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
              psa3p0_layer.addLayer(marker);
            }
          }
        }
      }
    });

    control2.addBaseLayer(psa3p0_layer, 'PSA 3.0 s');
  }
}

// #########################################################
// Function call to show Intensity contours on the map

function show_intensity2() {
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

    control2.addBaseLayer(intensity_layer, 'Intensity-contour');
  }
}

// #######################################################
// Loading raster intensity file
function intensityOverlay2() {
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

        control2.addBaseLayer(overlayLayer, 'Intensity-overlay');
        // console.log(imageBounds)
      }
      imgIntHelper.src = imagePath;
    }
  );
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
}).addTo(map2);

L.control
  .zoom({
    position: 'bottomright'
  })
  .addTo(map2);

  var Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  }).addTo(map1);

event_info();
show_intensity();
intensityOverlay();
show_pga();
show_pgv();
show_psa0p3();
show_psa1p0();
show_psa3p0();
stationList();
faultSurface();


show_intensity2();
show_pga2();
show_pgv2();
intensityOverlay2();
show_psa0p32();
show_psa1p02();
show_psa3p02();

var sidebar = L.control.sidebar('sidebar').addTo(map1);
