/*  The name of this file is misleading ...
    It uses indeed the config_data variable in order to load the logo image
    but it also contains the functions shared by all pages, since all pages load this file ...
*/

function loadLogoImage(self){
    logo_width_percentage = window.screen.width > self.width ? logo_width_percentage =  Math.floor((self.width / window.screen.width) * 100) : 100
    self.style['width'] = logo_width_percentage + '%';
    self.style['height'] = 'auto';
}


function include_header(calback) {
    fetch("./inc/header.html")
        .then(response => {
            return response.text()
        })
        .then(data => {
            document.getElementById('header').innerHTML = data;
            calback()
        });
}

/* this function is called by header.html. It toggles the menu when it is displayed in mobile mode
    It is placed here because, as far as I know,  this is the only javascript file
    loaded by all html pages
*/
function toggle_menu_header() {
    var x = document.getElementById("myTopnav");
    if (x.className === "topnav") {
        x.className += " responsive";
    } else {
        x.className = "topnav";
    }
}

/*  call the function include_header that include the header.html
    Only After the function include_header has finished, the logo image can be, in case, loaded
 */
include_header(function(){
    if (config_data.logo) {
        if (config_data.logo.show) {
            html_logo = '<img onload="loadLogoImage(this)"  src="' + config_data.logo.image_file + '"/>'
            logo_container = document.getElementById("logo")
            if (logo_container !== null)
                logo_container.innerHTML = html_logo;
        }
    }
    if (config_data.contributorsLogo) {
        if (config_data.contributorsLogo.show) {
            html_ContrLogo = '<img src="' + config_data.contributorsLogo.image_file + '"/>'
            contributorsLogo_container = document.getElementById("contributorsLogo")
            if (contributorsLogo_container !== null)
                contributorsLogo_container.innerHTML = html_ContrLogo;
        }
    }
    if (config_data.banner2) {
        if (config_data.banner2.show) {
            html_banner2 = '<img src="' + config_data.banner2.image_file + '" style="height: ' + config_data.banner2.height + '; width: ' + config_data.banner2.width + '; object-fit: contain" />'
            banner2_container = document.getElementById("banner2")
            if (banner2_container !== null)
                banner2_container.innerHTML = html_banner2;
        }
    }
});
