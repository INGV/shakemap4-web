$(document).ready(function() {
  $('table tbody tr').click(function() {
    window.location = $(this).data('href');
    return false;
  });
});

function bBox_check(event_data) {
  // minLat = 30;
  // maxLat = 60;
  // minLon= 5;
  // maxLon = 20;
  //
  // if ( event_data.longitude > minLon && event_data.longitude <maxLon && event_data.latitude > minLat && event_data.latitude < maxLat) {
  //   return true
  // } else {
  //   return false
  // };
  return true
}

function makeTable() {
  var objLength = events.length;
  var myvar =
    '<table class="table table-hover table-sm">' +
    '<thead>' +
    '<tr class="table-dark">' +
    '<th scope="col";>Event id</th>' +
    '<th scope="col";>Year</th>' +
    '<th scope="col";>Month</th>' +
    '<th scope="col";>Day</th>' +
    '<th scope="col";>Time (HH:MM)</th>' +
    '<th scope="col";>Location</th>' +
    '<th scope="col";>Depth (km)</th>' +
    '<th scope="col";>Magnitude</th>' +
    '</thead>' +
    '</tr>' +
    '<tbody>';

  console.log(config_data.tableNumEventsHome.numEvents);
  if (objLength > config_data.tableNumEventsHome.numEvents) {
    for (var i = 0; i < config_data.tableNumEventsHome.numEvents; i++) {
      myvar +=
        '<tr data-href="./viewLeaflet.html?eventid=' +
        events[i].id +
        '">' +
        '<td>' +
        events[i].id +
        '</td>' +
        '<td>' +
        events[i].year +
        '</td>' +
        '<td>' +
        events[i].month +
        '</td>' +
        '<td>' +
        events[i].day +
        '</td>' +
        '<td>' +
        ('0' + events[i].hour.toString()).slice(-2) + ':' + ('0' + events[i].minute.toString()).slice(-2) +
        '</td>' +
        '<td><p>' +
        events[i].description +
        '</p></td>' +
        '<td>' +
        events[i].depth +
        '</td>' +
        '<td>' +
        (Math.round(events[i].magnitude * 10) / 10 + '.0').slice(0, 3) +
        '</td>' +
        '</tr>';
    }
  } else {
    for (var i = 0; i < objLength; i++) {
      console.time('someFunction')

      if (bBox_check(events[i]) == true) {
        'Yes'
      }; // Whatever is timed goes between the two "console.time"

      console.timeEnd('someFunction')
      if (bBox_check(events[i]) == true) {
        myvar +=
          '<tr data-href="./viewLeaflet.html?eventid=' +
          events[i].id +
          '">' +
          '<td>' +
          events[i].id +
          '</td>' +
          '<td>' +
          events[i].year +
          '</td>' +
          '<td>' +
          events[i].month +
          '</td>' +
          '<td>' +
          events[i].day +
          '</td>' +
          '<td>' +
          ('0' + events[i].hour.toString()).slice(-2) + ':' + ('0' + events[i].minute.toString()).slice(-2) +
          '</td>' +
          '<td>' +
          events[i].description +
          '</td>' +
          '<td>' +
          events[i].depth +
          '</td>' +
          '<td>' +
          (Math.round(events[i].magnitude * 10) / 10 + '.0').slice(0, 3) +
          '</td>' +
          '</tr>';
      };
    }
  }

  myvar += '</tbody>' + '</table>';

  document.getElementById('event_table').innerHTML = myvar;
}

var events = events.map(function (o) {
  o.date = new Date(o.year, Number(o.month-1), o.day, o.hour, o.minute, o.second, 0);
  return o;
});

events.sort(function (a, b) {
  return b.date - a.date;
});

makeTable();
