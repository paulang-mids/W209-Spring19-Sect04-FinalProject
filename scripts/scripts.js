window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    document.getElementById("container").style.top = "0";
  } else {
    document.getElementById("container").style.top = "-60px";
  }
}
