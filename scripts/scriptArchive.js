// function getEventsList() {
//   $.getJSON('./data.json', function(
//     json
//   ) {
//     events = json;
//     console.log(events);
//     listEvents();
//   });
// }
function initTableClick() {
  $(document).ready(function() {
    $('table tbody tr').click(function() {
      window.location = $(this).data('href');
      return false;
    });
  });
}

//#################################################################
//# Creating an object from events list
//##################################################################

var Event = function (id, year, month, day, hour, minute, second, description, magnitude, date, list) {
  this.id = id;
  this.year = year;
  this.month = month;
  this.day = day;
  this.hour = hour;
  this.minute = minute;
  this.second = second;
  this.description = description;
  this.magnitude = magnitude;
  this.date = date;
  list.push(this);
};

var orgLength = events.length;

// #################################################################
// # Sorting by magnitude in table header
// ##################################################################
var sort = 4000;

function magn_sort(num) {
  sort = num;
  listEvents();
}

//#################################################################
//# Getting list of years from which there are entries in archive,
//# and putting them in selection boxes
//##################################################################
var yearsList = [];

for (var i = 0; i < orgLength; i++) {
  if (yearsList.indexOf(events[i].year) == -1) {
    //indexOf returns -1 if value never occurs in an array
    yearsList.push(events[i].year);
  }
}

yearsList.sort(function(a, b) {
  return b - a;
});

var yearsLength = yearsList.length;

var optionsYears;
for (var i = 0; i < yearsLength; i++) {
  optionsYears +=
    '<option value="' + yearsList[i] + '">' + yearsList[i] + '</option>';
}

optionsYears += '<option value="5000">All</option>';

document.getElementById('selectYear').innerHTML = optionsYears;

//#################################################################
//# Function to determine are events shown in Leaflet or
//# in the static viewer.
//##################################################################

var viewerLink = './viewLeaflet.html?eventid=';

function determine_viewer(num) {
  if (num == 2) {
    viewerLink = './viewLeaflet.html?eventid=';
    document.getElementById('staticButton').className =
      'btn btn-outline-primary';
    document.getElementById('leafletButton').className =
      'btn btn-outline-primary btn_active';
  } else {
    viewerLink = './view.html?eventid=';
    document.getElementById('staticButton').className =
      'btn btn-outline-primary btn_active';
    document.getElementById('leafletButton').className =
      'btn btn-outline-primary';
  }
  listEvents();
}

// ########################################
//
// # Creating the table of events
//
// #######################################

function listEvents () {
  var selYear = document.getElementById('selectYear');
  var selectedYear = selYear.options[selYear.selectedIndex].value;
  var showEvents = [];
  var helpObject = [];

  //#################################################################
  //#  Showing by year
  //##################################################################
  // I assigned the value 5000 to the option All, so here we check do we
  // show all or just from one year
  if (selectedYear != 5000) {
    for (var i = 0; i < orgLength; i++) {
      if (events[i].year == selectedYear) {
        new Event(
          events[i].id,
          events[i].year,
          events[i].month,
          events[i].day,
          events[i].hour,
          events[i].minute,
          events[i].second,
          events[i].description,
          events[i].magnitude,
          events[i].date,
          showEvents
        );
      }
    }
  } else {
    showEvents = events;
  }

  var showLength = showEvents.length;

  //#################################################################
  //#  Sorting by date-time
  //##################################################################

  showEvents.sort(function (a, b) {
    return b.date - a.date;
  });


  //#################################################################
  //#  Sorting by magnitude
  //##################################################################
  var minMag = document.getElementById('min_mag').value;
  if (minMag.length > 0) {
    for (var i = 0; i < showLength; i++) {
      if (showEvents[i].magnitude >= minMag) {
        new Event(
          showEvents[i].id,
          showEvents[i].year,
          showEvents[i].month,
          showEvents[i].day,
          events[i].hour,
          events[i].minute,
          events[i].second,
          showEvents[i].description,
          showEvents[i].magnitude,
          events[i].date,
          helpObject
        );
      }
    }
  } else {
    helpObject = showEvents;
  }

  showEvents = helpObject;

  helpObject = [];
  showLength = showEvents.length;

  var maxMag = document.getElementById('max_mag').value;
  if (maxMag.length > 0) {
    for (var i = 0; i < showLength; i++) {
      if (showEvents[i].magnitude <= maxMag) {
        new Event(
          showEvents[i].id,
          showEvents[i].year,
          showEvents[i].month,
          showEvents[i].day,
          events[i].hour,
          events[i].minute,
          events[i].second,
          showEvents[i].description,
          showEvents[i].magnitude,
          events[i].date,
          helpObject
        );
      }
    }
  } else {
    helpObject = showEvents;
  }

  showEvents = helpObject;

  if (sort === 1) {
    showEvents.sort(function (a, b) {
      return parseFloat(a.magnitude) - parseFloat(b.magnitude);
    });
  } else if (sort === 2) {
    showEvents.sort(function (a, b) {
      return parseFloat(b.magnitude) - parseFloat(a.magnitude);
    });
  }

  //  #################################################################
  //  #  Writing the table
  //  ##################################################################
  showLength = showEvents.length;

  var myvar =
    '<table class="table table-hover table-sm archive_table">' +
    '<thead>' +
    '<tr class="table-dark">' +
    '<th scope="col";>Event id</th>' +
    '<th scope="col";>Year</th>' +
    '<th scope="col";>Month</th>' +
    '<th scope="col";>Day</th>' +
    '<th scope="col";>Time (HH:MM)</th>' +
    '<th scope="col";>Location</th>' +
    '<th scope="col";" width="10%">' +
    '<a href="#" onclick="magn_sort(2);" class="table_arrow_link">↓</a>' +
    'Magnitude' +
    '<a href="#" onclick="magn_sort(1);" class="table_arrow_link">↑</a>' +
    '</th>' +
    '</thead>' +
    '</tr>' +
    '<tbody>';

  for (var i = 0; i < showLength; i++) {
    myvar +=
      '<tr data-href="' +
      viewerLink +
      showEvents[i].id +
      '">' +
      '<td>' +
      showEvents[i].id +
      '</td>' +
      '<td>' +
      showEvents[i].year +
      '</td>' +
      '<td>' +
      showEvents[i].month +
      '</td>' +
      '<td>' +
      showEvents[i].day +
      '</td>' +
      '<td>' +
      ('0' + showEvents[i].hour.toString()).slice(-2) + ':' + ('0' + showEvents[i].minute.toString()).slice(-2) +
      '</td>' +
      '<td>' +
      showEvents[i].description +
      '</td>' +
      '<td>' +
      (Math.round(showEvents[i].magnitude * 10) / 10 + '.0').slice(0, 3) +
      '</td>' +
      '</tr>';
  }

  myvar += '</tbody>' + '</table>';

  document.getElementById('event_table').innerHTML = myvar;

  initTableClick();
}
//  ###################################################

// getEventsList();
// var events2 = getEventsList();
// console.log(events2);

var events = events.map(function (o) {
  o.date = new Date(o.year, Number(o.month-1), o.day, o.hour, o.minute, o.second, 0);
  return o;
});

console.log(events);

listEvents();
