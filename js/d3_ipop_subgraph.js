var subgraphNodeDetails = "";
window.onload = function() {
        callWebservice("new");   
    }

var serverip = "172.16.110.182";
var texttemplate = "<div id='text_element' class='textbox'><p><div class='heading'>General Details</div></p><table id='NodeDetails'><tr><td class='keyclass'>UID</td><td class='valueclass'>$ui</td></tr><tr><td class='keyclass'>Node Name</td><td class='valueclass'>$nodename</td></tr><tr><td class='keyclass'>IPOP IP</td><td class='valueclass'>$ipopip</td></tr><tr><td class='keyclass'>Physical IP</td><td class='valueclass'>$phyip</td></tr><tr><td class='keyclass'>Location</td><td class='valueclass'>$loc</td></tr><tr><td class='keyclass'>State</td><td class='valueclass' id='text_element_state'>$state</td></tr></table><p><div class='heading'>Link Details</div></p><table id='Link_Details'><tr><td class='keyclass'>Chord</td><td class='valueclass' id='text_element_chord'>$chord</td></tr><tr><td class='keyclass'>Successor</td><td class='valueclass' id='text_element_successor'>$successor</td></tr><tr><td class='keyclass'>Ondemand</td><td class='valueclass' id='text_element_ondemand'>$ondemand</td></tr><tr><td class='keyclass'>StartTime</td><td class='valueclass' id='text_element_starttime'>$starttime</td></tr></table><p><div class='heading'>Message Details</div></p><table id='MessageDetails'><tr><td class='keyclass'>SendCount</td><td class='valueclass' id='text_element_sendcount'>$sendcount</td></tr><tr><td class='keyclass'>ReceiveCount</td><td class='valueclass' id='text_element_receivecount'>$receivecount</td></tr></table>$MACUIDMAP</div></div>";
var modaltemplate = "<div id='myModal' class='modal'><div id='myModal_content'class='modal-content'><span class='close' onclick='closemodal(event);'>x</span><table id='NodeDetails'><col style='width:30%'><col style='width:70%'><tr><td class='keyclass'>UID</td><td class='valueclass'>$ui</td></tr><tr><td class='keyclass'>Node Name</td><td class='valueclass'>$nodename</td></tr><tr><td class='keyclass'>IPOP IP</td><td class='valueclass'>$ipopip</td></tr><tr><td class='keyclass'>Physical IP</td><td class='valueclass'>$phyip</td></tr><tr><td class='keyclass'>Location</td><td class='valueclass'>$loc</td></tr><tr><td class='keyclass'>State</td><td class='valueclass' id='myModal_state'>$state</td></tr></table><p><H3>Link Details</H3></p><table id='Link_Details'><tr><td class='keyclass'>Chord</td><td class='valueclass' id='myModal_chord'>$chord</td></tr><tr><td class='keyclass'>Successor</td><td class='valueclass' id='myModal_successor'>$successor</td></tr><tr><td class='keyclass'>Ondemand</td><td class='valueclass' id='myModal_ondemand'>$ondemand</td></tr><tr><td class='keyclass'>StartTime</td><td class='valueclass' id='myModal_starttime'>$starttime</td></tr></table><p><H3>Message Details</H3></p><table id='MessageDetails'><tr><td class='keyclass'>SendCount</td><td class='valueclass' id='myModal_sendcount'>$sendcount</td></tr><tr><td class='keyclass'>ReceiveCount</td><td class='valueclass' id='myModal_receivecount'>$receivecount</td></tr></table>$MACUIDMAP</div></div>";
var diameter = 800,
    radius = diameter / 2,
    innerRadius = radius - 120;

var cluster = d3.layout.cluster()
    .size([360, innerRadius])
    .sort(null)
    .value(function(d) { return d.size; });
	
var force = d3.layout.force();
var bundle = d3.layout.bundle();

var line = d3.svg.line.radial()
    .interpolate("bundle")
    .tension(.85)
    .radius(function(d) { return d.y; })
    .angle(function(d) { return d.x / 180 * Math.PI; });

var svg = d3.select("#subgraphtopology").append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
  .append("g")
    .attr("transform", "translate(" + radius + "," + radius + ")");

var link = svg.append("g").selectAll(".link"),
    node = svg.selectAll(".node");

var classes = [];

