var circleRadius = 15;
var svg_width = document.getElementById("svg").width["baseVal"]["value"];
var svg_height = document.getElementById("svg").height["baseVal"]["value"];
var arcRadius= Math.min(svg_height/3,svg_width/3);
var circlDetails = {};
var timeOut= 10000;
var oldcircleData = {};
var nameUID={};
var linktypes="";
var canvas_center_x = svg_width/4;
var canvas_center_y = svg_height/2;
console.log(canvas_center_y);
console.log(canvas_center_x);
window.onload = function() {
        callWebservice();
}


function callWebservice()
{
	$.ajax({
            type: "POST",
            method: "POST",
            url: "http://localhost:5000/nodedata",
            contentType: "application/json",
            datatype:"text",
            timeout : 5000,
            success : function(data)
            {
            	makePage(data);
            	$("#loading").hide();
            },
            error: function(data)
            {
            	$("#loading").hide();
            	//alert("IPOP Webservice is down!! Please check after sometime..");
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
	setLeftText();
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
				rightClick();
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

function setText(element,x,y)
{
	var circle  = circlDetails[element];
	var nodeName="	 Node Name : "+circle["name"]; 
	var uid ="	uid : "+circle["uid"]; 
	var ip = "  IPOP IP : "+circle["ip4"];
	var PhyIP = "  Physical IP : "+circle["PHY_IP"];
	var state="	State     : ";
	var link="	#Links    : ";
	var chord =" #Chord     : %chord%";
	var uptime= " Uptime    : ";
	if (oldcircleData[element]==undefined)
	{
		state = state + circle["state"];
		temptime = circlDetails[element]["starttime"];
		temptime = new Date(temptime*1000);
		uptime = uptime + temptime.toString();
	}
	else
	{
		temptime = oldcircleData[element]["starttime"];
		temptime = new Date(temptime*1000);
		state = state + oldcircleData[element]["state"];
		uptime = uptime+ temptime.toString();
	}
	var noOfSuccessor = countById(element,"successor");
	var noOfondemand = countById(element,"on_demand");
	var noOfchord = countById(element,"chord");
	tempsucc = " #successor:  "+noOfSuccessor;
	tempondemand=" #ondemandLinks: "+noOfondemand;
	var totalLinks = noOfchord+noOfSuccessor+noOfondemand
	link= link + totalLinks;
	tempchord = chord.replace("%chord%",noOfchord);
	
	var tempList = {
					"nodeName":nodeName,
					"IPOP IP Address": ip,
					"Physical IP Address":PhyIP,
					"uid":uid,
					"state":state,
					"link":link,
					"chord":tempchord,
					"successors": tempsucc,
					"ondemand": tempondemand,
					"time":uptime
				};
    var i=0;
	for( details in tempList)
	{		
		if(document.getElementById(element+"_text_"+details)==undefined)
		{
			var el= document.createElementNS('http://www.w3.org/2000/svg', "tspan");
			if (i!=0)
				el.setAttribute("dy",20);
			else
				el.setAttribute("y",y);
			el.setAttribute("x",x);
			el.setAttribute("id",element+"_text_"+details);
			el.innerHTML = tempList[details];
			document.getElementById(element+"_text").appendChild(el);
			i++;
		}
		else
			document.getElementById(element+"_text_"+details).innerHTML = tempList[details];
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
	var newx=0,newy=0;
	if ((x < canvas_center_x) && (y==canvas_center_y))
	{
		newx= x-40;
		newy= y-10;
	}
	else if ((x > canvas_center_x) && (y==canvas_center_y))
	{
		newx= x+15;
		newy= y-10;
	}
	else if ((x== canvas_center_x) && (y<canvas_center_y))
	{
		newx= x-25;
		newy= y-20;
	}
	else if ((x== canvas_center_x) && (y>canvas_center_y))
	{
		newx= x-25;
		newy= y+30;
	}
	else if ((x < canvas_center_x) && (y<canvas_center_y))
	{
		newx= x-60;
		newy= y-20;
	}
	else if ((x <= canvas_center_x) && (y>canvas_center_y))
	{
		newx= x-80;
		newy= y+30;
	}
	else if ((x > canvas_center_x) && (y<canvas_center_y))
	{
		newx= x;
		newy= y-20;
	}
	else
	{
		newx= x-10;
		newy= y+30;
	}

	var circle  = circlDetails[element];
	var el= document.createElementNS('http://www.w3.org/2000/svg', "text");
	el.setAttribute("x", newx);
	el.setAttribute("y", newy);
	el.setAttribute("id", "IP_text");
	el.setAttribute("fill", "white");
	el.innerHTML = circle["ip4"];
	document.getElementById('svg').appendChild(el);
}



function insertData(element,type)
{
	if(type=="new")	
	{
		var cirElement = circlDetails[element];
		var x = cirElement["center"][0];
		var y = cirElement["center"][1];
			
		var el1= document.createElementNS('http://www.w3.org/2000/svg', "rect");
		el1.setAttribute("x", x+30);
		el1.setAttribute("y", y-30);
		el1.setAttribute("class","boxStyle")
		el1.setAttribute("id", element+"_rect");
		el1.setAttribute("width", 500);
		el1.setAttribute("height", 220);
		document.getElementById('svg').appendChild(el1);


		var el= document.createElementNS('http://www.w3.org/2000/svg', "text");
		el.setAttribute("x", x+30);
		el.setAttribute("y", y);
		el.setAttribute("class","textStyle")
		el.setAttribute("id", element+"_text");
		el.setAttribute("fill", "white");
		document.getElementById('svg').appendChild(el);
		setText(element,x+40,y);
		insertIP(element,x,y);
	}
	else
		setText(element,x+40,y);
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
	var elementName = event["target"]["id"];
	var clickelement= undefined;
	if (oldcircleData[elementName]!=undefined)
	    clickelement = 	oldcircleData[elementName];
	else if (circlDetails[elementName]!=undefined)
		clickelement = circlDetails[elementName];
	else
		disableText();

	if (clickelement!=undefined || clickelement!= null)	
	{
		if ((clickelement["isDisplayed"]==false) && elementName!= null)
		{
			var rectelement = document.getElementById(elementName+"_rect");
			rectelement.parentNode.appendChild(rectelement);
			rectelement.style.display = 'block';
			var textelement = document.getElementById(elementName+"_text");
			textelement.style.display = 'block';
			textelement.parentNode.appendChild(textelement);
			clickelement["isDisplayed"]= true;
		}
		else
		{
			document.getElementById(elementName+"_rect").style.display = 'none';
			document.getElementById(elementName+"_text").style.display = 'none';
			clickelement["isDisplayed"]= false;
		}
	}

	if (oldcircleData[elementName]!=undefined)
	    oldcircleData[elementName] = clickelement;
	else
		circlDetails[elementName] = clickelement;
	
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

function setLeftText()
{
	var nodecount = "nodes: "+ getRunningNodeCount()+"/"+Object.keys(circlDetails).length;
	var successorcount = countById("*","successor");
	var chordcount = countById("*","chord");
	var ondemandcount = countById("*","on_demand");
	var totalcount = successorcount+chordcount+ondemandcount;
	var nodeDetails ={
		"node" 		: nodecount,
		"links" 	: "links: "+totalcount,
		"successor" : "sucessors: "+successorcount,
		"chords"	: "Chords: "+chordcount,
		"ondemand"  : "Ondemand: "+ondemandcount,
	}

	var k=0;
	if (document.getElementById("network_details_text")==undefined)
	{
		var el= document.createElementNS('http://www.w3.org/2000/svg', "text");
		el.setAttribute("x", 5);
		el.setAttribute("y", 75);
		el.setAttribute("class","lefttextStyle")
		el.setAttribute("id", "network_details_text");
		el.setAttribute("fill", "white");
		document.getElementById('svg_left').appendChild(el);

		for(details in nodeDetails)
		{
			var el1= document.createElementNS('http://www.w3.org/2000/svg', "tspan");
			if (k!=0)
				el1.setAttribute("dy",20);
			else
				el1.setAttribute("y",95);
			el1.setAttribute("x",5);
			el1.setAttribute("id","network_details_text_"+details);
			el1.innerHTML = nodeDetails[details];
			document.getElementById("network_details_text").appendChild(el1);
			k++;
		}
	}
	else
	{
		for(details in nodeDetails)
		{
			var el = document.getElementById("network_details_text_"+details);
			el.innerHTML = nodeDetails[details];
		}
	}
}


function getClick()
{
	$($("body")).click(function(event) {
			displayText(event);
	 });
}
getClick();

function rightClick()
{
	$($("circle")).bind("contextmenu", function(e) {
    		return false;
	}); 
}

angular
.module('IPOPApplication', ['ngMaterial'])
            .controller('sideNavController', sideNavController);

          function sideNavController ($scope, $mdSidenav) {
             $scope.openLeftMenu = function() {
               $mdSidenav('left').toggle();
             };
			 $scope.openRightMenu = function() {
               $mdSidenav('right').toggle();
             };
         }

setInterval(callWebservice,timeOut);               //Refresh Interval of 1 min= 60 * 1000 millisec	
