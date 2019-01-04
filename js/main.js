/*
This app finds a seat available in a vanpool following a 
specific destination A to B using zipcodes
It will display the vanpool that departs from within 5, 10, 15, 20 mile radius specify by
a starting zipcode and drops within 5 miles radius of destination zipcode
*Noted that its only for one trip Home to Work place.
*/
const apiKey = config.API_KEY  // google api key
const mapboxpk = config.MAPBOX_KEY 
const sheetId = config.SHEET_ID  //google spread sheet ID
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
  map.on('load', function(e) {
    $("#match").hide();// hide the results element
    $('#submit').on('click', function(e){
      e.preventDefault();
      var $btn = $(this).button('loading')
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
      if(validation(origin, destination, radius.val())){
        axios.all([latLong(origin),latLong(destination),getSheetInfo()])
				.then(axios.spread(function(startCoord, endCoord, sheetInfo){
					var startA = startCoord.data.features[0]
					var endB = endCoord.data.features[0]
					if(validateZipcode(startA) && validateZipcode(endB)){
						var sheetData = getSheetData(sheetInfo.data.sheets[0].properties.title); //vanpool data from google sheets
						var startPolygon = makePolygon(startA.center, radius.val()) // home or pick up polygon
            var endPolygon = makePolygon(endB.center, 5) // destination polygon notice radius of 5 miles since we want drop offs located withing 5 miles radius
						sheetData.then(response => {
              var rows = response.data.values.slice(1,response.data.values.length)
							var points = [];
							var partialResults = []
              var finalResults = []
              var destPts = []
              // adding all the pts from google sheet
              rows.forEach(row =>{
                points.push([row[9],row[8]])
              })
              var originPts = turf.points(points) // convert to Geojson
              var resultPts = turf.pointsWithinPolygon(originPts, startPolygon) // find points within pickup polygon
            	//using the pts within the pickup polygon find the destination coords					
              rows.forEach(row => {
                resultPts.features.forEach(rpts =>{
                  if(row[9]===turf.getCoord(rpts)[0] && row[8]===turf.getCoord(rpts)[1]) {
										destPts.push([row[11],row[10]])
                    partialResults.push(row)
                  }
                })
							})
              var dest = turf.points(destPts)
              var endPoints = turf.pointsWithinPolygon(dest, endPolygon) // find points within drop off polygon using the pick up polygon results.
							// filtering the pts that are within both polygons.
							partialResults.forEach(row => {
								endPoints.features.forEach(endp => {
									if(row[11]===turf.getCoord(endp)[0] && row[10]===turf.getCoord(endp)[1]) {
										finalResults.push(row)
                  }
                })
              })
              $btn.button('reset')
              return _.uniq(finalResults) // return a list with no duplicates
						})
						.then(results => {
							var html = ''
							$("#match").show();
							$('#match tbody').empty();
							if(results.length !== 0) {
								$('#msg').empty().show().append(resultsTxt.replace('%d', results.length)).removeClass().addClass('alert alert-success')
								$('#notice').empty().show().append(noticeText).addClass('alert alert-info')
								var counter = 1;
								results.forEach((item) =>{
									var pickup = turf.point([item[9], item[8]])
									var dropoff = turf.point([item[11], item[10]])
									var info = {
										id: item[0],
										name: item[2],
										last_name: item[3].substring(0,1),
										phone: item[4]
									}
									html+="<tr><td>"+counter+
												"</td><td><a class='link'  data-toggle='modal' data-target='#info' data-info='"+JSON.stringify(info)+"'>"+item[0]+
												"</a></td><td>" + item[14] +"</td><td>"+removeSecs(item[6])+"</td><td>"+item[15]+"</td><td>"+removeSecs(item[7])+
									"</td><td><a class='link ' data-toggle='modal' data-target='#info' data-info='"+JSON.stringify(info)+"'>"+seatChecked(item[12],item[13])+
									"<a></td><td>"+
									"<a class='link mapit' href='#map'  data-target='#map' data-pick='"+JSON.stringify(pickup)+"' data-drop='"+JSON.stringify(dropoff)+
										"'data-start='"+JSON.stringify(turf.points([startA.center]))+"'data-end='"+JSON.stringify(turf.points([endB.center]))+"'>Map it</a></td></tr>"    		
									$('#match tbody').append(html)
									html= '';
									counter++;
								})
								//Modal dialog with vanpool contact info
								$('#info').on('show.bs.modal', function (event) {
									var button = $(event.relatedTarget) // Button that triggered the modal
								  var info = button.data('info') 
									var modal = $(this)
									modal.find('.modal-body #name').empty().append("Name: "+ `${info.name} ${info.last_name}.`)
									modal.find('.modal-body #phone').empty().append("Phone: "+info.phone)
								})
								//maps the result pick up and drop off location
								$(".mapit").on('click',function(e){
									pickup.features = []
									dest.features = []
									var origin = $(this).data("start")
									var destination = $(this).data("end")
									pickup.features.push($(this).data("pick"))
									pickup.features[0].properties = {
										title: "Pick up"
									}
									dest.features.push($(this).data("drop"))
									dest.features[0].properties = {
										title: 'Drop off'
									}
									mapIt(map, origin, destination, pickup, dest)
								})
								
							} else {
								resetDom()
								reset('dest-point','dest-pt', dest)
								reset('locations','dat', pickup)
								reset('start-loc','start-point', pointA)
                reset('start-locB', 'start-pointB', pointB)	
                $('#submit').button('reset')
								$('#msg').empty().show().append(noVans).removeClass().addClass("alert alert-danger")
							}
						}).catch(error => {
							reset('dest-point','dest-pt', dest)
							reset('locations','dat', pickup)
							reset('start-loc','start-point', pointA)
							reset('start-locB', 'start-pointB', pointB)
							resetDom()
							pickup.features = []
							dest.features = []
							pointA.features = []
              pointB.features =[]
              $('#submit').button('reset')
							$('#msg').empty().show().append("Sorry, something went wrong please reload the page. 1"+error 
							+" <a class='btn btn-default' onclick='location.reload()'>Reload</a>").removeClass().addClass("alert alert-danger")
						})
					} else {
            $('#submit').button('reset')
						$('#msg').empty().show().append("Sorry, something went wrong please reload the page. Wrong Zipcode"+
							" <a class='btn btn-default' onclick='location.reload()'>Reload</a>")
							.removeClass().addClass("alert alert-danger")
					}
				}))
      }
		}) // end of submit
  }) // end of map load
}) // end of document ready


