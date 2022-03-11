function getURLParameter (name) {
  return (
    decodeURIComponent(
      (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(
        location.search
      ) || [null, ''])[1].replace(/\+/g, '%20')
    ) || null
  );
}

// #####################################################
// Open the double map view
//
function open_leaflet () {
  window.location = './viewLeaflet.html?eventid=' + eventid;
}

// #####################################################
// Open the static map view
//
function open_static () {
  window.location = './view.html?eventid=' + eventid;
}

//  #################################################################
//  #  Make table rows clickable
//  ##################################################################
function initTableClick () {
  $(document).ready(function () {
    $('table tbody tr').click(function () {
      document.location = $(this).data('href');
      return false;
    });
  });
}

//  #################################################################
//  #  Find categories of available products for event
//  ##################################################################
function attr_div(attr_collection) {
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
    return content;
  } catch (err) {
    console.log(err)
  }
}

function col_exp() {
  var col = document.getElementsByClassName("collapsible");
  for (i = 0; i < col.length; i++) {
    col[i].addEventListener("click", function() {
      this.classList.toggle("activeCol");
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  };
};
//  #################################################################
//  #  Writing the table
//  ##################################################################
function list_meta(eventid, historic) {
  $.getJSON(config_data.dataFolder.path + eventid + '/current/products/stationlist.json', function(
    json
  ) {
    var stations = json.features;
    stationsSorted = stations.sort((a, b) => (a.properties.distance > b.properties.distance) ? 1 : -1);
    return_data(stationsSorted, historic);
  });
function return_data(stations, historic) {
  var dontUseStationType = 'macroseismic';
  if (historic == true) {
    dontUseStationType = ''
  };
  var htmlCode = '<button type="button" class="collapsible"><b>ID</b>&emsp;&emsp;'
   + ' MMI &emsp;&emsp; PGA &emsp;&emsp; PGV &emsp;&emsp; Distance <br/>'
   + ' &emsp;&emsp; &emsp;&emsp;&emsp;&emsp;&emsp; (%g)&emsp;&emsp;(cm/s)  &emsp;&emsp; (km)</button><br/>';
  for (var i=0; i<stations.length; i++) {
    if (stations[i].properties.station_type != dontUseStationType) {
      coordinates = stations[i].geometry.coordinates;
      htmlCode = htmlCode + '<button type="button" class="collapsible" style="background-color:'
                + intColors[Math.round(stations[i].properties.intensity)]+ '"><b>'
                + stations[i].id + ':</b>&emsp;&emsp;'
                + Math.round(stations[i].properties.intensity) + '&emsp;&emsp;'
                + stations[i].properties.pga + '&emsp;&emsp;'
                + stations[i].properties.pgv + '&emsp;&emsp;'
                + Number(stations[i].properties.distance).toFixed(1) + '<br/></button>'
                + '<div class="content"><p><br/>&emsp;&emsp; <b>Latitude: </b>' + coordinates[0]
                + '&emsp;&emsp; <b> Longitude: </b>' + coordinates[1]
                + '&emsp;&emsp; <b> Vs30 (m/s): </b>' + stations[i].properties.vs30 + '<br/>'
      htmlCode = htmlCode + '<b><h7>Channels:</h7></b><br/>&emsp;&emsp; Channel &emsp;&emsp; PGA (%g) &emsp;&emsp; PGV (m/s)'
                + '&emsp;&emsp; SA(0.3) (%g) &emsp;&emsp; SA(1.0) (%g) &emsp;&emsp;'
                + ' SA(3.0) (%g) &emsp;&emsp;'
      channelsVar = stations[i].properties.channels
      for (var j=0; j<channelsVar.length; j++) {
        htmlCode = htmlCode + '<br/>&emsp;&emsp;' + channelsVar[j].name;
        for (var k=0; k<channelsVar[j].amplitudes.length; k++) {
          htmlCode = htmlCode + '&emsp;&emsp;&emsp;&emsp;' + channelsVar[j].amplitudes[k].value;
        }
      };
      htmlCode = htmlCode + '</p></div>';
    };
  };
  document.getElementById('stationTable').innerHTML = htmlCode;
  col_exp();
};
    // Object.keys(json).forEach(function(key,index) {
    // subMeta = json[key];
    // keyName = key.charAt(0).toUpperCase() + key.slice(1)
    //
    // metaHTML = metaHTML + '<button type="button" class="collapsible"> '
    //   + keyName + '</button><div class="content"><p>';
    //
    // // Object.keys(subMeta).forEach(function(key2,index) {
    // //   // metaHTML = metaHTML + '<br/><b>' + key2 + '</b><br/>' + JSON.stringify(subMeta[key2], null, 4);
    // //   console.log(get_subs(subMeta[key2], metaHTML));
    // // });
    //
    // metaHTML = metaHTML + get_subs(subMeta, 0) + '</p></div>';
    // document.getElementById('metaTable').innerHTML = metaHTML;

  // });

  // col_exp();



};


//  #################################################################
//  #  Main
//  ##################################################################

var eventid = getURLParameter('eventid');
var eventYear = parseInt(getURLParameter('eventyear'));

var historic = false;
if (eventYear < 1972) {
  historic = true
}
list_meta(eventid, historic);