function callWebservice(type)
{
  subgraphNodeDetails = localStorage.getItem("subgraphelements");
  $.ajax({
            type: "GET",
            method: "GET",
            url: "http://"+serverip+":8080/subgraph",
            contentType: "application/text",
            datatype:"text",
            data: subgraphNodeDetails,
            crossDomain:true,
            timeout : 5000,
            success : function(data)
            {
              makePage(data,type);
            },
            error: function(data)
            {
              alert("IPOP Webservice is down!! Please check after sometime..");
              console.log(data);
            }
        });
}

function makePage(data,state) {
  classes = data["response"];
  var nodes = cluster.nodes(packageHierarchy(classes)),
      links = connections(nodes);
  
  if (state == "new")
    link = svg.append("g").selectAll(".link").data(bundle(links)).enter();
  else
    link  = svg.selectAll(".link").data(bundle(links));
  
  link.append("path")
      .each(function(d) {d.source = d[0], d.target = d[d.length - 1]})
      .attr("class", "link")
      .attr("style", "display=block;")
      .attr("d", line)
  	  .attr("id", function(d){
      		dest_name  = d[2].key;
          if (Object.keys(d[0]).indexOf("links")!=-1)
          {
        		if (d[0].links.on_demand.indexOf(dest_name)!= -1)
        			return "on_demand_"+d[0].key+"_"+d[2].key;
        		if (d[0].links.successor.indexOf(dest_name)!= -1)
        			return "successor_"+d[0].key+"_"+d[2].key;
        		if (d[0].links.chord.indexOf(dest_name)!= -1)
        			return "chord_"+d[0].key+"_"+d[2].key;
          }
  	  })
  	  .on("mouseover", linkmouseover)
  	  .on("mouseout", linkmouseout);

  if (state == "new")
  {
    node = node.data(nodes.filter(function(n) { return !n.children; }))
      .enter().append("g")
      .call(force.drag);
  }

	node.append("circle")
      .attr("class", "node")
      .attr("fill", function(d){
        if (d["state"] == "connected")
          return "green";
        if (d["state"] == "searching")
          return "yellow";
        if (d["state"] == "connecting")
          return "orange";
        if (d["state"] == "started")
          return "steelblue";
        return "red";
      })
      .attr("dy", ".31em")
	    .attr("r", "10")
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .on("mouseover", mouseovered)
      .on("mouseout", mouseouted)
      .on("click", mouseclick);
	  
	node.append("text")
      .attr("fill", "black")
      .attr("dy", ".31em")
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 28) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.node_name; });
}

function linktype(source_keys,dest_name,ltype,torf,d)
{
	if (source_keys.indexOf(ltype) != -1)
	{
		if (d[0].links[ltype].indexOf(dest_name)!= -1)
			d3.selectAll("#"+ltype+"_"+d[0].key+"_"+d[2].key).classed(ltype,torf);
	}
}

function linkmouseover(d)
{
	dest_name  = d[2].key;
  if (Object.keys(d[0]).indexOf("links")!=-1)
  {
    source_keys = Object.keys(d[0].links);
  	linktype(source_keys,dest_name,"on_demand",true,d);
  	linktype(source_keys,dest_name,"successor",true,d);
  	linktype(source_keys,dest_name,"chord",true,d);
  }
}

function linkmouseout(d)
{
	dest_name  = d[2].key;
  if (Object.keys(d[0]).indexOf("links")!=-1)
  {
  	source_keys = Object.keys(d[0].links);
  	linktype(source_keys,dest_name,"on_demand",false,d);
  	linktype(source_keys,dest_name,"successor",false,d);
  	linktype(source_keys,dest_name,"chord",false,d);
  }
}

function mouseovered(d) {
  setText(d);
  node
      .each(function(n) { n.target = n.source = false; });
  link[0]
      .forEach(function(l) { 
    l = l["__data__"]
    if (l[0].key == d.name || l[2].key == d.name)
  	{
        dest_name  = l[2].key;
        if ( Object.keys(l[0]).indexOf("links")!=-1)
        {
            source_keys = Object.keys(l[0].links);
        	  linktype(source_keys,dest_name,"on_demand",true,l);
        	  linktype(source_keys,dest_name,"successor",true,l);
        	  linktype(source_keys,dest_name,"chord",true,l);
        	  //this.parentNode.appendChild(this);
        } 
    }
    });
  node
      .classed("node--target", function(n) { return n.target; })
      .classed("node--source", function(n) { return n.source; });
}

