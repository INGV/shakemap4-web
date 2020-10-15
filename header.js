var htmlCode = '<nav class="navbar navbar-expand-lg navbar-dark bg-dark">' +
       '<a class="navbar-brand" href="./index.html"><h3>ShakeMap <small class="text-muted">v4</small></h3></a>'+
       '<div class="collapse navbar-collapse d-flex flex-row-reverse" id="navbarNavDropdown">'+
       '<ul class="navbar-nav">'+
       '<li class="nav-item dropdown"> <a class="nav-link dropdown-toggle" href="#" ' +
       'id="navbarDropdownMenuLink" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">'+
       'Information</a><div class="dropdown-menu" aria-labelledby="navbarDropdownMenuLink">'+
       '<a class="dropdown-item" href="./disclaimer.html">Disclaimer</a>'+
       // '<a class="dropdown-item" href="./links.html">Related Links</a>'+
       '<a class="dropdown-item" href="./scientificBackground.html">Scientific Background</a></div></li>' +
       '<li class="nav-item"><a class="nav-link" href="./archive.html">Archive</a></li>' +
       '<li class="nav-item active"><a class="nav-link" href="./index.html">Home</a></li></ul></div></nav>';


document.getElementById('header').innerHTML = htmlCode;
