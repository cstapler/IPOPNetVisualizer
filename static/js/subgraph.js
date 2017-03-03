var circleRadius = 15;
var svg_width = document.getElementById("svg").width["baseVal"]["value"];
var svg_height = document.getElementById("svg").height["baseVal"]["value"];
var arcRadius= Math.min(svg_height/5,svg_width/5);
var circlDetails = {};
var timeOut= 7000;
var oldcircleData = {};
var linktypes="";
var canvas_center_x = svg_width/2;
var canvas_center_y = (2*svg_height)/5;
var modaltemplate = "<div id='myModal' class='modal'><div id='myModal_content'class='modal-content'><span class='close'>x</span><table id='NodeDetails'><col style='width:30%'><col style='width:70%'><tr><td class='keyclass'>UID</td><td class='valueclass'>$ui</td></tr><tr><td class='keyclass'>Node Name</td><td class='valueclass'>$nodename</td></tr><tr><td class='keyclass'>IPOP IP</td><td class='valueclass'>$ipopip</td></tr><tr><td class='keyclass'>Physical IP</td><td class='valueclass'>$phyip</td></tr><tr><td class='keyclass'>Location</td><td class='valueclass'>$loc</td></tr><tr><td class='keyclass'>State</td><td class='valueclass' id='myModal_state'>$state</td></tr></table><p><H3>Link Details</H3></p><table id='Link_Details'><tr><td class='keyclass'>Chord</td><td class='valueclass' id='myModal_chord'>$chord</td></tr><tr><td class='keyclass'>Successor</td><td class='valueclass' id='myModal_successor'>$successor</td></tr><tr><td class='keyclass'>Ondemand</td><td class='valueclass' id='myModal_ondemand'>$ondemand</td></tr><tr><td class='keyclass'>StartTime</td><td class='valueclass' id='myModal_starttime'>$starttime</td></tr></table><p><H3>Message Details</H3></p><table id='MessageDetails'><tr><td class='keyclass'>SendCount</td><td class='valueclass' id='myModal_sendcount'>$sendcount</td></tr><tr><td class='keyclass'>ReceiveCount</td><td class='valueclass' id='myModal_receivecount'>$receivecount</td></tr></table>$MACUIDMAP</div></div>";
var geolocation;
var disableoldclick=false;
var subgraphcircledetails=[];

window.onload = function() {
        callWebservice();
        subgraphcircledetails = localStorage.getItem("subgraphelements");
    }


function callWebservice()
{
	$.ajax({
            type: "GET",
            method: "GET",
            url: "http://172.16.110.182:8080/subgraph",
	        contentType: "application/text",
	        datatype:"text",
	        data: subgraphcircledetails,
            crossDomain:true,
            timeout : 5000,
            success : function(data)
            {
            	makePage(data);
            },
            error: function(data)
            {
            	alert("IPOP Webservice is down!! Please check after sometime..");
            	console.log(data);
            }
        });
}



function makePage(data)
{
	
	circlDetails = data.response;
	var oldkeys = Object.keys(oldcircleData);
	var newkeys = Object.keys(circlDetails);
	if ((oldkeys.length>0 && newkeys.length>oldkeys.length))
		window.location.reload();
	else
	{
		setDisplay();
		setNodeLocation();
		buildNodeTopology();
	}
	if (oldkeys.length==0)
	 oldcircleData = circlDetails;
	else
		copystatus();
};


function copystatus()
{
	for (element in circlDetails)
	{
		for(prop in circlDetails[element])
			oldcircleData[element][prop] =  circlDetails[element][prop];
	}
}

function setDisplay()
{
	for (element in circlDetails)
	{
		var keys = Object.keys(oldcircleData);
		if (oldcircleData[element]==undefined)
		{
			circlDetails[element]["isDisplayed"]=false;
			circlDetails[element]["starttime"]= circlDetails[element]["uptime"];
		}
		if (keys.length>0 && oldcircleData[element]!=undefined)
		{	
			if (circlDetails[element]["uptime"] == oldcircleData[element]["uptime"])
			{
				oldcircleData[element]["state"]="Stopped";
				circlDetails[element]["state"]="Stopped";
			}
			else
				oldcircleData[element]["state"] = circlDetails[element]["state"];
		}	
	}
}