function mouseclick(d)
{
  var element = d["name"];
  if(document.getElementById(element+"_modal")==null)
    {
      $('#ModalDetails').append(setModalText(d,"new"));
      document.getElementById(element+"_modal").style.display = "block";
    }
    else
    {
      if (document.getElementById(element+"_modal").style.display == "none")
      {
        setModalText(d,"old");
        document.getElementById(element+"_modal").style.display = "block";
      }
      else
        document.getElementById(element+"_modal").style.display = "none";
    }
}

function mouseouted(d) {
  link[0]
      .forEach(function(l) { 
    l = l["__data__"]
    if (l[0].key == d.name || l[2].key == d.name)
    {
        dest_name  = l[2].key;
        if ( Object.keys(l[0]).indexOf("links")!=-1)
        {
            source_keys = Object.keys(l[0].links);
            linktype(source_keys,dest_name,"on_demand",false,l);
            linktype(source_keys,dest_name,"successor",false,l);
            linktype(source_keys,dest_name,"chord",false,l);
        } 
    }
    });

  node
      .classed("node--target", false)
      .classed("node--source", false);

  var modalElement = document.getElementById("text_"+d["name"]);
  modalElement.style.display = "none";
}

d3.select(self.frameElement).style("height", diameter + "px");

function packageHierarchy(classes) {
  var map = {};

  function find(name, data) {

    var node = map[name], i;
    if (!node) {
      node = map[name] = data || {name: name, children: []};
      if (name.length) {
        node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
        node.parent.children.push(node);
        node.key = name.substring(i + 1);
      }
    }
    return node;
  }

  classes.forEach(function(d) {
    find(d.name, d);
  });

  return map[""];
}

// Return a list of imports for the given array of nodes.
function connections(nodes) {
  var map = {},
  conns = [];

  // Compute a map from name to node.
  nodes.forEach(function(d) {
    map[d.name] = d;
  });

  nodes.forEach(function(d) {
    if (Object.keys(d).indexOf("links")!=-1)
    { 
        if (d.links.successor) d.links.successor.forEach(function(i) {
          conns.push({source: map[d.name], target: map[i],"type":"successor"});
        });
    	if (d.links.on_demand) d.links.on_demand.forEach(function(i) {
          conns.push({source: map[d.name], target: map[i],"type":"ondemand"});
        });
    	if (d.links.chord) d.links.chord.forEach(function(i) {
          conns.push({source: map[d.name], target: map[i],"type":"chord"});
        });
    }
  });
  return conns;
}


function setText(d)
{
  var circle  = d;
  var state="";
  var uptime= "";
  var element = circle["name"];
  state = state + circle["state"];
  var temptime = circle["starttime"];
  temptime = new Date(temptime*1000);

  var macuidmappingstr = "<p id='"+element+"text_maccontent'><div class='heading'>UID- MAC Details</div><table id='macidmapping'>";
  for (obj in circle["macuidmapping"])
  {
    if (circlDetails[obj] != undefined)
      macuidmappingstr = macuidmappingstr+ "<tr><th>Node Name</th><th>Unique ID</th><th> MAC Details</th></tr><tr><td  class='keyclass'>"+circle["name"]+"</td><td>"+obj+"</td><td>"+circle["macuidmapping"][obj].join()+"</td></tr>";
  }
  macuidmappingstr = macuidmappingstr+"</table></p>";

  if (document.getElementById("text_"+element)==null)
  {
    var textele = texttemplate;
    textele = textele.replace(/text_element/g,"text_"+element);
    textele = textele.replace("$nodename",circle["node_name"]);
    textele = textele.replace("$ui",circle["uid"]);
    textele = textele.replace("$ipopip",circle["ip4"]);
    textele = textele.replace("$phyip",circle["PHY_IP"]);
    //getGeolocationDetails(circle["PHY_IP"]);
    uptime = uptime + temptime.toString();
    textele = textele.replace("$starttime",uptime);
    textele = textele.replace("$successor",countById(element,"successor"));
    textele = textele.replace("$ondemand",countById(element,"on_demand"));
    textele = textele.replace("$chord",countById(element,"chord"));
    

    textele = textele.replace("$state",state);
    textele = textele.replace("$receivecount",circle["receivecount"]);
    textele = textele.replace("$sendcount",circle["sendcount"]);
    textele = textele.replace("$MACUIDMAP",macuidmappingstr);
    $("#NodeDetails").append(textele);
  }
  else
  {
    document.getElementById("text_"+element+"_successor").innerHTML   = countById(element,"successor");
    document.getElementById("text_"+element+"_ondemand").innerHTML  = countById(element,"ondemand");
    document.getElementById("text_"+element+"_chord").innerHTML     = countById(element,"chord");
    document.getElementById("text_"+element+"_sendcount").innerHTML   = circle["sendcount"];
    document.getElementById("text_"+element+"_receivecount").innerHTML= circle["receivecount"];
    document.getElementById("text_"+element+"_state").innerHTML     = state;
    $("#"+element+"text_maccontent").remove();
    $("#"+element+"text_maccontent").append(macuidmappingstr);
    document.getElementById("text_"+element).style.display = "block";
  }
}

