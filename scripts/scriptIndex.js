$(document).ready(function() {
  $('table tbody tr').click(function() {
    window.location = $(this).data('href');
    return false;
  });
});

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
    '<th scope="col";>Location</th>' +
    '<th scope="col";>Magnitude</th>' +
    '</thead>' +
    '</tr>' +
    '<tbody>';

  if (objLength > 5) {
    for (var i = objLength - 5; i < objLength; i++) {
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
        events[i].name +
        '</td>' +
        '<td>' +
        events[i].magnitude +
        '</td>' +
        '</tr>';
    }
  } else {
    for (var i = 0; i < objLength; i++) {
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
        events[i].name +
        '</td>' +
        '<td>' +
        events[i].magnitude +
        '</td>' +
        '</tr>';
    }
  }

  myvar += '</tbody>' + '</table>';

  document.getElementById('event_table').innerHTML = myvar;
}

console.log(events);
makeTable();