function setNodeLocation()
{	
	var elementList = Object.keys(circlDetails).sort();
	for(i in elementList)
	{	
		var uid  = elementList[i];
		var circleElement = circlDetails[uid];
		var oldcircleElement = oldcircleData[uid];
		if (oldcircleElement==undefined)
		{	
			var newxcord = arcRadius*Math.cos(2*i*Math.PI/elementList.length-Math.PI/2)+canvas_center_x;
			var newycord = arcRadius*Math.sin(2*i*Math.PI/elementList.length-Math.PI/2)+canvas_center_y;
			circleElement['center'] = [newxcord,newycord];
			oldcircleElement = circleElement;
		}
		else
			circleElement['center'] = oldcircleElement['center'];		
	}
}

function getCircleColor(element)
{
	if (element["state"] == "started")
		return "blue";
	else if (element["state"] == "searching")
		return "yellow";
	else if (element["state"] == "connecting")
		return "orange";
	else if (element["state"] == "connected")
		return "green";
	return "red";
}


function buildLinks(element, peer_name, color,link_type)
{
	var circleElement = circlDetails[element];
	var element_state = "";
	var peer_element = document.getElementById("node_"+element+"_node_"+peer_name);
	var same_peer_element  = document.getElementById("node_"+peer_name+"_node_"+element);
	if (circlDetails[element]!=undefined)
		element_state = circlDetails[element]["state"];
	if(circlDetails[peer_name]!=undefined && element !=null)
	{	
		if(element_state=="connected" && peer_element==undefined && same_peer_element==undefined)
		{
			var el= document.createElementNS('http://www.w3.org/2000/svg', "line");
			el.setAttribute("x1", circleElement["center"][0]);
			el.setAttribute("y1", circleElement["center"][1]);
			el.setAttribute("x2", circlDetails[peer_name]["center"][0]);
			el.setAttribute("y2", circlDetails[peer_name]["center"][1]);
			el.setAttribute("class", link_type);
			el.setAttribute("stroke", color);
			el.setAttribute("stroke-width","4");
			el.setAttribute("id","node_"+element+"_node_"+peer_name);
			document.getElementById('svg').appendChild(el);

			var ele  = document.getElementById(element);
			if(ele !=undefined)
				ele.parentNode.appendChild(ele);

			var peerele = document.getElementById(peer_name);
			if(peerele !=undefined)
				peerele.parentNode.appendChild(peerele);
		}
		else if (element_state!="connected")
		{
			var ele = d3.selectAll("line");
			ele[0].forEach(function(el,i)
			{
				if((el["id"].indexOf(element)!=-1))
					el.parentNode.removeChild(el);
			});
		}
		else
		{
			if (peer_element!=undefined && peer_element!=null)
			{
				if (linktypes=="" || linktypes=="All")	
					peer_element.style.display = 'block';
				else if (linktypes==peer_element.className.animVal)
					peer_element.style.display = 'block';
				else
					peer_element.style.display = 'none';
			}
			if (same_peer_element!=undefined && same_peer_element!=null)
			{    if (linktypes=="" || linktypes=="All")	
					same_peer_element.style.display = 'block';
				else if (linktypes==same_peer_element.className.animVal)
					same_peer_element.style.display = 'block';
				else
					same_peer_element.style.display = 'none';
			}
		}
					
	}
}

function deleteOndemandLinks(element,peer_name)
{
	var link  = document.getElementById("node_"+element+"_node_"+peer_name);
	console.log(link);
	var peer_link  = document.getElementById("node_"+peer_name+"_node_"+element);
	console.log(peer_link);
	if (link!=null)
		link.parentNode.removeChild(link);
	if (peer_link!=null)
		peer_link.parentNode.removeChild(peer_link);
}


