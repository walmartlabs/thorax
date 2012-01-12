window.onload = function() {
  var pres = document.getElementsByTagName('pre');
  for (var i = 0; i < pres.length; ++i) {
    var pre = pres[i];
    pre.innerHTML = pre.innerHTML.replace(/(^[\s\n]+)/m,'');
  } 
};
