function makePage(data,state) {
  var classes = JSON.parse(data);
  if (lenofdata==0)
    lenofdata = classes.length;
  buildnetworktopology(classes);
}







