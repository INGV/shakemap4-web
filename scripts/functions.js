/*
every function, written outside of this file, that needs to access to the global variable config_data must use
the function waitForGlobal to be sure that the global variable config_data has been set set.
See as an example the function maketable() written in the file scriptArchive.js
*/

var waitForGlobal = function(key, callback) {
    if (window[key]) {
        console.log("NO-WAIT");
        callback();
    } else {
        setTimeout(function() {
            console.log("WAIT");
            waitForGlobal(key, callback);
        }, 5);
    }
};

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
    waitForGlobal('config_data', function() {
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
    });
}

/*  READ CONFIGURATION DATA  */
// fetch("./config.json")
//     .then(response => {
//         return response.json()
//     })
//     .then(data => {
//         config_data = data;
//     })
const get_config_data_synchronuosly = async () => {
    const response = await fetch('./config.json');
    config_data = await response.json();
}

get_config_data_synchronuosly();



/*  Do the following:
    1) Do its stuff only when config_data is set
    2) load header.htnl
    3) load logo, banner and contributors logo
*/
//waitForGlobal('config_data', function() {
fetch("./inc/header.html")
    .then(response => {
        return response.text()
    })
    .then(data => {
        document.getElementById('header').innerHTML = data;
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
//});





