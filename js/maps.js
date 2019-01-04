/*
This app finds the seat available in a vanpool along a 
specific destination A to B using zipcode
It will display the vanpool that departs from within the mile radius specify
for the starting zipcode and drops within 5 miles of destination.  
*/
const apiKey = 'AIzaSyATl-3N3h7mUkVWl0cF3XKaIqVFnQxUgBE' 
const mapboxpk = 'pk.eyJ1IjoiY3NpbnRlcmFjdGl2ZSIsImEiOiI0ZTc1NTBkNjJlMjU2OWFlOTNkNWM4MjU2ZDAxYzgwZCJ9.ljlOBTWARgcZv2uOnzOF3w'
const tableId = '16UtOlaEvRW14T0VYuWbyl6OMzuweGKYjCTgbzP6L' 
const noticeText = 'Only the one-way trip <i>to</i> work is shown. Contact the vanpool for details about the trip home. '+ 
				   'Pick-Up locations are the places that passengers <i>board</i> the vanpool on their way to work. Drop-Off Locations '+
				   'are the places that passengers <i>exit</i> the vehicle on their way to begin their work day. Data updated Monthly'
const noVans = "Currently there are no matching vanpools. Try increasing your radius, call 213.922.7003 for assistance, "+
				"or <a href='http://www.metro.net/riding/vanpool/metro-vanpool-information-form/' target='_blank'>complete this short form</a> and we will contact you"
var resultsTxt = 'Found %d trips | Click on Metro ID for contact information'
var pickup = { //geojson for trips
  "type": "FeatureCollection",
  "features": []
}
var pointA = { //geojson for start point
  "type": "FeatureCollection",
  "features": []
}
var pointB = {//getjson for end point
  "type": "FeatureCollection",
  "features": []
}
var dest = {//getjson for end point
  "type": "FeatureCollection",
  "features": []
}
//init mapbox
mapboxgl.accessToken = mapboxpk
var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/streets-v9',
	center: [-118.2437, 34.0522],
	zoom: 7
});
map.addControl(new mapboxgl.NavigationControl());
$(document).ready(function() {
	//once the map is load do the following
	$('.custom-navbar-right').hide();
    map.on('load', function(e) {
    	$("#match").hide();// hide the results element
		$('#submit').on('click', function(){
			//get value input values
			var origin = $('#home').val()
			var destination = $('#work').val()
		    var radius= $("select.rad").change(function(){
		      $("select.rad option:selected").val();
		    });
		    resetDom();
		    reset('dest-point','dest-pt', dest)
			reset('locations','dat', pickup)
			reset('start-loc','start-point', pointA)
			reset('start-locB', 'start-pointB', pointB)
			pointA.features=[]
			pointB.features=[]
			pickup.features=[]
			dest.features=[]
		    //validate the input values.
		  	if(validation(origin, destination, radius[0].value)){
		  		axios.all([latLong(origin),latLong(destination)])
		  		.then(axios.spread(function(startCoord, endCoord){
					  var startA = startCoord.data.features[0]
					  var endB = endCoord.data.features[0]
					  if(validateZipcode(startA) && validateZipcode(endB)) {
						var featA = {
							"type": "Feature",
							"geometry": {
								"type": "Point",
								"coordinates": [startA.center[0], startA.center[1]]
							}
						}
						var featB = {
							"type": "Feature",
							"geometry": {
								"type": "Point",
								"coordinates": [endB.center[0], endB.center[1]]
							}
						}
						pointA.features.push(featA)
						pointB.features.push(featB)
						getQuery(startA.center[1], startA.center[0], radius[0].value*1609.344) // radius is converted from miles to meters
						.then(items=>{
							var html = ""
							var feat =  ''
							var b = ''
							var pointSet=[]
							var pointDest=[]
							var counter =1;
							$('#match tbody').empty();
							if(Object.getOwnPropertyNames(items).includes('rows')){
								items.rows.forEach((dat, index)=>{
									var distance = turf.distance([endB.center[0], endB.center[1]],
											[dat[11], dat[10]], {units:'miles'})
									if(distance<=10.00){ //drop within 5 miles	
										feat =  {
												"type": "Feature",
												"geometry": {
													"type": "Point",
													"coordinates": [dat[9],dat[8]]
												},
												"properties":{
														"title": "Pick-Up",
														"participant": dat[3]+" "+dat[2].substring(0,1),
														"phone": dat[4],
														"metro_id": dat[0]
												}
											}
										b = {
												"type": "Feature",
												"geometry": {
													"type": "Point",
													"coordinates": [dat[11],dat[10]]
												},
												"properties":{
														"title": "Drop-Off",
												}
											}
										pointDest.push(b)
										pointSet.push(feat)
										html+="<tr><td>"+counter+"</td><td><a class='link' data-toggle='modal' data-target='#info' data-info='"+dat[0]+"'>"+dat[0]+
										"</a></td><td>" + dat[14] +"</td><td>"+removeSecs(dat[6])+"</td><td>"+dat[15]+"</td><td>"+removeSecs(dat[7])+
										"</td><td><a class='link' data-toggle='modal' data-target='#info' data-info='"+dat[0]+"'>"+seatChecked(dat[12],dat[13])+
										"<a></td><td><a class='link mapit' href='#map'  data-target='#map' data-pick='"+JSON.stringify(feat)+"' data-drop='"+JSON.stringify(b)+
										"'data-start='"+JSON.stringify(pointA)+"'data-end='"+JSON.stringify(pointB)+"'>Map it</a></td></tr>"    		
										$('#match tbody').append(html)
										html = ""
										feat = ""
										b = ""
										counter++; 
									}
								})
								return ({pointSet, pointDest})
							}
						}).then(function(pset){
							if(pset.pointSet.length!=0){
								$("#match").show();
								$('#msg').empty().show().append(resultsTxt.replace('%d', pset.pointSet.length)).removeClass().addClass('alert alert-success')
								$('#notice').empty().show().append(noticeText).addClass('alert alert-info')
								$('#info').on('show.bs.modal', function (event) {
								  var button = $(event.relatedTarget) // Button that triggered the modal
								  var id = button.data('info') 
								  var modal = $(this)
								  pset.pointSet.forEach(function(p){
									if(p.properties.metro_id == id){
										modal.find('.modal-body #name').empty().append("Name: "+p.properties.participant)
										modal.find('.modal-body #phone').empty().append("Phone: "+p.properties.phone)
									}
								  })
								})
								$(".mapit").on('click',function(){
									pickup.features = []
									dest.features = []
									pointA.features = []
									pointB.features =[]
									var origin = $(this).data("start")
									var destination = $(this).data("end")
									pickup.features.push($(this).data("pick"))
									dest.features.push($(this).data("drop"))
									mapIt(map, origin, destination, pickup, dest)
								})
							}else {
								resetDom()	
								reset('dest-point','dest-pt', dest)
								reset('locations','dat', pickup)
								reset('start-loc','start-point', pointA)
								reset('start-locB', 'start-pointB', pointB)					
								$('#msg').empty().show().append(noVans).removeClass().addClass("alert alert-danger")
							}
							
						}).catch(function(error){
							reset('dest-point','dest-pt', dest)
							reset('locations','dat', pickup)
							reset('start-loc','start-point', pointA)
							reset('start-locB', 'start-pointB', pointB)
							resetDom()
							pickup.features = []
							dest.features = []
							pointA.features = []
							pointB.features =[]
							$('#msg').empty().show().append("Sorry, something went wrong please reload the page. 1"+error 
							+" <a class='btn btn-default' onclick='location.reload()'>Reload</a>").removeClass().addClass("alert alert-danger")
						})
					  }else {
						$('#msg').empty().show().append("Sorry, something went wrong please reload the page. Wrong Zipcode"+
							" <a class='btn btn-default' onclick='location.reload()'>Reload</a>")
							.removeClass().addClass("alert alert-danger")
					  }
		  		}))
		  		//get geocode for origin zipcode
			}  	
		})
		setTimeout(function() {
  		  $('.custom-navbar-right').show();
		}, 10000);	
	});
	
});

