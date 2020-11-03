if (config_data.logo.show) {
    html_logo = '<img src="' + config_data.logo.image_file + '"/>'
    document.getElementById("logo").innerHTML = html_logo;
}
if (config_data.contributorsLogo.show) {
  html_ContrLogo = '<img src="' + config_data.contributorsLogo.image_file + '"/>'
  document.getElementById("contributorsLogo").innerHTML = html_ContrLogo;
}