function buildNodeTopology()
{	
	for(element in circlDetails)
	{
			var circleElement = circlDetails[element];
			for (peer_element in circleElement["links"]["successor"])
			{	
				var peer_name = circleElement["links"]["successor"][peer_element];
				buildLinks(element,peer_name,"black","successor");
			}
	}
	for(element in circlDetails)
	{
			var circleElement = circlDetails[element];
			for (peer_element in circleElement["links"]["chord"])
			{	
				var peer_name = circleElement["links"]["chord"][peer_element];
				buildLinks(element,peer_name,"yellow","chord");
			}

			var curr_on_demandlinks = circleElement["links"]["on_demand"].length;
			var old_on_demandlinks=0;
			if (oldcircleData[element]!=undefined)
				old_on_demandlinks = oldcircleData[element]["links"]["on_demand"].length;

			if (curr_on_demandlinks>old_on_demandlinks)
			{
				for (peer_element in circleElement["links"]["on_demand"])
				{	
					var peer_name = circleElement["links"]["on_demand"][peer_element];
					buildLinks(element,peer_name,"white","on_demand");
				}
				
			}
			else if (curr_on_demandlinks<old_on_demandlinks)
			{
				for (peer_element in oldcircleData[element]["links"]["on_demand"])
				{	
					var peer_name = oldcircleData[element]["links"]["on_demand"][peer_element];
					deleteOndemandLinks(element,peer_name);
				}
			}
	}
		

	for(element in circlDetails)
	{
			if(document.getElementById(element)==undefined && element!=null)	
			{
				var circleElement1 = circlDetails[element];
				var el= document.createElementNS('http://www.w3.org/2000/svg', "circle");
				el.setAttribute("cx", circleElement1["center"][0]);
				el.setAttribute("cy", circleElement1["center"][1]);
				el.setAttribute("r", circleRadius);
				el.setAttribute("fill", getCircleColor(circleElement1));
				el.setAttribute("id", element);
				el.setAttribute("stroke", "white");
				el.setAttribute("stroke-width","3");
				document.getElementById('svg').appendChild(el);
				insertData(element,"new");
			}
			else
			{
				document.getElementById(element).setAttribute("fill",getCircleColor(oldcircleData[element]));
				insertData(element,"old");
			}		
	}
}

function countById(id,type)
{
	var count=0;
	var ele = d3.selectAll("line");
	ele[0].forEach(function(element,i)
	{
	
		var element_id = element["id"];
		var state = element["style"]["display"];
		var element_class = $("#"+element_id).attr("class");
		if((element_id.indexOf(id)!=-1)&&(state!="none")&&(element_class==type))
			count++;
		if(id=="*"&&state!="none"&&(element_class==type))
			count++;
	});
	return count;
}

function setText(element,type)
{
	var circle  = circlDetails[element];
	var state="";
	var uptime= "";
	
	if (oldcircleData[element]==undefined)
	{
		state = state + circle["state"];
		var temptime = circle["starttime"];
		temptime = new Date(temptime*1000);
	}
	else
	{
		var temptime = oldcircleData[element]["starttime"];
		temptime = new Date(temptime*1000);
		state = state + oldcircleData[element]["state"];
	}

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
		modalele = modalele.replace("$nodename",circle["name"]);
		modalele = modalele.replace("$ui",circle["uid"]);
		modalele = modalele.replace("$ipopip",circle["ip4"]);
		modalele = modalele.replace("$phyip",circle["PHY_IP"]);
		//getGeolocationDetails(circle["PHY_IP"]);
		uptime = uptime + temptime.toString();
		modalele = modalele.replace("$starttime",uptime);
		modalele = modalele.replace("$successor",circle["links"]["successor"].length);
		modalele = modalele.replace("$ondemand",circle["links"]["on_demand"].length);
		modalele = modalele.replace("$chord",circle["links"]["chord"].length);

		modalele = modalele.replace("$state",state);
		modalele = modalele.replace("$receivecount",circle["receivecount"]);
		modalele = modalele.replace("$sendcount",circle["sendcount"]);
		modalele = modalele.replace("$MACUIDMAP",macuidmappingstr);
		return modalele;
	}
	else
	{
		document.getElementById(element+"_modal_successor").innerHTML 	= countById(element,"successor");
		document.getElementById(element+"_modal_ondemand").innerHTML 	= countById(element,"on_demand");
		document.getElementById(element+"_modal_chord").innerHTML 		= countById(element,"chord");
		document.getElementById(element+"_modal_sendcount").innerHTML 	= circle["sendcount"];
		document.getElementById(element+"_modal_receivecount").innerHTML= circle["receivecount"];
		document.getElementById(element+"_modal_state").innerHTML 		= state;
		$('#'+element+"_modal_maccontent").remove();
		$('#'+element+"_modal_maccontent").append(macuidmappingstr);
	}
}

