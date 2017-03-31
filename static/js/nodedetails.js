var nodedetaillist;
function makePage(data,state) {
  nodedetaillist = JSON.parse(data);
  if (lenofdata==0)
    lenofdata = nodedetaillist.length;
  buildnetworktopology(nodedetaillist);
}







