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
function listProducts (eventid, productList) {

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
    myvar += '<tr data-href="' + baseLink + productsList[i].file + '" download="name_of_downloaded_file">' +
        '<td>' +
        productsList[i].file +
        '</td>' +
        '<td>' +
        productsList[i].desc +
        '</td>';
  }

  myvar += '</tbody>' + '</table>';

  document.getElementById('products_table').innerHTML = myvar;

  initTableClick();
}

//  #################################################################
//  #  Main
//  ##################################################################

var eventid = getURLParameter('eventid');

var productsList;
$.getJSON('data/' + eventid + '/current/products/productList.json', function (data) {
  productsList = data;
  listProducts(eventid, productsList);
});