function mapIt(map, origin, destination, pickup, drop){
	reset('start-loc','start-point', origin)
	drawStartPoint(map,origin)
	reset('start-locB', 'start-pointB', destination)
	drawEndPoint(map,destination)
	reset('locations','dat', pickup)
	drawPoints(map, 'dat')
	reset('dest-point','dest-pt', drop)
	drawDest(map, 'dest-pt')
}

function reset(id, source, data){
	removeLayer(id,source)
	removeSource(source, data)
}
function resetDom(){
	$('#msg').empty().hide()
	$('.endMarker').remove()
	$('.objMarker ').remove()
	$('#notice').empty().hide()
	$('#reset').show()
	$('#match').hide()
}
function seatChecked(current, capacity){
	var num = current-capacity
	if(num<=0){
		return 'Call'
	} else{
		return num
	}
}
function removeSecs(time){
	var results = time.split(' ')
	var temp = results[0].split(':')
	temp = temp[0]+":"+temp[1]+" "+results[1]
	return temp 
}
function validation (origin, destination, radius){
	var regexTest = RegExp('^[0-9]*$')
	if(origin == "" && destination == ""){
  		$('#start').text('Please enter a origin zipcode').show().fadeOut(2000);
		$('#end').text('Please enter a destination zipcode').show().fadeOut(2000);
  		return false
  	} else if (destination == "") {
  		$('#end').text('Please enter a destination zipcode').show().fadeOut(2000);
  		return false
  	} else if (radius == ""){
  		$('#radius').text('Please enter a destination zipcode').show().fadeOut(2000);
  		return false
  	} else if (origin == ""){
  		$('#start').text('Please enter a origin zipcode').show().fadeOut(2000);
  		return false
  	} else if(!regexTest.test(origin)){
  		$('#start').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
  		return false	
  	} else if(origin.length !== 5){
  		$('#start').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
  		return false	
  	}else if(!regexTest.test(destination)){
  		$('#end').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
  		return false	
  	} else if(destination.length!==5){
  		$('#end').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
  		return false	
  	} else {
  		return true
  	}
}
function removeSource(id, dat){
	if(map.getSource(id)==undefined){
		map.addSource(id, { type: 'geojson', data: dat});

	}else{
		map.getSource(id).setData(dat);
	}
}
function removeLayer(id, source){
	if(map.getLayer(id) !== undefined){
		map.removeLayer(id);
		map.removeSource(source)
	}
}
function drawPoints(map,source){
	map.addLayer({
	    id: 'locations',
	    type: 'symbol',
	    // Add a GeoJSON source containing place coordinates and information.
	    source: source,
	    layout: {
	      'icon-image': 'bus-15',
	      'icon-allow-overlap': false,
	      'text-field':"{title}",
	       "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
	        "text-offset": [0, 0.2],
	        "text-anchor": "top",
	        "text-size" : 12
  	    }
    });
}
function drawDest(map, source){
	map.addLayer({
	    id: 'dest-point',
	    type: 'symbol',
	    // Add a GeoJSON source containing place coordinates and information.
	    source: source,
	    layout: {
	      'icon-image': 'bus-15',
	      'icon-allow-overlap': false,
	      'icon-anchor':'bottom',
	      'text-field':"{title}",
	       "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
	        "text-offset": [0, 0.2],
	        "text-anchor": "top",
	        "text-size" : 12
  	    }
    });
}
function drawStartPoint(map,data){
	var obj = (document.getElementsByClassName('objMarker'))
	var marker = ''
	var el =''
	if(obj.length==0){
		el = document.createElement('div')
		el.className='objMarker'
		marker = new mapboxgl.Marker(el)
		marker.setLngLat(data.features[0].geometry.coordinates)
		marker.addTo(map)
	} else {
		$('.objMarker').remove()
		el = document.createElement('div')
		el.className='objMarker'
		marker = new mapboxgl.Marker(el)
		marker.setLngLat(data.features[0].geometry.coordinates)
		marker.addTo(map)
	}
}
function drawEndPoint(map,data){
	var obj = (document.getElementsByClassName('endMarker'))
	var marker = ''
	var el =''
	if(obj.length==0){
		el = document.createElement('div')
		el.className='endMarker'
		marker = new mapboxgl.Marker(el)
		marker.setLngLat(data.features[0].geometry.coordinates)
		marker.addTo(map)
	} else {
		$('.endMarker').remove()
		el = document.createElement('div')
		el.className='endMarker'
		marker = new mapboxgl.Marker(el)
		marker.setLngLat(data.features[0].geometry.coordinates)
		marker.addTo(map)
	}
}
function latLong(num){
	var url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" + num + ".json?access_token=" + mapboxpk +"&country=us&limit=2"
	var results = ''
	return axios.get(url)
}
function getQ(lat, lon, rad){
	var query = "SELECT * FROM " + tableId + "{ WHERE ST_INTERSECTS(PickUpLocation1, CIRCLE(LATLNG("+lat+", "+lon+"), "+rad+"))}"
    var encodedQ=encodeURIComponent(query)
    var url = "https://www.googleapis.com/fusiontables/v2/query?sql="+encodedQ+"&key="+apiKey
    return axios.get(url)
}
function validateZipcode(dat) {
	if(dat!==undefined){
		if(dat.place_type=="postcode" && dat.context[1].text == "California"){
			return true
		}else{
			return false
		}
	} else {
		return false
	}
		
}


function getQuery(lat, lon, rad){ 
    var query = "SELECT * FROM " + tableId + "{ WHERE ST_INTERSECTS(PickUpLocation1, CIRCLE(LATLNG("+lat+", "+lon+"), "+rad+"))}"
    var encodedQ=encodeURIComponent(query)
    var url = "https://www.googleapis.com/fusiontables/v2/query?sql="+encodedQ+"&key="+apiKey
    return new Promise( function(resolve, reject) {
		var results = ''
		axios.get(url).
		then(function(response){
			results = response.data
			resolve(results)
		})
	})
}

function haversine() {
    var radians = Array.prototype.map.call(arguments, function(deg) { return deg/180.0 * Math.PI; });
    var lat1 = radians[0], lon1 = radians[1], lat2 = radians[2], lon2 = radians[3];
    var R = 6371; // km
    var dLat = lat2 - lat1;
    var dLon = lon2 - lon1;
    var a = Math.sin(dLat / 2) * Math.sin(dLat /2) + Math.sin(dLon / 2) * Math.sin(dLon /2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}