
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
            if (disclaimer) {
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
//include_header(function(){
header_element = document.getElementById('header');
if (header_element) {
  fetch("./inc/header.html")
      .then(response => {
          return response.text()
      })
      .then(data => {
            header_element.innerHTML = data;

            if (config_data.logo) {
                if (config_data.logo.show) {
                    logo = document.getElementById("logo")
                    if (logo) {
                        logo.onload = function (self) {
                            if (window.screen.width > self.target.width) {
                                if (config_data.logo.zoom) {
                                    self.target.style.width = config_data.logo.zoom
                                }
                            }
                        }
                        logo.src = config_data.logo.image_file
                    }
                }
            }

            if (config_data.banner2) {
                if (config_data.banner2.show) {
                    banner2_image = document.getElementById("banner2")
                    if (banner2_image){
                        banner2_image.src = config_data.banner2.image_file
                        if (config_data.banner2.zoom) {
                            banner2_image.style.width = config_data.banner2.zoom
                        }
                    }
                }
            }

      });
}


footer_element = document.getElementById('footer');
if (footer_element) {
  fetch("./inc/footer.html")
    .then(response => {
        return response.text()
    })
    .then(data => {
        footer_element.innerHTML = data;
        if (config_data.footerLogo) {
            if (config_data.footerLogo.show) {
                footerLogo_image = document.getElementById("footerLogo")
                if (footerLogo_image) {
                    footerLogo_image.src = config_data.footerLogo.image_file
                    if (config_data.footerLogo.zoom) {
                        footerLogo_image.style.width = config_data.footerLogo.zoom
                    }
                }
            }
        }
        fetch('VERSION')
            .then(response => response.text())
            .then(text => {
                software_version = document.getElementById("software_version")
                if (software_version) {
                   software_version.textContent = text
                }
            })
    });
}
