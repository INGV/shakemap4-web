// var fas = require("fs");
// var text = fas.readFileSync("./eventlist.txt", "utf-8");
// var list = text.split("\n")
//
// console.log(list)

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
//  #  Writing the table
//  ##################################################################
function listProducts (eventid) {
  var productsNumber = productsList.length;

  var baseLink = 'data/' + eventid + '/current/products/';

  var myvar =
    '<table class="table table-hover table-sm archive_table">' +
    '<thead>' +
    '<tr class="table-dark">' +
    '<th scope="col";>File name</th>' +
    '<th scope="col";>Description</th>' +
    '</thead>' +
    '</tr>' +
    '<tbody>';

  for (var i = 0; i < productsNumber; i++) {
    myvar += '<tr data-href="' + baseLink + productsList[i].name + '" download="name_of_downloaded_file">' +
        '<td>' +
        productsList[i].name +
        '</td>' +
        '<td>' +
        productsList[i].desc +
        '</td>';
  }
  // for (var i = 0; i < showLength; i++) {
  //   myvar +=
  //     '<tr data-href="' +
  //     viewerLink +
  //     showEvents[i].id +
  //     '">' +
  //     '<td>' +
  //     showEvents[i].id +
  //     '</td>' +
  //     '<td>' +
  //     showEvents[i].year +
  //     '</td>' +
  //     '<td>' +
  //     showEvents[i].month +
  //     '</td>' +
  //     '<td>' +
  //     showEvents[i].day +
  //     '</td>' +
  //     '<td>' +
  //     ('0' + showEvents[i].hour.toString()).slice(-2) + ':' + ('0' + showEvents[i].minute.toString()).slice(-2) +
  //     '</td>' +
  //     '<td>' +
  //     showEvents[i].description +
  //     '</td>' +
  //     '<td>' +
  //     (Math.round(showEvents[i].magnitude * 10) / 10 + '.0').slice(0, 3) +
  //     '</td>' +
  //     '</tr>';
  // }

  myvar += '</tbody>' + '</table>';

  document.getElementById('products_table').innerHTML = myvar;

  initTableClick();
}

var eventid = getURLParameter('eventid');

listProducts(eventid);
// document.getElementById('imgint').src =
//   './data/' + eventid + '/current/products/intensity.jpg';
// document.getElementById('pgaint').src =
//   './data/' + eventid + '/current/products/pga.jpg';
// document.getElementById('pgvint').src =
//   './data/' + eventid + '/current/products/pgv.jpg';
// document.getElementById('imgsa03').src =
//   './data/' + eventid + '/current/products/psa0p3.jpg';
// document.getElementById('imgsa1').src =
//   './data/' + eventid + '/current/products/psa1p0.jpg';
// document.getElementById('imgsa3').src =
//   './data/' + eventid + '/current/products/psa3p0.jpg';