//makes polygons to find intersection of locations within a radius
function makePolygon(center, radius){
  var center = center;
  var radius = radius;
  var options = {steps: 10, units: 'miles', properties: {foo: 'bar'}};
  var circle = turf.circle(center, radius, options);
  return circle
}

//retrives general information about sheet
function getSheetInfo(){
  var url = 'https://sheets.googleapis.com/v4/spreadsheets/'+sheetId+'?&key='+apiKey
  return axios.get(url)
}

//retrieves information from google sheet
function getSheetData(title){
  var link = 'https://sheets.googleapis.com/v4/spreadsheets/'+sheetId+'/values/'+title+'?&key='+apiKey
  return axios.get(link)
}

//draw results to map 
function mapIt(map, origin, destination, pickup, drop){
	$('#map').scroll()
	reset('start-loc','start-point', origin)
	drawStartPoint(map,origin)
	reset('start-locB', 'start-pointB', destination)
	drawEndPoint(map,destination)
	reset('locations','dat', pickup)
	drawPoints(map, 'dat')
	reset('dest-point','dest-pt', drop)
	drawDest(map, 'dest-pt')
}

//reset map layers and source
function reset(id, source, data){
	removeLayer(id,source)
	removeSource(source, data)
}

//resets DOM
function resetDom(){
	$('#msg').empty().hide()
	$('.endMarker').remove()
	$('.objMarker ').remove()
	$('#notice').empty().hide()
	$('#reset').show()
	$('#match').hide()
}

//checks how many seats are open
function seatChecked(current, capacity){
	var num = current-capacity
	if(num<=0){
		return 'Call'
	} else{
		return num
	}
}
//removes secs from pickup and drop off tiems
function removeSecs(time){
	var results = time.split(' ')
	var temp = results[0].split(':')
	temp = temp[0]+":"+temp[1]+" "+results[1]
	return temp 
}

//validates zipcodes
function validation (origin, destination, radius){
	var regexTest = RegExp('^[0-9]*$')
	if(origin == "" && destination == ""){
  		$('#start').text('Please enter a origin zipcode').show().fadeOut(2000);
    $('#end').text('Please enter a destination zipcode').show().fadeOut(2000);
    $('#submit').button('reset')
  		return false
  	} else if (destination == "") {
      $('#end').text('Please enter a destination zipcode').show().fadeOut(2000);
      $('#submit').button('reset')
  		return false
  	} else if (radius == ""){
      $('#radius').text('Please enter a destination zipcode').show().fadeOut(2000);
      $('#submit').button('reset')
  		return false
  	} else if (origin == ""){
      $('#start').text('Please enter a origin zipcode').show().fadeOut(2000);
      $('#submit').button('reset')
  		return false
  	} else if(!regexTest.test(origin)){
      $('#start').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
      $('#submit').button('reset')
  		return false	
  	} else if(origin.length !== 5){
      $('#start').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
      $('#submit').button('reset')
  		return false	
  	}else if(!regexTest.test(destination)){
      $('#end').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
      $('#submit').button('reset')
  		return false	
  	} else if(destination.length!==5){
      $('#end').text('Please enter a correct 5-digit zipcode').show().fadeOut(2000);
      $('#submit').button('reset')
  		return false	
  	} else {
  		return true
  	}
}
//clean ups map source
function removeSource(id, dat){
	if(map.getSource(id)==undefined){
		map.addSource(id, { type: 'geojson', data: dat});
	}else{
		map.getSource(id).setData(dat);
	}
}

//clean ups map layer
function removeLayer(id, source){
	if(map.getLayer(id) !== undefined){
		map.removeLayer(id);
		map.removeSource(source)
	}
}
//draw start or pick up location
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
// draw destination or drop off location 
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

//draws home, origin or pick up marker 
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

//draw drop off marker
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

/*
	Finds the center of the zipcode in latitude and longitude
	using mapbox geocode service
	param zipcode
	return a promise with the geocode information
*/
function latLong(num){
	var url = "https://api.mapbox.com/geocoding/v5/mapbox.places/" + num + ".json?access_token=" + mapboxpk +"&country=us&limit=2"
	return axios.get(url)
}

/*
Validates if Zipcode entered belongs only to california
@param zipcode value
@returns true if zipcode is from california else false.
*/
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
