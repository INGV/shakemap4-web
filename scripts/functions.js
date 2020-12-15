
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

function include_disclaimer() {
    if (config_data.disclaimer) {
        if (config_data.disclaimer.show) {
            disclaimer = document.getElementById("disclaimer")
            if (disclaimer !== null) {
                fetch(config_data.disclaimer.file)
                    .then(response => {
                        return response.text()
                    })
                    .then(data => {
                        disclaimer.innerHTML = data;
                    });
            }
        }
    }
}

/*  call the function include_header that include the header.html
    Only After the function include_header has finished, the logo image can be, in case, loaded
 */
include_header(function(){
    if (config_data.logo) {
        if (config_data.logo.show) {
            logo = document.getElementById("logo")
            if (logo !== null) {
                logo.onload = function (self) {
                    if (window.screen.width > self.target.width) {
                        if (config_data.contributorsLogo.zoom) {
                            self.target.style.width = config_data.logo.zoom
                        }
                    }
                }
                logo.src = config_data.logo.image_file
            }
        }
    }
    if (config_data.contributorsLogo) {
        if (config_data.contributorsLogo.show) {
            contributorsLogo = document.getElementById("contributorsLogo")
            if (contributorsLogo !== null){
                contributorsLogo.src = config_data.contributorsLogo.image_file
                if (config_data.contributorsLogo.zoom) {
                    contributorsLogo.style.width = config_data.contributorsLogo.zoom
                }
            }

            /*
            html_ContrLogo = '<img src="' + config_data.contributorsLogo.image_file + '"/>'
            contributorsLogo_container = document.getElementById("contributorsLogo")
            if (contributorsLogo_container !== null)
                contributorsLogo_container.innerHTML = html_ContrLogo; */
        }
    }
     if (config_data.banner2) {
        if (config_data.banner2.show) {
            banner2_image = document.getElementById("banner2")
            if (banner2_image !== null){
                banner2_image.src = config_data.banner2.image_file
                if (config_data.banner2.zoom) {
                    banner2_image.style.width = config_data.banner2.zoom
                }
            }
        }
    }

});