function countById(id,type)
{
  var count=0;
  link[0].forEach(function(element,i)
  {
    var element_id = element["id"];
    var state = element["style"]["display"];
    if(id=="*"&&(element_id.include(type)==true))
      count++;
    else
    {
      if((element_id.includes(id)==true)&&(element_id.includes(type)==true))
        count++;
    }
  });
  return count;
}

function setModalText(d,type)
{
  var circle  = d;
  var state="";
  var uptime= "";
  var element  = circle["name"];
  state = state + circle["state"];
  var temptime = circle["starttime"];
  temptime = new Date(temptime*1000);

  var macuidmappingstr = "<p id='"+element+"_modal_maccontent'"+"><H3>UID- MAC Details</H3><table id='macidmapping'>";
  for (obj in circle["macuidmapping"])
  {
    if (circlDetails[obj] != undefined)
      macuidmappingstr = macuidmappingstr+ "<tr><th>Node Name</th><th>Unique ID</th><th> MAC Details</th></tr><tr><td  class='keyclass'>"+circlDetails[obj]["name"]+"</td><td>"+obj+"</td><td>"+circle["macuidmapping"][obj].join()+"</td></tr>";
  }
  macuidmappingstr = macuidmappingstr+"</table></p>"

  if (type=="new")
  {
    var modalele = modaltemplate;
    modalele = modalele.replace(/myModal/g,element+"_modal");
    modalele = modalele.replace("$nodename",circle["node_name"]);
    modalele = modalele.replace("$ui",circle["uid"]);
    modalele = modalele.replace("$ipopip",circle["ip4"]);
    modalele = modalele.replace("$phyip",circle["PHY_IP"]);
    uptime = uptime + temptime.toString();
    modalele = modalele.replace("$starttime",uptime);
    modalele = modalele.replace("$successor",countById(element,"successor"));
    modalele = modalele.replace("$ondemand",countById(element,"on_demand"));
    modalele = modalele.replace("$chord",countById(element,"chord"));
    

    modalele = modalele.replace("$state",state);
    modalele = modalele.replace("$receivecount",circle["receivecount"]);
    modalele = modalele.replace("$sendcount",circle["sendcount"]);
    modalele = modalele.replace("$MACUIDMAP",macuidmappingstr);
    return modalele;
  }
  else
  {
    document.getElementById(element+"_modal_successor").innerHTML   = countById(element,"successor");
    document.getElementById(element+"_modal_ondemand").innerHTML  = countById(element,"on_demand");
    document.getElementById(element+"_modal_chord").innerHTML     = countById(element,"chord");
    document.getElementById(element+"_modal_sendcount").innerHTML   = circle["sendcount"];
    document.getElementById(element+"_modal_receivecount").innerHTML= circle["receivecount"];
    document.getElementById(element+"_modal_state").innerHTML     = state;
    $('#'+element+"_modal_maccontent").remove();
    $('#'+element+"_modal_maccontent").append(macuidmappingstr);
  }
}

function closemodal(event)
{
    var node_id = event.target.parentNode.id;
    var element = node_id.substring(0,node_id.indexOf("_modal_content"));
    document.getElementById(element+"_modal").style.display = "none";
}

setInterval(callWebservice,7500);