function enableLink(event)
{
	var link_type = event.target.innerHTML;
	if (link_type=="ondemand")
		link_type="on_demand";
	var ele = d3.selectAll("line");
	ele[0].forEach(function(element,i)
	{
		var element_id = element["id"];
		var element_class = $("#"+element_id).attr("class");
		if(link_type=="All")
			element["style"]["display"]="block";
		else if(element_class!=link_type)
			element["style"]["display"]="none";
		else
			element["style"]["display"]="block";
	});
	linktypes = link_type;
}

function insertIP(element,x,y)
{
	var newx=x,newy=y;
	var circle  = circlDetails[element];
	var el= document.createElementNS('http://www.w3.org/2000/svg', "text");
	el.setAttribute("x", newx-5);
	el.setAttribute("y", newy);
	el.setAttribute("id", element+"IP_text");
	el.setAttribute("fill", "white");
	el.innerHTML = circle["name"];
	document.getElementById('svg').appendChild(el);
}

function insertData(element,type)
{
	if(type=="new")	
	{	
		var cirElement = circlDetails[element];
		var x = cirElement["center"][0];
		var y = cirElement["center"][1];
		insertIP(element,x,y);
		$('#modaldata').append(setText(element,type));
	}
	else
	{
		setText(element,type);
	}	
}


function disableText()
{
	var rect_ele = d3.selectAll("rect");
	var text_ele = d3.selectAll("text");
	rect_ele[0].forEach(function(element,i)
	{
		element["style"]["display"]="none";
	});
	text_ele[0].forEach(function(element,i)
	{
		var element_id = element["id"];
		var ele = element_id.substring(0,element_id.length-5);
		if (element_id.includes("network_details_text")!=true && element_id.includes("IP_text")!=true)
		{
			element["style"]["display"]="none";
			oldcircleData[ele]["isDisplayed"]= false;
		}

	});
}

function displayText(event)
{
	var elementName="";
	var clickelement;
	var modalElement;
	
	if (event["target"]["className"] != "close")
	{
		var elementID="";
        if (event["target"]["id"]!="")
        {
            elementID = ""+event["target"]["id"];
            elementName = elementID.replace("IP_text","");
        }
	}
	else
	{
		elementID = event["target"]["parentNode"]["offsetParent"]["id"];
		elementName = elementID.substring(0,elementID.length-6);
	}
	
	if (oldcircleData[elementName]!=undefined)
		clickelement = 	oldcircleData[elementName];
	else if (circlDetails[elementName]!=undefined)
		clickelement = circlDetails[elementName];
	else
		clickelement= undefined;

	if (event["target"]["className"] != "close")
	{
		if (clickelement!=undefined || clickelement!= null)
		{
			modalElement = document.getElementById(elementName+"_modal");
			modalElement.style.display = "block";
		}
	}
	else
	{
		if (clickelement!=undefined || clickelement!= null)
		{
			modalElement = document.getElementById(elementID);
			modalElement.style.display = "none";
		}
	}
}


function getRunningNodeCount()
{
	var count=0;
	for (element in circlDetails)
	{
		if(circlDetails[element]["state"]=="connected")
			count++;
	}
	return count;
}


function getClick()
{
	$($("body")).click(function(event) {
			displayText(event);
	 });
}
getClick();




setInterval(callWebservice,timeOut);               //Refresh Interval of 1 min= 60 * 1000 millisec	
