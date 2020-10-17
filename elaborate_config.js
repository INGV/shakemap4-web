var softwareVersion = "Website Version: 1.10.0"; document.getElementById("footer_text").innerHTML = softwareVersion;

if (config_data.logo.show) {
    html_logo = '<img src="' + config_data.logo.image_file + '"/>'
    document.getElementById("logo").innerHTML = html_logo;
}