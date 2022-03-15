// var fas = require("fs");
// var text = fas.readFileSync("./eventlist.txt", "utf-8");
// var list = text.split("\n")
//
// console.log(list)

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

document.getElementById('imgint').src =
  config_data.dataFolder.path + eventid + '/current/products/intensity.jpg';
document.getElementById('pgaint').src =
  config_data.dataFolder.path + eventid + '/current/products/pga.jpg';
document.getElementById('pgvint').src =
  config_data.dataFolder.path + eventid + '/current/products/pgv.jpg';
document.getElementById('imgsa03').src =
  config_data.dataFolder.path + eventid + '/current/products/psa0p3.jpg';
document.getElementById('imgsa1').src =
  config_data.dataFolder.path + eventid + '/current/products/psa1p0.jpg';
document.getElementById('imgsa3').src =
  config_data.dataFolder.path + eventid + '/current/products/psa3p0.jpg';

// #####################################################
// Open the download page for event
//
function open_download () {
  window.location = './downloadPage.html?eventid=' + eventid;
}
