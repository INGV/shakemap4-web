if (config_data.logo) {
    if (config_data.logo.show) {
        html_logo = '<img onload="loadLogoImage(this)"  src="' + config_data.logo.image_file + '"/>'
        document.getElementById("logo").innerHTML = html_logo;
    }
}

function loadLogoImage(self){
    logo_width_percentage = window.screen.width > self.width ? logo_width_percentage =  Math.floor((self.width / window.screen.width) * 100) : 100
    self.style['width'] = logo_width_percentage + '%';
    self.style['height'] = 'auto';
}
